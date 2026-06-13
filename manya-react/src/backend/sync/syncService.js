/**
 * MANYA SYNC SERVICE  (Backend Layer — Cloud ↔ Local Bridge)
 * ============================================================
 * Handles all push/pull operations between the web app and persistent storage.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — SYNC STRATEGY                                          │
 * │                                                                              │
 * │  All methods in this file call storageFacade.put/get/patch/delete.          │
 * │  On Android, storageFacade routes those calls to window.ManyaBackend.db.*  │
 * │  which hits the on-device SQLite.                                           │
 * │                                                                              │
 * │  The sync flow for Android:                                                  │
 * │                                                                              │
 * │  WRITE PATH (Offline-First):                                                │
 * │    1. App writes data → storageFacade → SQLite (immediate, local)           │
 * │    2. Background Android WorkManager checks network                         │
 * │    3. When online: reads sync_logs table (the outbox)                       │
 * │    4. Replays each queued write to Supabase                                 │
 * │    5. Marks sync_log entry as synced=1                                      │
 * │                                                                              │
 * │  READ PATH (Local-First):                                                   │
 * │    1. App reads from SQLite first (instant response)                        │
 * │    2. Background: fetch from Supabase if stale/first-boot                  │
 * │    3. Update SQLite with fresh data                                         │
 * │                                                                              │
 * │  TABLES WRITTEN (Cloud Supabase → also replicated to SQLite):              │
 * │    profiles, user_answers, user_balances, user_transactions,               │
 * │    user_sessions, emotional_metrics, user_vault, badges,                   │
 * │    user_chests, quest_progress, concept_mastery, concept_error_tracking    │
 * │                                                                              │
 * │  TABLES READ FROM CLOUD → SEEDED INTO SQLite on first login:               │
 * │    profiles, quest_progress, user_vault, user_balances,                    │
 * │    badges, concept_mastery, user_chests                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import { supabase } from '../remote/supabaseClient.js';
import { storageFacade } from '../storage/storageFacade.js';
import { authService } from '../auth/authService.js';

// ── Sequential queue prevents Auth Lock collisions ────────────────────────────
class DatabaseQueue {
    constructor() { this.queue = []; this.processing = false; this.maxRetries = 2; }

    async execute(operation, context = '') {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject, context, retries: 0 });
            if (!this.processing) this.processQueue();
        });
    }

    async processQueue() {
        if (this.queue.length === 0) { this.processing = false; return; }
        this.processing = true;
        const item = this.queue.shift();
        try {
            const result = await item.operation();
            item.resolve(result);
        } catch (error) {
            if (error?.message?.includes('Lock') && item.retries < this.maxRetries) {
                item.retries++;
                this.queue.unshift(item);
                await new Promise(r => setTimeout(r, 1000 * item.retries));
            } else {
                console.error(`❌ [Queue] Error in ${item.context}:`, error.message);
                item.reject(error);
            }
        }
        setTimeout(() => this.processQueue(), 100);
    }
}
const syncQueue = new DatabaseQueue();

// ─────────────────────────────────────────────────────────────────────────────
export const syncService = {

    _userIdCache: null,
    _activeUserIdRequest: null,

    // ── AUTH ──────────────────────────────────────────────────────────────────
    async getUserId()  { return authService.getUserId(); },
    async signUp(email, password, metadata = {}) { return authService.signUp(email, password, metadata); },
    async signIn(email, password)                { return authService.signIn(email, password); },
    async signOut()                              { return authService.signOut(); },
    async resetPassword(email)                   { return authService.resetPassword(email); },
    async updatePassword(newPassword)            { return authService.updatePassword(newPassword); },

    // ── PROFILE ───────────────────────────────────────────────────────────────
    /**
     * Pull user profile from cloud (Supabase) → used on login or re-hydration.
     * Android: reads from SQLite profiles table if available, else fetches from Supabase.
     */
    async pullProfile() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try {
            return await storageFacade.get(`db:/profiles/${uid}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Profile fetch failed for ${uid}:`, error.message);
            return null;
        }
    },

    /**
     * Push local profile changes to cloud (write to Supabase + local SQLite).
     * On Android: writes to SQLite immediately, queues for Supabase sync.
     */
    async uploadProfile(profileData, explicitUid = null) {
        return syncQueue.execute(async () => {
            const uid = explicitUid || await this.getUserId();
            if (!uid) return;
            const payload = {
                id: uid,
                full_name: profileData.nickname || profileData.full_name,
                avatar_url: profileData.avatarUrl || profileData.avatar_url,
                grade_level: profileData.gradeLevel || profileData.grade_level,
                is_pro: profileData.is_pro || false,
                current_streak: profileData.current_streak || 0,
                longest_streak: profileData.longest_streak || 0,
                last_active_at: new Date().toISOString(),
                preferences: profileData.preferences || {},
                parent_name: profileData.parent_name || null,
                parent_whatsapp: profileData.parent_whatsapp || null,
                // NOTE: parent_pin_hash is intentionally excluded here.
                // It is only ever set by the set_parent_pin RPC (bcrypt via crypt()).
                // Including it here would overwrite the real bcrypt hash with a stale value.
                report_enabled: profileData.report_enabled !== undefined ? profileData.report_enabled : true,
                onboarded: profileData.onboarded || false
            };
            await storageFacade.put('db:/profiles', payload);
            console.log('☁️ [Sync] Profile synced.');
        }, 'uploadProfile');
    },

    // ── ANSWERS / TELEMETRY ───────────────────────────────────────────────────
    /**
     * Record a student's answer.
     * Android: insert into local "user_answers" SQLite table immediately.
     * Background sync: replicate to Supabase when online.
     *
     * Fields: questionId, isCorrect, selectedAnswer, correctAnswer, timeSpentMs,
     *         hintUsed, confidenceRating, hesitationCount, frustrationLevel,
     *         answerChanged, timeToFirstClick, pointsEarned, tabSwitched,
     *         idleTimeMs, frustrationClicks, questId, pool, engine_type
     */
    async pushAnswer(subject, answer) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const now = new Date();
            const hour = now.getHours();
            const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
            const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];

            const payload = {
                id: answer.id || crypto.randomUUID(),
                user_id: uid,
                question_id: answer.questionId,
                is_correct: answer.isCorrect,
                selected_answer: String(answer.selectedAnswer || ''),
                correct_answer: String(answer.correctAnswer || ''),
                time_spent_ms: answer.timeSpentMs,
                hint_used: answer.hintUsed || false,
                confidence_rating: answer.confidenceRating || 0,
                hesitation_count: answer.hesitationCount || 0,
                frustration_level: answer.frustrationLevel || 0,
                answer_changed: answer.answerChanged || false,
                time_to_first_click_ms: answer.timeToFirstClick || 0,
                points_earned: answer.pointsEarned || 0,
                tab_switched: answer.tabSwitched || false,
                idle_time_ms: answer.idleTimeMs || 0,
                frustration_clicks: answer.frustrationClicks || 0,
                time_of_day: timeOfDay,
                day_of_week: dayOfWeek,
                answered_at: now.toISOString(),
                synced: true
            };
            await storageFacade.put('db:/user_answers', payload);
            console.log(`✅ [Sync] Answer saved.`);
        }, 'pushAnswer');
    },

    async fetchRecentTelemetry(subject = null, limit = 10) {
        const uid = await this.getUserId();
        if (!uid || uid === 'null') return [];
        try {
            return await storageFacade.get(`db:/user_answers?uid=${uid}&order=answered_at:desc&limit=${limit}`);
        } catch (error) {
            console.warn('[Sync] Telemetry fetch failed:', error.message);
            return [];
        }
    },

    // ── EMOTION / PSYCH ───────────────────────────────────────────────────────
    async pushEmotion(payload) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const record = {
                user_id: uid,
                emotion: payload.emotion,
                intensity: payload.intensity,
                context: payload.context,
                recorded_at: new Date().toISOString()
            };
            await storageFacade.put('db:/emotional_metrics', record);
        }, 'pushEmotion');
    },

    async pushEmotionalMetrics(sessionId, metrics) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            try {
                const record = {
                    user_id: uid,
                    session_id: sessionId,
                    emotion: (metrics.frustrationLevel || 0) > 50 ? 'frustrated' : 'focused',
                    intensity: Math.round(metrics.frustrationLevel || 0),
                    context: metrics.context || 'quest_session',
                    recorded_at: new Date().toISOString()
                };
                await storageFacade.put('db:/emotional_metrics', record);
            } catch (e) {
                console.warn('[Sync] Emotional telemetry failed:', e.message);
            }
        }, 'pushEmotionalMetrics');
    },

    // ── ECONOMY (Coins & Gems) ─────────────────────────────────────────────────
    /**
     * Fetch the user's current currency balances.
     * Android: read from local user_balances SQLite table.
     * Schema: { user_id, coins, gem_overall, gem_math, gem_science, gem_english, gem_sst, updated_at }
     */
    async fetchUserBalance() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null') return null;
        try {
            return await storageFacade.get(`db:/user_balances?uid=${uid}&single=maybe`);
        } catch (error) {
            console.warn('[Sync] Balance fetch failed:', error.message);
            return null;
        }
    },

    /**
     * Update a currency balance and log the transaction.
     * Android: update user_balances and insert into user_transactions in SQLite.
     * These will be synced to Supabase when the device is online.
     *
     * @param {string} currency  - 'coins' | 'gem_math' | 'gem_science' | 'gem_english' | 'gem_sst' | 'gem_overall'
     * @param {number} amountChange - positive = earn, negative = spend
     * @param {string} transactionType - 'QUEST_REWARD' | 'CHEST_REWARD' | 'CHALLENGE_REWARD' | 'PURCHASE'
     * @param {string|null} contextId - quest key or chest id that triggered this
     */
    async updateBalance(currency, amountChange, transactionType, contextId = null) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const cleanCurrency = currency.toLowerCase();
            try {
                // 1. Log transaction
                await storageFacade.put('db:/user_transactions', {
                    user_id: uid, currency, amount_change: amountChange,
                    transaction_type: transactionType, context_id: contextId,
                    created_at: new Date().toISOString()
                });
                // 2. Update balance
                const current = await storageFacade.get(`db:/user_balances?uid=${uid}&single=maybe`);
                const newBalance = (current?.[cleanCurrency] || 0) + amountChange;
                await storageFacade.put('db:/user_balances', {
                    user_id: uid, [cleanCurrency]: newBalance, updated_at: new Date().toISOString()
                });
                console.log(`💰 [Sync] Balance: ${currency} ${amountChange > 0 ? '+' : ''}${amountChange}`);
                return newBalance;
            } catch (e) {
                console.error('❌ [Sync] Economy update failed:', e.message);
                throw e;
            }
        }, 'updateBalance');
    },

    // ── CONCEPT ERROR TRACKING ────────────────────────────────────────────────
    async trackConceptError(subtopic, questionId) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            try {
                const existing = await storageFacade.get(`db:/concept_error_tracking?uid=${uid}&subtopic=${subtopic}&single=maybe`);
                if (existing) {
                    await storageFacade.patch(`db:/concept_error_tracking/${existing.id}`, {
                        error_count: (existing.error_count || 0) + 1,
                        last_question_id: questionId,
                        updated_at: new Date().toISOString()
                    });
                } else {
                    await storageFacade.put('db:/concept_error_tracking', {
                        user_id: uid, subtopic, error_count: 1,
                        last_question_id: questionId, updated_at: new Date().toISOString()
                    });
                }
            } catch (e) {
                console.warn('[Sync] Concept error tracking failed:', e.message);
            }
        }, 'trackConceptError');
    },

    // ── VAULT ─────────────────────────────────────────────────────────────────
    async resolveVaultMetadata(idOrQid, subject) {
        if (!idOrQid) return null;
        const qid = idOrQid.includes('/') ? idOrQid.split('/').pop() : idOrQid;
        const cleanSubject = (subject || 'general').toLowerCase().trim();
        const tablesToTry = [];
        
        if (cleanSubject === 'english') {
            tablesToTry.push('manya_vault_english', 'manya_vault');
        } else if (cleanSubject === 'science') {
            tablesToTry.push('manya_vault_science', 'manya_vault');
        } else if (cleanSubject === 'math' || cleanSubject === 'mathematics') {
            tablesToTry.push('manya_vault_math', 'manya_vault');
        } else if (cleanSubject === 'sst' || cleanSubject === 'social_studies') {
            tablesToTry.push('manya_vault_sst', 'manya_vault');
        } else {
            tablesToTry.push('manya_vault');
        }
        
        for (const table of tablesToTry) {
            try {
                const records = await storageFacade.get(`db:/${table}?or=qid.eq.${qid},subtopic.eq.${qid},quest_id.eq.${qid}`);
                if (records && records.length > 0) {
                    const record = records.find(r => r.item_type && ['simulation', 'study', '3d', 'gallery', 'hotspots'].includes(r.item_type.toLowerCase())) || records[0];
                    return {
                        engine_type: record.engine_type,
                        cdn_url: record.cdn_url,
                        item_type: record.item_type,
                        title: record.question_text || record.topic || null
                    };
                }
            } catch (e) {
                // Ignore and try next
            }
        }
        return null;
    },

    /**
     * Save a discovered content artifact to the vault.
     * Android: insert into user_vault SQLite table.
     * Smart key format: "[TYPE]|[TITLE]|[PATH]"  e.g. "NOTE|Algebra Intro|content/math/algebra/story.html"
     */
    async pushToVault({ id, title, type, subject, path, engine_type, cdn_url }) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const uniquePath = path || id;
            const smartKey = `${type.toUpperCase()}|${title}|${uniquePath}`;
            
            let resolvedEngineType = engine_type;
            let resolvedCdnUrl = cdn_url;
            let resolvedTitle = title;
            let resolvedType = type;

            if (!resolvedEngineType || !resolvedCdnUrl) {
                const dbMeta = await this.resolveVaultMetadata(uniquePath, subject);
                if (dbMeta) {
                    if (dbMeta.engine_type) resolvedEngineType = dbMeta.engine_type;
                    if (dbMeta.cdn_url) resolvedCdnUrl = dbMeta.cdn_url;
                    if (dbMeta.item_type) resolvedType = dbMeta.item_type;
                    if (dbMeta.title && (!resolvedTitle || resolvedTitle === 'Study Note' || resolvedTitle === 'Interactive Study')) {
                        resolvedTitle = dbMeta.title;
                    }
                }
            }

            // If still not resolved, infer type and engine_type from the path filename
            if (resolvedType === 'NOTE' || resolvedType === 'SIM' || !resolvedEngineType) {
                const pathLower = uniquePath.toLowerCase();
                if (pathLower.includes('recap')) {
                    resolvedType = 'recap';
                    resolvedEngineType = resolvedEngineType || 'READER_STUDY';
                } else if (pathLower.includes('3d')) {
                    resolvedType = '3d';
                    resolvedEngineType = resolvedEngineType || '3D_SKELETON';
                } else if (pathLower.includes('gallery')) {
                    resolvedType = 'gallery';
                    resolvedEngineType = resolvedEngineType || 'GALLERY_STUDY';
                } else if (pathLower.includes('hotspots')) {
                    resolvedType = 'hotspots';
                    resolvedEngineType = resolvedEngineType || 'IMAGE_HOTSPOTS';
                } else if (pathLower.includes('globe')) {
                    resolvedType = 'universal_globe';
                    resolvedEngineType = resolvedEngineType || 'UNIVERSAL_GLOBE';
                } else if (pathLower.includes('sim') || pathLower.includes('simulation')) {
                    resolvedType = 'simulation';
                    resolvedEngineType = resolvedEngineType || 'NOTE_EXPLORER';
                }
            }

            const defaultEngineMap = {
                '3d': '3D_SKELETON',
                'gallery': 'GALLERY_STUDY',
                'hotspots': 'IMAGE_HOTSPOTS',
                'recap': 'READER_STUDY',
                'study_sim': 'NOTE_EXPLORER',
                'universal_globe': 'UNIVERSAL_GLOBE',
                'globe': 'UNIVERSAL_GLOBE',
                'note': 'NOTE_EXPLORER',
                'sim': 'NOTE_EXPLORER',
                'simulation': 'NOTE_EXPLORER',
                'study': 'NOTE_EXPLORER'
            };
            const typeKey = String(resolvedType || type || 'NOTE').toLowerCase().trim();
            resolvedEngineType = resolvedEngineType || defaultEngineMap[typeKey] || 'NOTE_EXPLORER';
            resolvedCdnUrl = resolvedCdnUrl || uniquePath;

            // Clean CDN url to relative path starting with /content/
            if (resolvedCdnUrl && typeof resolvedCdnUrl === 'string') {
                const contentIdx = resolvedCdnUrl.indexOf('content/');
                if (contentIdx !== -1) {
                    resolvedCdnUrl = '/' + resolvedCdnUrl.substring(contentIdx);
                }
            }

            const payload = { 
                user_id: uid, 
                artifact_id: smartKey, 
                subject,
                title: resolvedTitle,
                item_type: resolvedType,
                engine_type: resolvedEngineType,
                cdn_url: resolvedCdnUrl
            };
            
            // Check if this path already exists
            const vaultRows = await storageFacade.get(`db:/user_vault?uid=${uid}`);
            if (vaultRows) {
                 const exists = vaultRows.some(r => {
                      if (r.artifact_id && r.artifact_id.includes('|')) {
                           const parts = r.artifact_id.split('|');
                           return parts.length > 2 && parts[2] === uniquePath;
                      }
                      return r.artifact_id === uniquePath;
                 });
                 if (exists) {
                      console.log(`🏺 [Vault] Asset "${uniquePath}" already in Vault. Skipping.`);
                      return;
                 }
            }
            
            await storageFacade.put('db:/user_vault', payload);
            console.log(`☁️ [Vault] Saved: ${resolvedTitle} (${resolvedType})`);
        }, 'pushToVault');
    },

    async recordContentUnlock(contentId, title = 'Study Note', subject = 'general') {
        if (!contentId) return;
        const parts = contentId.split('/');
        const lastPart = parts[parts.length - 1].toUpperCase();
        const standardNodes = ['WARMUP', 'EXPLORE', 'EXERCISE', 'PRACTICE', 'REINFORCE', 'MASTERY'];
        if (standardNodes.includes(lastPart)) {
            console.log(`🏺 [Vault] Skipping recordContentUnlock for standard node type: ${lastPart}`);
            return;
        }
        return this.pushToVault({ id: contentId, title, type: 'NOTE', subject });
    },
    async recordSimulationUnlock(simId, subject = 'math', title = 'Interactive Study') {
        return this.pushToVault({ id: simId, title, type: 'SIM', subject });
    },

    async pushVault(artifactId, subject, meta = {}) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            let type = meta.type || 'NOTE';
            let title = meta.title || 'Study Note';
            let path = meta.path || artifactId;

            if (artifactId.includes('|')) {
                const parts = artifactId.split('|');
                type = parts[0];
                title = parts[1];
                path = parts[2];
            }

            let resolvedEngineType = meta.engine_type;
            let resolvedCdnUrl = meta.cdn_url;

            if (!resolvedEngineType || !resolvedCdnUrl) {
                const dbMeta = await this.resolveVaultMetadata(path, subject);
                if (dbMeta) {
                    if (dbMeta.engine_type) resolvedEngineType = dbMeta.engine_type;
                    if (dbMeta.cdn_url) resolvedCdnUrl = dbMeta.cdn_url;
                    if (dbMeta.item_type) type = dbMeta.item_type;
                    if (dbMeta.title) title = dbMeta.title;
                }
            }

            // If still not resolved, infer type and engine_type from the path filename
            if (type === 'NOTE' || type === 'SIM' || !resolvedEngineType) {
                const pathLower = path.toLowerCase();
                if (pathLower.includes('recap')) {
                    type = 'recap';
                    resolvedEngineType = resolvedEngineType || 'READER_STUDY';
                } else if (pathLower.includes('3d')) {
                    type = '3d';
                    resolvedEngineType = resolvedEngineType || '3D_SKELETON';
                } else if (pathLower.includes('gallery')) {
                    type = 'gallery';
                    resolvedEngineType = resolvedEngineType || 'GALLERY_STUDY';
                } else if (pathLower.includes('hotspots')) {
                    type = 'hotspots';
                    resolvedEngineType = resolvedEngineType || 'IMAGE_HOTSPOTS';
                } else if (pathLower.includes('globe')) {
                    type = 'universal_globe';
                    resolvedEngineType = resolvedEngineType || 'UNIVERSAL_GLOBE';
                } else if (pathLower.includes('sim') || pathLower.includes('simulation')) {
                    type = 'simulation';
                    resolvedEngineType = resolvedEngineType || 'NOTE_EXPLORER';
                }
            }

            const defaultEngineMap = {
                '3d': '3D_SKELETON',
                'gallery': 'GALLERY_STUDY',
                'hotspots': 'IMAGE_HOTSPOTS',
                'recap': 'READER_STUDY',
                'study_sim': 'NOTE_EXPLORER',
                'universal_globe': 'UNIVERSAL_GLOBE',
                'globe': 'UNIVERSAL_GLOBE',
                'note': 'NOTE_EXPLORER',
                'sim': 'NOTE_EXPLORER',
                'simulation': 'NOTE_EXPLORER',
                'study': 'NOTE_EXPLORER'
            };
            const typeKey = String(type || 'NOTE').toLowerCase().trim();
            resolvedEngineType = resolvedEngineType || defaultEngineMap[typeKey] || 'NOTE_EXPLORER';
            resolvedCdnUrl = resolvedCdnUrl || path;

            // Clean CDN url to relative path starting with /content/
            if (resolvedCdnUrl && typeof resolvedCdnUrl === 'string') {
                const contentIdx = resolvedCdnUrl.indexOf('content/');
                if (contentIdx !== -1) {
                    resolvedCdnUrl = '/' + resolvedCdnUrl.substring(contentIdx);
                }
            }

            const payload = { 
                user_id: uid, 
                artifact_id: artifactId, 
                subject,
                title,
                item_type: type,
                engine_type: resolvedEngineType,
                cdn_url: resolvedCdnUrl
            };

            const existing = await storageFacade.get(`db:/user_vault?uid=${uid}&artifact_id=${artifactId}&single=maybe`);
            if (existing) return;
            await storageFacade.put('db:/user_vault', payload);
        }, 'pushVault');
    },

    async pullVault() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return [];
        try {
            const data = await storageFacade.get(`db:/user_vault?uid=${uid}`);
            return data.map(row => {
                if (row.cdn_url && row.engine_type) {
                    return {
                        id: row.id,
                        type: row.item_type || 'NOTE',
                        title: row.title || 'Untitled',
                        path: row.cdn_url,
                        engine_type: row.engine_type,
                        cdn_url: row.cdn_url,
                        subject: row.subject,
                        unlocked_at: row.unlocked_at
                    };
                }

                if (row.artifact_id && row.artifact_id.includes('|')) {
                    const [type, title, path] = row.artifact_id.split('|');
                    const cleanType = String(type).toUpperCase();
                    let inferredEngine = 'NOTE_EXPLORER';
                    if (cleanType === 'RECAP') inferredEngine = 'READER_STUDY';
                    else if (cleanType === '3D') inferredEngine = '3D_SKELETON';
                    else if (cleanType === 'GALLERY') inferredEngine = 'GALLERY_STUDY';
                    else if (cleanType === 'HOTSPOTS') inferredEngine = 'IMAGE_HOTSPOTS';
                    else if (cleanType === 'GLOBE' || cleanType === 'UNIVERSAL_GLOBE') inferredEngine = 'UNIVERSAL_GLOBE';

                    return { 
                        id: row.id, 
                        type, 
                        title, 
                        path, 
                        engine_type: inferredEngine,
                        cdn_url: path,
                        subject: row.subject, 
                        unlocked_at: row.unlocked_at 
                    };
                }

                const pathLower = String(row.artifact_id || '').toLowerCase();
                let inferredEngine = 'NOTE_EXPLORER';
                if (pathLower.includes('recap')) inferredEngine = 'READER_STUDY';
                else if (pathLower.includes('3d')) inferredEngine = '3D_SKELETON';
                else if (pathLower.includes('gallery')) inferredEngine = 'GALLERY_STUDY';
                else if (pathLower.includes('hotspots')) inferredEngine = 'IMAGE_HOTSPOTS';
                else if (pathLower.includes('globe')) inferredEngine = 'UNIVERSAL_GLOBE';

                return { 
                    id: row.id, 
                    artifactId: row.artifact_id, 
                    type: 'LEGACY', 
                    title: row.artifact_id || 'Legacy Asset', 
                    path: row.artifact_id || '', 
                    engine_type: inferredEngine,
                    cdn_url: row.artifact_id || '',
                    subject: row.subject, 
                    unlocked_at: row.unlocked_at 
                };
            });
        } catch (error) {
            console.warn(`⚠️ [Sync] Vault fetch failed:`, error.message);
            return [];
        }
    },

    async deleteVaultItem(id) {
        try {
            await storageFacade.delete(`db:/user_vault/${id}`);
            console.log(`☁️ [Sync] Vault row ${id} deleted.`);
            return true;
        } catch (error) {
            console.error(`⚠️ [Sync] Vault delete failed:`, error.message);
            return false;
        }
    },

    // ── BADGES ────────────────────────────────────────────────────────────────
    async pushBadge(badge) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            try {
                const existing = await storageFacade.get(`db:/badges?uid=${uid}&badge_type=${badge.id}&single=maybe`);
                if (existing) {
                    await storageFacade.patch(`db:/badges/${existing.id}`, {
                        earned_at: badge.earnedAt || new Date().toISOString(), badge_name: badge.name
                    });
                } else {
                    await storageFacade.put('db:/badges', {
                        user_id: uid, badge_type: badge.id, badge_name: badge.name,
                        earned_at: badge.earnedAt || new Date().toISOString()
                    });
                }
                console.log(`🏆 [Sync] Badge: ${badge.name}`);
            } catch (e) {
                console.warn(`⚠️ [Sync] Badge sync failed:`, e.message);
            }
        }, 'pushBadge');
    },

    async pullAchievements() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try { return await storageFacade.get(`db:/badges?uid=${uid}`); }
        catch (error) { console.warn(`⚠️ [Sync] Badges fetch failed:`, error.message); return null; }
    },

    // ── CHESTS ────────────────────────────────────────────────────────────────
    async pushChestDrop(chestType, rewards) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            try {
                await storageFacade.put('db:/user_chests', {
                    user_id: uid, chest_type: chestType || 'wood',
                    opened: true, opened_at: new Date().toISOString()
                });
            } catch (e) { console.warn('⚠️ [Sync] Chest sync failed:', e.message); }
        }, 'pushChestDrop');
    },

    async pullChestHistory() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try { return await storageFacade.get(`db:/user_chests?uid=${uid}`); }
        catch (error) { console.warn(`⚠️ [Sync] Chest fetch failed:`, error.message); return null; }
    },

    // ── CONCEPT MASTERY ───────────────────────────────────────────────────────
    async pushConceptMastery(subject, record) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const payload = {
                user_id: uid, subject, base_id: record.baseId, mastery_level: record.masteryLevel,
                correct_streak: record.correctStreak, total_attempts: record.totalAttempts,
                total_correct: record.totalCorrect, review_count: record.reviewCount,
                last_reviewed_at: record.lastReviewedAt, next_review_at: record.nextReviewAt,
                updated_at: new Date().toISOString()
            };
            const existing = await storageFacade.get(`db:/concept_mastery?uid=${uid}&subject=${subject}&base_id=${record.baseId}&single=maybe`);
            if (existing) {
                await storageFacade.patch(`db:/concept_mastery/${existing.id}`, payload);
            } else {
                await storageFacade.put('db:/concept_mastery', payload);
            }
        }, 'pushConceptMastery');
    },

    async pullConceptMastery(subject) {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return [];
        try { return await storageFacade.get(`db:/concept_mastery?uid=${uid}&subject=${subject}`); }
        catch (error) { console.warn(`⚠️ [Sync] Mastery fetch failed:`, error.message); return []; }
    },

    // ── QUEST PROGRESS ────────────────────────────────────────────────────────
    /**
     * Update the completion state of a quest node.
     * Android: upsert into quest_progress SQLite table.
     * Schema: { user_id, quest_key, node_type, mastery, stars, status, attempts, last_attempted_at }
     *
     * node_type values: 'WARMUP' | 'EXERCISE' | 'PRACTICE' | 'REINFORCE' | 'MASTERY' | 'EXPLORE'
     * status values:    'locked' | 'available' | 'completed'
     */
    async updateProgress(questKey, progress) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            try {
                const payload = {
                    user_id: uid, quest_key: questKey,
                    node_type: progress.nodeType || 'lesson',
                    mastery: progress.mastery || 0, stars: progress.stars || 0,
                    status: progress.status || 'completed',
                    last_attempted_at: new Date().toISOString()
                };
                const existing = await storageFacade.get(
                    `db:/quest_progress?uid=${uid}&quest_key=${questKey}&node_type=${progress.nodeType || 'lesson'}&single=maybe`
                );
                if (existing) {
                    await storageFacade.patch(`db:/quest_progress/${existing.id}`, {
                        ...payload,
                        mastery: Math.max(existing.mastery || 0, payload.mastery),
                        stars: Math.max(existing.stars || 0, payload.stars),
                        attempts: (existing.attempts || 0) + 1
                    });
                } else {
                    await storageFacade.put('db:/quest_progress', { ...payload, attempts: 1 });
                }
                console.log(`📈 [Sync] Progress: ${questKey} / ${progress.nodeType} (${progress.stars}⭐)`);
            } catch (e) {
                console.warn('⚠️ [Sync] Progress sync failed:', e.message);
            }
        }, 'updateProgress');
    },

    async pullProgress() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try { return await storageFacade.get(`db:/quest_progress?uid=${uid}`); }
        catch (error) { console.warn(`⚠️ [Sync] Progress fetch failed:`, error.message); return null; }
    },

    // ── SESSION ───────────────────────────────────────────────────────────────
    async pushSession(sessionData) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;
            const payload = {
                user_id: uid,
                session_start: typeof sessionData.startedAt === 'number'
                    ? new Date(sessionData.startedAt).toISOString() : sessionData.startedAt,
                ended_at: new Date().toISOString(),
                current_quest_id: null,
                frustration_level: sessionData.frustrationLevel || 0,
                engagement_level: sessionData.engagementLevel || 0,
                cognitive_load: sessionData.cognitiveLoad || 0,
                mastery_level: sessionData.masteryLevel || 'learning',
                quest_results: { ...sessionData.results, quest_key: sessionData.questId }
            };
            await storageFacade.put('db:/user_sessions', payload);
        }, 'pushSession');
    },

    // ── PVP QUIZ DUELS (Online Only) ──────────────────────────────────────────
    async createQuizDuel(challengedId, wager, subject, questions, currency = 'gems', message = null) {
        try {
            const { data, error } = await supabase.rpc('create_quiz_duel_escrow', {
                p_challenged_id: challengedId,
                p_wager: wager,
                p_subject: subject,
                p_questions: questions,
                p_currency: currency,
                p_message: message
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('⚔️ [Sync] Create duel failed:', e.message);
            throw e;
        }
    },

    async readyQuizDuel(duelId) {
        try {
            const { data, error } = await supabase.rpc('ready_quiz_duel', {
                p_duel_id: duelId
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('⚔️ [Sync] Ready duel failed:', e.message);
            throw e;
        }
    },

    async acceptQuizDuel(duelId) {
        try {
            const { data, error } = await supabase.rpc('accept_quiz_duel_escrow', {
                p_duel_id: duelId
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('⚔️ [Sync] Accept duel failed:', e.message);
            throw e;
        }
    },

    async declineOrExpireDuel(duelId) {
        try {
            const { data, error } = await supabase.rpc('decline_or_expire_duel', {
                p_duel_id: duelId
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('⚔️ [Sync] Decline duel failed:', e.message);
            throw e;
        }
    },

    async submitDuelParticipantResults(duelId, score, timeSpentMs, answers) {
        try {
            const uid = await this.getUserId();
            const { error } = await supabase
                .from('quiz_duel_participants')
                .update({
                    score: score,
                    time_spent_ms: timeSpentMs,
                    answers: answers,
                    completed_at: new Date().toISOString()
                })
                .eq('duel_id', duelId)
                .eq('user_id', uid);
            if (error) throw error;

            const { data: resolveData, error: resolveError } = await supabase.rpc('resolve_quiz_duel_payout', {
                p_duel_id: duelId
            });
            if (resolveError) throw resolveError;
            return resolveData;
        } catch (e) {
            console.error('⚔️ [Sync] Submit duel results failed:', e.message);
            throw e;
        }
    },

    async claimAbandonedDuel(duelId) {
        try {
            const { data: resolveData, error: resolveError } = await supabase.rpc('claim_abandoned_duel', {
                p_duel_id: duelId
            });
            if (resolveError) throw resolveError;
            return resolveData;
        } catch (e) {
            console.error('⚔️ [Sync] Claim abandoned duel failed:', e.message);
            throw e;
        }
    },

    async fetchDuelDetails(duelId) {
        try {
            const { data, error } = await supabase
                .from('quiz_duels')
                .select('*, challenger:challenger_id(full_name, avatar_url), challenged:challenged_id(full_name, avatar_url)')
                .eq('id', duelId)
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('⚔️ [Sync] Fetch duel details failed:', e.message);
            throw e;
        }
    },

    // ── RANKINGS (Online Only) ────────────────────────────────────────────────
    /**
     * Fetch global rankings.
     * Android: this requires an internet connection.
     * For offline: return empty array or show a "Leaderboard unavailable offline" message.
     */
    async pullRankings(timeframe = 'all-time', subject = 'all') {
        const uid = await this.getUserId();
        try {
            const { data, error } = await supabase.rpc('get_manya_rankings', {
                p_timeframe: timeframe,
                p_subject: subject.toLowerCase(),
                p_user_id: uid
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('🏆 [Sync] Rankings fetch failed:', error.message);
            return [];
        }
    },

    async pullLeagueCohortStandings() {
        const uid = await this.getUserId();
        if (!uid) return [];
        try {
            const { data, error } = await supabase.rpc('get_league_cohort_standings', {
                p_user_id: uid
            });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('🏆 [Sync] League standings fetch failed:', e.message);
            return [];
        }
    },

    /**
     * Increment the current user's weekly XP for the league ladder.
     * Also auto-joins them into a cohort if this is their first activity this week.
     * @param {number} amount - XP points to add (e.g. 2 per correct answer, 20 per quest, 25 per duel win)
     */
    async incrementWeeklyXp(amount = 10) {
        const uid = await this.getUserId();
        if (!uid) return;
        try {
            const { error } = await supabase.rpc('increment_weekly_xp', {
                p_user_id: uid,
                p_amount: amount
            });
            if (error) throw error;
            console.log(`⚡ [League] +${amount} weekly XP awarded`);
        } catch (e) {
            // Silent fail — league XP is non-critical
            console.warn('⚡ [League] Weekly XP increment failed (non-critical):', e.message);
        }
    },


    // ── CLOUD SEED (First Login) ──────────────────────────────────────────────
    /**
     * Pull all user data from Supabase and seed local SQLite.
     * Called once after a successful login or when local data is missing.
     * Android: implement this in the native layer using your Supabase Kotlin SDK.
     */
    async seedFromCloud() {
        const uid = await this.getUserId();
        if (!uid) return;
        console.log('🌱 [Sync] Seeding local DB from cloud...');
        try {
            await Promise.allSettled([
                this.pullProfile(),
                this.pullProgress(),
                this.pullVault(),
                this.pullAchievements(),
                this.pullChestHistory(),
                this.fetchUserBalance(),
                ...['math','science','english','sst'].map(s => this.pullConceptMastery(s))
            ]);
            console.log('✅ [Sync] Cloud seed complete. App ready for offline use.');
        } catch (e) {
            console.warn('⚠️ [Sync] Partial cloud seed failure:', e.message);
        }
    }
};

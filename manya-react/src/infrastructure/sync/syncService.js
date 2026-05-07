import { supabase } from '../remote/supabaseClient.js';
import { storageService } from '../storage/storageService.js';
import { storageFacade } from '../storage/storageFacade.js';
/**
 * MANYA DATABASE QUEUE (Ported from Manya-Logic v1.0)
 * ==================================================
 * Sequentially processes Supabase requests to prevent Auth Lock collisions.
 */
class DatabaseQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 2;
    }

    async execute(operation, context = '') {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject, context, retries: 0 });
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const item = this.queue.shift();

        try {
            const result = await item.operation();
            item.resolve(result);
        } catch (error) {
            // Match the Auth Lock error string
            if (error?.message?.includes('Lock') && item.retries < this.maxRetries) {
                console.warn(`⚠️ [Queue] Auth Lock detected, retrying ${item.context}...`);
                item.retries++;
                this.queue.unshift(item); // Put back at front
                await new Promise(r => setTimeout(r, 1000 * item.retries)); // Backoff
            } else {
                console.error(`❌ [Queue] Error in ${item.context}:`, error.message);
                item.reject(error);
            }
        }

        // Small gap between operations to let the browser breathe
        setTimeout(() => this.processQueue(), 100);
    }
}

const syncQueue = new DatabaseQueue();

/**
 * MANYA GLOBAL SYNC SERVICE (v11.5: Manya-Logic Queue Pattern)
 * ============================================================
 */
export const syncService = {
    
    _userIdCache: null,
    _activeUserIdRequest: null,

    /**
     * Auth Singleton (v10.5 Port)
     */
    async getUserId() {
        if (this._userIdCache && this._userIdCache !== 'null' && this._userIdCache !== 'undefined') {
            return this._userIdCache;
        }
        
        if (this._activeUserIdRequest) return this._activeUserIdRequest;

        this._activeUserIdRequest = (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                let uid = session?.user?.id || localStorage.getItem('manya_session_id') || null;
                
                // Sanitize: Treat "null" or "undefined" strings as actual null
                if (uid === 'null' || uid === 'undefined') uid = null;
                
                if (uid) this._userIdCache = uid;
                return uid;
            } catch(e) { 
                let uid = localStorage.getItem('manya_session_id') || null;
                if (uid === 'null' || uid === 'undefined') uid = null;
                return uid; 
            } finally {
                this._activeUserIdRequest = null;
            }
        })();

        return this._activeUserIdRequest;
    },

    /**
     * Profile Sync (Queued)
     */
    async uploadProfile(profileData) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
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
                // Economy data moved to user_balances
                preferences: profileData.preferences || {}
            };

            await storageFacade.put('db:/profiles', payload);
            console.log("☁️ [Sync] Profile & Streak Synced.");
        }, 'uploadProfile');
    },

    /**
     * Answer Sync (Queued with Behavioral Metrics)
     */
    async pushAnswer(subject, answer) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            // Manya Logic v1.0 Analytics Enrichment
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
                
                // --- Behavioral Telemetry (Schema Alignment 🛡️) ---
                confidence_rating: answer.confidenceRating || 0,
                hesitation_count: answer.hesitationCount || 0,
                frustration_level: answer.frustrationLevel || 0,
                answer_changed: answer.answerChanged || false,
                time_to_first_click_ms: answer.timeToFirstClick || 0,
                points_earned: answer.pointsEarned || 0,
                
                // New Behavioral Fields from Schema
                tab_switched: answer.tabSwitched || false,
                idle_time_ms: answer.idleTimeMs || 0,
                frustration_clicks: answer.frustrationClicks || 0,
                
                // --- Contextual Data 🌐 ---
                time_of_day: timeOfDay,
                day_of_week: dayOfWeek,
                answered_at: now.toISOString(),
                synced: true
            };

            await storageFacade.put('db:/user_answers', payload);
            console.log(`✅ [Sync] Answer Saved. (Frustration: ${payload.frustration_level})`);
        }, 'pushAnswer');
    },

    /**
     * TELEMETRY: Fetch Recent (New 🧠)
     */
    async fetchRecentTelemetry(subject = null, limit = 10) {
        const uid = await this.getUserId();
        if (!uid || uid === 'null') return [];

        try {
            return await storageFacade.get(`db:/user_answers?uid=${uid}&order=answered_at:desc&limit=${limit}`);
        } catch (error) {
            console.warn('🧠 [Sync] Telemetry fetch failed:', error.message);
            return [];
        }
    },

    /**
     * Emotion Sync (Queued)
     */
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

    /**
     * ECONOMY: Wallet & Ledger (Phase 1 🏦)
     */
    async fetchUserBalance() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null') return null;

        try {
            return await storageFacade.get(`db:/user_balances?uid=${uid}&single=maybe`);
        } catch (error) {
            console.warn('💰 [Sync] Balance fetch failed:', error.message);
            return null;
        }
    },

    async updateBalance(currency, amountChange, transactionType, contextId = null) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            const cleanCurrency = currency.toLowerCase();

            try {
                // 1. Log the Transaction (The Ledger 📜)
                const transaction = {
                    user_id: uid,
                    currency,
                    amount_change: amountChange,
                    transaction_type: transactionType,
                    context_id: contextId,
                    created_at: new Date().toISOString()
                };
                
                await storageFacade.put('db:/user_transactions', transaction);

                // 2. Update the Balance (The Wallet 🏦)
                const current = await storageFacade.get(`db:/user_balances?uid=${uid}&single=maybe`);

                const newBalance = (current?.[cleanCurrency] || 0) + amountChange;
                
                await storageFacade.put('db:/user_balances', {
                    user_id: uid,
                    [cleanCurrency]: newBalance,
                    updated_at: new Date().toISOString()
                });

                console.log(`💰 [Sync] Balance Updated: ${currency} ${amountChange > 0 ? '+' : ''}${amountChange} (${transactionType})`);
                return newBalance;

            } catch (e) {
                console.error('❌ [Sync] Economy update failed:', e.message);
                throw e;
            }
        }, 'updateBalance');
    },

    /**
     * BEHAVIORAL ANALYTICS (Psychology 🧠)
     */
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
                console.warn('🧠 [Sync] Emotional telemetry failed:', e.message);
            }
        }, 'pushEmotionalMetrics');
    },

    /**
     * REMEDIATION TRACKING (Logic 🧪)
     */
    async trackConceptError(subtopic, questionId) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            try {
                // Upsert pattern (increment error_count)
                const existing = await storageFacade.get(`db:/concept_error_tracking?uid=${uid}&subtopic=${subtopic}&single=maybe`);

                if (existing) {
                    await storageFacade.patch(`db:/concept_error_tracking/${existing.id}`, { 
                        error_count: (existing.error_count || 0) + 1,
                        last_question_id: questionId,
                        updated_at: new Date().toISOString()
                    });
                } else {
                    await storageFacade.put('db:/concept_error_tracking', {
                        user_id: uid,
                        subtopic,
                        error_count: 1,
                        last_question_id: questionId,
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (e) {
                console.warn('🧪 [Sync] Concept error tracking failed:', e.message);
            }
        }, 'trackConceptError');
    },

    /**
     * UNIFIED VAULT: The Smart Discovery Engine (Phase 5 🔓)
     * ====================================================
     * Consolidates all discoveries (Notes, Sims, Recaps) into user_vault.
     * Format: [TYPE]|[TITLE]|[PATH]
     */
    async pushToVault({ id, title, type, subject, path }) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            // Pack the Smart Key
            const smartKey = `${type.toUpperCase()}|${title}|${path || id}`;

            const payload = {
                user_id: uid,
                artifact_id: smartKey,
                subject: subject
            };

            // 🛡️ Manual Upsert for Vault
            const existing = await storageFacade.get(`db:/user_vault?uid=${uid}&artifact_id=${smartKey}&single=maybe`);

            if (existing) {
                await storageFacade.patch(`db:/user_vault/${existing.id}`, payload);
            } else {
                await storageFacade.put('db:/user_vault', payload);
            }
            
            console.log(`☁️ [Vault] Saved: ${title} (${type})`);
        }, 'pushToVault');
    },

    /**
     * Legacy Aliases (Now routing to Unified Vault 🚀)
     */
    async recordContentUnlock(contentId, title = 'Study Note', subject = 'general') {
        return this.pushToVault({ id: contentId, title, type: 'NOTE', subject });
    },

    async recordSimulationUnlock(simId, subject = 'math', title = 'Interactive Study') {
        return this.pushToVault({ id: simId, title, type: 'SIM', subject });
    },

    /**
     * Badge Sync (Queued - Aligned with Public Schema)
     */
    async pushBadge(badge) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            try {
                // 🛡️ Manual Upsert for Badges (aligned with new schema 🏅)
                const existingBadge = await storageFacade.get(`db:/badges?uid=${uid}&badge_type=${badge.id}&single=maybe`);

                if (existingBadge) {
                    await storageFacade.patch(`db:/badges/${existingBadge.id}`, { 
                        earned_at: badge.earnedAt || new Date().toISOString(),
                        badge_name: badge.name 
                    });
                } else {
                    await storageFacade.put('db:/badges', {
                        user_id: uid,
                        badge_type: badge.id,
                        badge_name: badge.name,
                        earned_at: badge.earnedAt || new Date().toISOString()
                    });
                }

                console.log(`🏆 [Sync] Badge Saved: ${badge.name}`);
            } catch (e) {
                console.warn(`⚠️ [Sync] Badge sync failed (non-fatal):`, e.message);
            }
        }, 'pushBadge');
    },

    /**
     * Chest Sync (Fixed Handshake 📦)
     */
    async pushChestDrop(chestType, rewards) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            try {
                const record = {
                    user_id: uid,
                    chest_type: chestType || 'wood',
                    opened: true,
                    opened_at: new Date().toISOString()
                };

                await storageFacade.put('db:/user_chests', record);
                console.log('🎁 [Sync] Chest drop recorded in cloud.');
            } catch (e) {
                console.warn('⚠️ [Sync] Chest sync failed (non-fatal):', e.message);
            }
        }, 'pushChestDrop');
    },

    /**
     * Concept Mastery Sync (New 📊)
     */
    async pushConceptMastery(subject, record) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            const payload = {
                user_id: uid,
                subject: subject,
                base_id: record.baseId,
                mastery_level: record.masteryLevel,
                correct_streak: record.correctStreak,
                total_attempts: record.totalAttempts,
                total_correct: record.totalCorrect,
                review_count: record.reviewCount,
                last_reviewed_at: record.lastReviewedAt,
                next_review_at: record.nextReviewAt,
                updated_at: new Date().toISOString()
            };

            // 🛡️ Manual Upsert for Concept Mastery (Missing Unique Constraint)
            const existing = await storageFacade.get(`db:/concept_mastery?uid=${uid}&subject=${subject}&base_id=${record.baseId}&single=maybe`);

            if (existing) {
                await storageFacade.patch(`db:/concept_mastery/${existing.id}`, payload);
            } else {
                await storageFacade.put('db:/concept_mastery', payload);
            }

            console.log(`📊 [Sync] Mastery Synced: ${record.baseId} (${record.masteryLevel})`);
        }, 'pushConceptMastery');
    },

    /**
     * Session Sync (New 🏁)
     */
    async pushSession(sessionData) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            const payload = {
                user_id: uid,
                session_start: typeof sessionData.startedAt === 'number' ? new Date(sessionData.startedAt).toISOString() : sessionData.startedAt,
                ended_at: new Date().toISOString(),
                current_quest_id: null, // Avoid integer parsing error
                frustration_level: sessionData.frustrationLevel || 0,
                engagement_level: sessionData.engagementLevel || 0,
                cognitive_load: sessionData.cognitiveLoad || 0,
                mastery_level: sessionData.masteryLevel || 'learning',
                quest_results: {
                    ...sessionData.results,
                    quest_key: sessionData.questId // Preserve string ID here
                }
            };

            await storageFacade.put('db:/user_sessions', payload);
            console.log(`🏁 [Sync] Session Finalized in Cloud.`);
        }, 'pushSession');
    },

    /**
     * Progress Sync (Robust Patch 🛡️)
     */
    async updateProgress(questKey, progress) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            try {
                const payload = {
                    user_id: uid,
                    quest_key: questKey,
                    node_type: progress.nodeType || 'lesson',
                    mastery: progress.mastery || 0,
                    stars: progress.stars || 0,
                    status: progress.status || 'completed',
                    last_attempted_at: new Date().toISOString()
                };

                const existing = await storageFacade.get(`db:/quest_progress?uid=${uid}&quest_key=${questKey}&node_type=${progress.nodeType || 'lesson'}&single=maybe`);

                if (existing) {
                    // Only update if mastery or stars improved
                    const finalMastery = Math.max(existing.mastery || 0, payload.mastery);
                    const finalStars = Math.max(existing.stars || 0, payload.stars);
                    
                    await storageFacade.patch(`db:/quest_progress/${existing.id}`, {
                        ...payload,
                        mastery: finalMastery,
                        stars: finalStars,
                        attempts: (existing.attempts || 0) + 1
                    });
                } else {
                    await storageFacade.put('db:/quest_progress', {
                        ...payload,
                        attempts: 1
                    });
                }
                
                console.log(`📈 [Sync] Progress Updated: ${questKey} / ${progress.nodeType} (${progress.stars}⭐)`);
            } catch (e) {
                console.warn('⚠️ [Sync] Progress sync failed (non-fatal):', e.message);
            }
        }, 'updateProgress');
    },

    /**
     * Auth Methods
     */
    async signUp(email, password, metadata = {}) {
        this._userIdCache = null; // Force refresh
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
        if (error) throw error;
        return data.user;
    },

    async signIn(email, password) {
        this._userIdCache = null; // Force refresh
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
    },

    async resetPassword(email) {
        // Dispatches a recovery link to the user's email
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { data, error };
    },

    async updatePassword(newPassword) {
        // Updates the password for the currently authenticated session (from recovery link)
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        return { data, error };
    },

    async signOut() {
        this._userIdCache = null;
        await supabase.auth.signOut();
        localStorage.removeItem('manya_session_id');
    },

    async pullProfile() {
        const uid = await this.getUserId();
        
        // 🛡️ Safety Gate: Never fetch if ID is null or an invalid string
        if (!uid || uid === 'null' || uid === 'undefined') {
            console.warn("🛡️ [Sync] Skipping Cloud Pull: No valid session ID yet.");
            return null;
        }

        try {
            return await storageFacade.get(`db:/profiles/${uid}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Profile fetch failed for ${uid}:`, error.message);
            return null;
        }
    },

    async pullProgress() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try {
            return await storageFacade.get(`db:/quest_progress?uid=${uid}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Progress fetch failed:`, error.message);
            return null;
        }
    },

    async pullAchievements() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try {
            return await storageFacade.get(`db:/badges?uid=${uid}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Badges fetch failed:`, error.message);
            return null;
        }
    },

    async pullChestHistory() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        try {
            return await storageFacade.get(`db:/user_chests?uid=${uid}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Chest history fetch failed:`, error.message);
            return null;
        }
    },

    async pullConceptMastery(subject) {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return [];
        try {
            return await storageFacade.get(`db:/concept_mastery?uid=${uid}&subject=${subject}`);
        } catch (error) {
            console.warn(`⚠️ [Sync] Mastery fetch failed for ${subject}:`, error.message);
            return [];
        }
    },

    /**
     * Vault Sync
     */
    async pushVault(artifactId, subject) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            const payload = {
                user_id: uid,
                artifact_id: artifactId,
                subject: subject
            };

            // 🛡️ Manual Upsert for Vault (missing unique constraint)
            const existing = await storageFacade.get(`db:/user_vault?uid=${uid}&artifact_id=${artifactId}&single=maybe`);

            if (existing) {
                await storageFacade.patch(`db:/user_vault/${existing.id}`, payload);
            } else {
                await storageFacade.put('db:/user_vault', payload);
            }
            
            console.log(`☁️ [Sync] Vault Artifact ${artifactId} synced.`);
        }, 'pushVault');
    },

    async pullVault() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return [];
        try {
            const data = await storageFacade.get(`db:/user_vault?uid=${uid}`);
            
            // Unpack Smart Keys: [TYPE]|[TITLE]|[PATH]
            return data.map(row => {
                if (row.artifact_id.includes('|')) {
                    const [type, title, path] = row.artifact_id.split('|');
                    return {
                        id: row.id,
                        type,
                        title,
                        path,
                        subject: row.subject,
                        unlocked_at: row.unlocked_at
                    };
                }
                // Fallback for legacy IDs
                return { artifactId: row.artifact_id, subject: row.subject };
            });
        } catch (error) {
            console.warn(`⚠️ [Sync] Vault fetch failed:`, error.message);
            return [];
        }
    },

    /**
     * RANKINGS: The Live Hero Engine (Phase 6 🏆)
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
    }
};

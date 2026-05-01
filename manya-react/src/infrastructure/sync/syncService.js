import { supabase } from '../remote/supabaseClient.js';
import { ManyaDB } from '../db/manyaDB.js';
import { storageService } from '../storage/storageService.js';

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
        if (this._userIdCache) return this._userIdCache;
        if (this._activeUserIdRequest) return this._activeUserIdRequest;

        this._activeUserIdRequest = (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const uid = session?.user?.id || localStorage.getItem('manya_session_id') || null;
                if (uid) this._userIdCache = uid;
                return uid;
            } catch(e) { 
                return localStorage.getItem('manya_session_id') || null; 
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
                last_active_at: new Date().toISOString(),
                engagement_stats: {
                    gems: profileData.diamonds || 0,
                    coins: profileData.coins || 0,
                    quests_completed: profileData.stats_quests_completed || 0,
                    unlocked_badges: profileData.unlockedBadges || []
                },
                preferences: profileData.preferences || {}
            };

            const { error } = await supabase.from('profiles').upsert(payload);
            if (error) throw error;
            console.log("☁️ [Sync] Profile Synced.");
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
                
                // --- Behavioral Telemetry (Your Schema 🛡️) ---
                confidence_rating: answer.confidenceRating || 0,
                hesitation_count: answer.hesitationCount || 0,
                frustration_level: answer.frustrationLevel || 0,
                answer_changed: answer.answerChanged || false,
                time_to_first_click_ms: answer.timeToFirstClick || 0,
                points_earned: answer.pointsEarned || 0,
                
                // --- Contextual Data 🌐 ---
                time_of_day: timeOfDay,
                day_of_week: dayOfWeek,
                answered_at: now.toISOString(),
                synced: true
            };

            const { error } = await supabase.from('user_answers').insert(payload);
            if (error) throw error;
            console.log(`✅ [Sync] Answer Saved. (Frustration: ${payload.frustration_level})`);
        }, 'pushAnswer');
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

            const { error } = await supabase.from('emotional_metrics').insert(record);
            if (error) throw error;
        }, 'pushEmotion');
    },

    /**
     * Badge Sync (Queued - Aligned with Public Schema)
     */
    async pushBadge(badge) {
        return syncQueue.execute(async () => {
            const uid = await this.getUserId();
            if (!uid) return;

            try {
                // Write to achievements table
                const { error: achError } = await supabase.from('achievements').upsert({
                    user_id: uid,
                    badge_id: badge.id,
                    achievement_name: badge.name,
                    earned_at: badge.earnedAt || new Date().toISOString()
                }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
                if (achError) console.warn('⚠️ [Sync] achievements write failed:', achError.message);

                // Also write to badges table
                const { error: badgeError } = await supabase.from('badges').upsert({
                    user_id: uid,
                    badge_type: badge.id,
                    badge_name: badge.name,
                    earned_at: badge.earnedAt || new Date().toISOString()
                }, { onConflict: 'user_id,badge_type', ignoreDuplicates: true });
                if (badgeError) console.warn('⚠️ [Sync] badges write failed:', badgeError.message);

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
                const coins = rewards?.find?.(r => r.type === 'coins')?.amount || 0;
                const gems = rewards?.find?.(r => r.type === 'gems')?.amount || 0;

                const record = {
                    user_id: uid,
                    chest_type: chestType || 'wood',
                    gems_earned: gems,
                    coins_earned: coins,
                    opened_at: new Date().toISOString()
                };

                const { error } = await supabase.from('chest_history').insert(record);
                if (error) console.warn('⚠️ [Sync] chest_history write failed:', error.message);
                else console.log('🎁 [Sync] Chest rewards synced to cloud.');
            } catch (e) {
                console.warn('⚠️ [Sync] Chest sync failed (non-fatal):', e.message);
            }
        }, 'pushChestDrop');
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
                    status: progress.status || 'completed',
                    last_attempted_at: new Date().toISOString()
                };

                // Use composite key: user_id + quest_key + node_type
                const { data: existing } = await supabase.from('quest_progress')
                    .select('id')
                    .eq('user_id', uid)
                    .eq('quest_key', questKey)
                    .eq('node_type', progress.nodeType || 'lesson')
                    .maybeSingle();

                if (existing) {
                    const { error } = await supabase.from('quest_progress')
                        .update(payload)
                        .eq('id', existing.id);
                    if (error) console.warn('⚠️ [Sync] quest_progress update failed:', error.message);
                } else {
                    const { error } = await supabase.from('quest_progress')
                        .insert(payload);
                    if (error) console.warn('⚠️ [Sync] quest_progress insert failed:', error.message);
                }
                
                console.log(`📈 [Sync] Progress Updated: ${questKey} / ${progress.nodeType}`);
            } catch (e) {
                console.warn('⚠️ [Sync] Progress sync failed (non-fatal):', e.message);
            }
        }, 'updateProgress');
    },

    /**
     * Auth Methods
     */
    async signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
        if (error) throw error;
        return data.user;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
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

        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (error) {
            console.warn(`⚠️ [Sync] Profile fetch failed for ${uid}:`, error.message);
            return null;
        }
        return data;
    },

    async pullProgress() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        const { data, error } = await supabase.from('quest_progress').select('*').eq('user_id', uid);
        if (error) {
            console.warn(`⚠️ [Sync] Progress fetch failed:`, error.message);
            return null;
        }
        return data;
    },

    async pullAchievements() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        const { data, error } = await supabase.from('achievements').select('*').eq('user_id', uid);
        if (error) {
            console.warn(`⚠️ [Sync] Achievements fetch failed:`, error.message);
            return null;
        }
        return data;
    },

    async pullChestHistory() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return null;
        const { data, error } = await supabase.from('chest_history').select('*').eq('user_id', uid);
        if (error) {
            console.warn(`⚠️ [Sync] Chest history fetch failed:`, error.message);
            return null;
        }
        return data;
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

            const { error } = await supabase.from('user_vault').upsert(payload, { onConflict: 'user_id,artifact_id' });
            if (error) throw error;
            console.log(`☁️ [Sync] Vault Artifact ${artifactId} synced.`);
        }, 'pushVault');
    },

    async pullVault() {
        const uid = await this.getUserId();
        if (!uid || uid === 'null' || uid === 'undefined') return [];
        const { data, error } = await supabase.from('user_vault').select('artifact_id').eq('user_id', uid);
        if (error) {
            console.warn(`⚠️ [Sync] Vault fetch failed:`, error.message);
            return [];
        }
        return data.map(row => row.artifact_id);
    }
};

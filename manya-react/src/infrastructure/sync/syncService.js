import { supabase } from '../remote/supabaseClient.js';
import { ManyaDB } from '../db/manyaDB.js';
import { storageService } from '../storage/storageService.js';

/**
 * MANYA GLOBAL SYNC SERVICE
 * =========================
 * Bridges Local Storage (LocalStorage/IndexedDB) with Supabase PostgreSQL.
 * Handles profiles, user_answers, and quest_progress sync.
 * Supports OFFLINE-FIRST writing via a persistent sync queue.
 */
export const syncService = {
    
    /**
     * Get the current authenticated user ID.
     */
    async getUserId() {
        try {
            // Failsafe: Detect and Purge legacy non-UUID IDs that cause Supabase 400 crashes
            const localId = localStorage.getItem('manya_session_id');
            if (localId && localId.startsWith('ID_')) {
                console.warn("🛡️ [Security] Purging legacy non-UUID session ID...");
                localStorage.removeItem('manya_session_id');
                // We'll let it fall through to get a fresh session or return null
            }

            const { data: { session } } = await supabase.auth.getSession();
            return session?.user?.id || localStorage.getItem('manya_session_id') || null;
        } catch(e) { return null; }
    },

    /**
     * Auth: Sign Up with Email/Password
     */
    async signUp(email, password, metadata = {}) {
        return await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
    },

    /**
     * Auth: Sign In
     */
    async signIn(email, password) {
        return await supabase.auth.signInWithPassword({ email, password });
    },

    /**
     * Auth: Sign Out
     */
    async signOut() {
        return await supabase.auth.signOut();
    },

    /**
     * Auth: Reset Password (Trigger Email)
     */
    async resetPassword(email) {
        return await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });
    },

    /**
     * Auth: Update Password (Live Session Required)
     */
    async updatePassword(password) {
        try {
            const uid = await this.getUserId();
            if (!uid) throw new Error("Security Session Expired. Please request a new link.");

            console.log(`🛡️ [Security] Updating credentials for ${uid}...`);
            const { data, error } = await supabase.auth.updateUser({ password });
            return { data, error };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    /**
     * Auth: Delete Account
     */
    async deleteAccount() {
        const uid = await this.getUserId();
        if (!uid) return { error: { message: "Not logged in" } };
        return await supabase.rpc('delete_user_data');
    },

    /**
     * Push User Profile to Supabase.
     */
    async uploadProfile(profileData, manualUid = null) {
        const uid = manualUid || await this.getUserId();
        if (!uid || uid.startsWith('ID_')) return; // Block legacy IDs 🛡️
        
        const payload = {
            id: uid,
            full_name: profileData.fullName || profileData.nickname,
            xp: profileData.xp || profileData.totalPoints || 0,
            gems_overall: profileData.gems_overall || profileData.overallGems || profileData.diamonds || 0,
            gems_sst: profileData.subjectGems?.sst || profileData.sstGems || 0,
            gems_math: profileData.subjectGems?.math || profileData.mathGems || 0,
            gems_english: profileData.subjectGems?.english || profileData.englishGems || 0,
            gems_science: profileData.subjectGems?.science || profileData.scienceGems || 0,
            streak_current: profileData.current_streak || 0,
            streak_longest: profileData.longest_streak || 0,
            avatar_url: profileData.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.avatarSeed}` : null,
            preferences: profileData.preferences || {},
            parent_email: profileData.parent?.email || profileData.parent_email,
            parent_phone: profileData.parent?.whatsapp || profileData.parent_phone,
            grade_level: profileData.grade_level || profileData.goal,
            engagement_stats: profileData.engagement_stats || {},
            unlocked_badges: profileData.unlockedBadges || [],
            vault_artifacts: profileData.vaultArtifacts || [], // 🏺 Persist Knowledge Vault to cloud
            last_active_at: new Date().toISOString()
        };

        try {
            console.log(`☁️ [Sync] Uploading profile for ${uid}...`);
            const { error } = await supabase.from('profiles').upsert(payload);
            if (error) throw error;
        } catch (err) {
            console.warn("⚠️ Profile sync failed, queuing for later:", err.message);
            await ManyaDB.addToSyncQueue('profile', payload);
        }
    },

    /**
     * Push a Single Answer to Supabase.
     */
    async pushAnswer(subject, answer) {
        const uid = await this.getUserId();
        if (!uid || uid.startsWith('ID_')) return; // Block legacy IDs 🛡️

        // Analytics enrichment (ported from Manya-app-master)
        const now = new Date();
        const hour = now.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
        const pointsEarned = answer.isCorrect ? (answer.hintUsed ? 2 : 3) : 0;

        const payload = {
            id: answer.id || crypto.randomUUID(),  // RED FLAG FIX: Pin the ID locally
            user_id: uid,
            question_id: answer.questionId,
            is_correct: answer.isCorrect,
            selected_answer: String(answer.selectedAnswer || ''),
            correct_answer: String(answer.correctAnswer || ''),
            time_spent_ms: answer.timeSpentMs,
            hint_used: answer.hintUsed,
            answer_changed: answer.answerChanged,
            frustration_level: answer.frustrationLevel || 0,
            frustration_clicks: answer.changeCount || 0, // Mapped locally
            session_id: answer.session_id || storageService.getItem('manya_session_id'),
            time_of_day: timeOfDay,
            day_of_week: dayOfWeek,
            points_earned: pointsEarned,
            answered_at: answer.answeredAt || answer.clientTimestamp || new Date().toISOString(), // RED FLAG FIX: Bind to true offline time
            client_timestamp: answer.clientTimestamp || new Date().toISOString() // RED FLAG FIX: Pin the exact hardware clock
        };

        try {
            console.log(`☁️ [Sync] Recording answer in user_answers...`, { questionId: payload.question_id, pool: payload.pool });
            const { data, error, status } = await supabase.from('user_answers').insert(payload);
            
            if (error) {
                console.error(`❌ [Sync] Supabase Error (${status}):`, error.message, error.details, error.hint);
                throw error;
            }
            
            console.log(`✅ [Sync] Answer recorded successfully: ${status}`);
        } catch (err) {
            console.warn("⚠️ Answer sync failed, queuing for later:", err.message);
            await ManyaDB.addToSyncQueue('answer', payload);
        }
    },

    /**
     * Push Quest/Node Progress to Supabase.
     */
    async updateProgress(questKey, progress) {
        const uid = await this.getUserId();
        if (!uid) return;

        const payload = {
            user_id: uid,
            quest_key: questKey,
            node_type: progress.nodeType,
            mastery: progress.mastery,
            status: progress.status,
            attempts: progress.attempts,
            last_attempted_at: new Date().toISOString(),
            streak_broken_at: progress.streak_broken_at || null
        };

        try {
            console.log(`☁️ [Sync] Updating quest progress for ${questKey}...`);
            const { error } = await supabase.from('quest_progress').upsert(payload, { onConflict: 'user_id, quest_key, node_type' });
            if (error) throw error;
        } catch (err) {
            console.warn("⚠️ Progress sync failed, queuing for later:", err.message);
            await ManyaDB.addToSyncQueue('progress', payload);
        }
    },

    /**
     * Push Concept Mastery Record to Supabase.
     */
    async pushConceptMastery(subject, record) {
        const uid = await this.getUserId();
        if (!uid) return;

        const payload = {
            user_id: uid,
            subject: subject,
            base_id: record.baseId,
            mastery_level: record.masteryLevel,
            review_count: record.reviewCount,
            last_reviewed_at: record.lastReviewedAt,
            next_review_at: record.nextReviewAt,
            correct_streak: record.correctStreak,
            total_attempts: record.totalAttempts,
            total_correct: record.totalCorrect,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('concept_mastery').upsert(payload, {
                onConflict: 'user_id, subject, base_id'
            });
            if (error) throw error;
        } catch (err) {
            console.warn('⚠️ Concept mastery sync failed, queuing:', err.message);
            await ManyaDB.addToSyncQueue('concept_mastery', payload);
        }
    },

    /**
     * Push emotional state to Supabase `emotional_metrics` table.
     * Called from emotionTracker.js — fire-and-forget, never blocks the UI.
     * @param {{ emotion: string, intensity: number, context: string }} payload
     */
    async pushEmotion(payload) {
        const uid = await this.getUserId();
        if (!uid) return;

        const record = {
            user_id: uid,
            emotion: payload.emotion,
            intensity: payload.intensity,
            context: payload.context,
            response_time_ms: payload.responseTimeMs || 0,
            recorded_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('emotional_metrics').insert(record);
            if (error) throw error;
        } catch (_) {
            await ManyaDB.addToSyncQueue('emotion', record);
        }
    },

    /**
     * Push a chest drop event to Supabase `user_chests` table.
     * @param {'bronze'|'silver'|'gold'} chestType
     * @param {object[]} rewards - Array of reward objects from rollChestRewards()
     */
    async pushChestDrop(chestType, rewards) {
        const uid = await this.getUserId();
        if (!uid) return;

        const record = {
            user_id: uid,
            chest_type: chestType,
            rewards_json: JSON.stringify(rewards),
            opened: true,
            opened_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('user_chests').insert(record);
            if (error) throw error;
        } catch (_) {
            await ManyaDB.addToSyncQueue('chest', record);
        }
    },

    /**
     * Push a newly earned badge to Supabase `user_achievements`.
     * @param {{ id, name, icon, subject, earnedAt }} badge
     */
    async pushBadge(badge) {
        const uid = await this.getUserId();
        if (!uid) return;

        const record = {
            user_id: uid,
            achievement_type: badge.id,
            achievement_name: badge.name,
            icon: badge.icon,
            earned_at: badge.earnedAt
        };

        try {
            const { error } = await supabase.from('achievements').upsert(record, {
                onConflict: 'user_id, achievement_type'
            });
            if (error) throw error;
        } catch (_) {
            await ManyaDB.addToSyncQueue('badge', record);
        }
    },

    /**
     * MANUAL FORCE SYNC
     * Manually triggers the queue processor.
     */
    async forceSync() {
        console.log("🔄 [Sync] Forced Sync Initiation...");
        return await this.processSyncQueue();
    },

    /**
     * BACKGROUND SYNC PROCESSOR
     * Flushes the IndexedDB sync queue when back online.
     */
    async processSyncQueue() {
        if (!navigator.onLine) return { success: false, error: 'Offline' };
        
        const queue = await ManyaDB.getSyncQueue();
        if (queue.length === 0) return { success: true, count: 0 };

        console.log(`🔄 [Sync] Processing ${queue.length} queued items...`);
        let successCount = 0;
        let authError = false;

        for (const item of queue) {
            try {
                // 🛡️ SECURITY JANITOR: Detect and Purge poisoned records that cause Supabase 400 floods
                const payloadStr = JSON.stringify(item.data);
                if (payloadStr.includes('"ID_') || payloadStr.includes('ID_')) {
                    console.warn(`🛡️ [Sync] Purging poisoned ${item.type} record from queue...`);
                    await ManyaDB.removeSyncItem(item.id);
                    continue;
                }

                let error;
                if (item.type === 'profile') {
                    // 🛡️ SCHEMA JANITOR: Re-confirm payload to avoid 400 Bad Request from legacy/bad columns
                    const sanitized = {
                        id: item.data.id,
                        full_name: item.data.full_name,
                        xp: item.data.xp,
                        gems_overall: item.data.gems_overall,
                        gems_sst: item.data.gems_sst,
                        gems_math: item.data.gems_math,
                        gems_english: item.data.gems_english,
                        gems_science: item.data.gems_science,
                        streak_current: item.data.streak_current,
                        streak_longest: item.data.streak_longest,
                        avatar_url: item.data.avatar_url,
                        preferences: item.data.preferences,
                        unlocked_badges: item.data.unlocked_badges,
                        vault_artifacts: item.data.vault_artifacts,
                        last_active_at: item.data.last_active_at
                    };
                    ({ error } = await supabase.from('profiles').upsert(sanitized));
                } else if (item.type === 'answer') {
                    ({ error } = await supabase.from('user_answers').insert(item.data));
                } else if (item.type === 'progress') {
                    ({ error } = await supabase.from('quest_progress').upsert(item.data, { onConflict: 'user_id, quest_key, node_type' }));
                } else if (item.type === 'concept_mastery') {
                    ({ error } = await supabase.from('concept_mastery').upsert(item.data, { onConflict: 'user_id, subject, base_id' }));
                } else if (item.type === 'emotion') {
                    ({ error } = await supabase.from('emotional_metrics').insert(item.data));
                } else if (item.type === 'chest') {
                    ({ error } = await supabase.from('user_chests').insert(item.data));
                } else if (item.type === 'badge') {
                    ({ error } = await supabase.from('achievements').upsert(item.data, { onConflict: 'user_id, achievement_type' }));
                }

                if (!error) {
                    await ManyaDB.removeSyncItem(item.id);
                    successCount++;
                } else if (error.message.includes('permission') || error.message.includes('JWT')) {
                    authError = true;
                    break;
                }
            } catch (err) {
                console.error(`❌ [Sync] Retry failed for ${item.type}:`, err.message);
            }
        }
        
        return { 
            success: successCount > 0, 
            count: successCount, 
            pending: queue.length - successCount,
            authError 
        };
    },

    /**
     * Pull Full Profile from Supabase (Cloud Boot).
     */
    async pullProfile() {
        const uid = await this.getUserId();
        if (!uid) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (error) return null;
        return data;
    }
};

// Event listener for online status
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log("🌐 [Sync] Network restored. Processing backlog...");
        syncService.processSyncQueue();
    });
}


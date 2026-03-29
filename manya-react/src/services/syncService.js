import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

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
            const { data: { session } } = await supabase.auth.getSession();
            return session?.user?.id || null;
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
        if (!uid) return; 
        
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
        if (!uid) return;

        const payload = {
            user_id: uid,
            question_id: answer.questionId,
            is_correct: answer.isCorrect,
            selected_option: String(answer.selectedAnswer || ''),
            correct_option: String(answer.correctAnswer || ''),
            time_spent_ms: answer.timeSpentMs,
            hint_used: answer.hintUsed,
            answer_changed: answer.answerChanged,
            change_count: answer.changeCount || 0,
            frustration_level: answer.frustrationLevel || 0,
            pool: answer.pool || 'exam',
            engine_type: answer.engine_type || 'MCQ',
            concept_id: answer.concept_id || null,
            variant: answer.variant || null,
            subject: subject,
            session_id: answer.session_id || localStorage.getItem('manya_session_id')
        };

        try {
            console.log(`☁️ [Sync] Recording answer in user_answers...`);
            const { error } = await supabase.from('user_answers').insert(payload);
            if (error) throw error;
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
     * BACKGROUND SYNC PROCESSOR
     * Flushes the IndexedDB sync queue when back online.
     */
    async processSyncQueue() {
        if (!navigator.onLine) return;
        const queue = await ManyaDB.getSyncQueue();
        if (queue.length === 0) return;

        console.log(`🔄 [Sync] Processing ${queue.length} queued items...`);

        for (const item of queue) {
            try {
                let error;
                if (item.type === 'profile') {
                    ({ error } = await supabase.from('profiles').upsert(item.data));
                } else if (item.type === 'answer') {
                    ({ error } = await supabase.from('user_answers').insert(item.data));
                } else if (item.type === 'progress') {
                    ({ error } = await supabase.from('quest_progress').upsert(item.data));
                }

                if (!error) {
                    await ManyaDB.removeSyncItem(item.id);
                    console.log(`✅ [Sync] Successfully pushed queued ${item.type} item.`);
                }
            } catch (err) {
                console.error(`❌ [Sync] Retry failed for ${item.type}:`, err.message);
            }
        }
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


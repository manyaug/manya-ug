import { supabase } from './supabaseClient';

/**
 * MANYA GLOBAL SYNC SERVICE
 * =========================
 * Bridges Local Storage (LocalStorage/IndexedDB) with Supabase PostgreSQL.
 * Handles profiles, user_answers, and quest_progress sync.
 */
export const syncService = {
    
    /**
     * Get the current authenticated user ID.
     */
    async getUserId() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id || null;
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
     * Requires the user to be recently signed in.
     */
    async deleteAccount() {
        const uid = await this.getUserId();
        if (!uid) return { error: { message: "Not logged in" } };
        
        // This usually requires a service role or a specific API call if delete is self-service
        // In Supabase, users can't delete themselves easily via browser client for security.
        // We'll mark the profile as 'deleted' or use a custom function.
        return await supabase.rpc('delete_user_data');
    },

    /**
     * Push User Profile to Supabase.
     */
    async uploadProfile(profileData, manualUid = null) {
        const uid = manualUid || await this.getUserId();
        if (!uid) {
            console.warn("⚠️ [Sync] No UID found for profile upload. Aborting.");
            return;
        }
        
        // Handle structural differences between userStateService and ManyaDB
        const xp = profileData.xp || profileData.totalPoints || 0;
        const gemsOverall = profileData.gems_overall || profileData.overallGems || profileData.diamonds || 0;
        
        const g_sst = profileData.subjectGems?.sst || profileData.sstGems || 0;
        const g_math = profileData.subjectGems?.math || profileData.mathGems || 0;
        const g_eng = profileData.subjectGems?.english || profileData.englishGems || 0;
        const g_sci = profileData.subjectGems?.science || profileData.scienceGems || 0;

        console.log(`☁️ [Sync] Uploading profile for ${uid}...`);
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: uid,
                full_name: profileData.fullName || profileData.nickname,
                xp: xp,
                gems_overall: gemsOverall,
                gems_sst: g_sst,
                gems_math: g_math,
                gems_english: g_eng,
                gems_science: g_sci,
                streak_current: profileData.currentStreak || 0,
                streak_longest: profileData.longestStreak || 0,
                avatar_url: profileData.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.avatarSeed}` : null,
                preferences: profileData.preferences || {},
                parent_email: profileData.parent?.email || profileData.parent_email,
                parent_phone: profileData.parent?.whatsapp || profileData.parent_phone,
                grade_level: profileData.grade_level || profileData.goal,
                last_active_at: new Date().toISOString()
            });

        if (error) {
            console.error("❌ Profile sync failed:", error.message);
            throw error; // Rethrow so caller (OnboardingView) can handle it
        }
    },

    /**
     * Push a Single Answer to Supabase.
     */
    async pushAnswer(subject, answer) {
        const uid = await this.getUserId();
        if (!uid) return;

        console.log(`☁️ [Sync] Recording answer in user_answers...`);
        const { error } = await supabase
            .from('user_answers')
            .insert({
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
                pool: answer.pool || 'exam'
            });

        if (error) console.error("❌ Answer sync failed:", error.message);
    },

    /**
     * Push Quest/Node Progress to Supabase.
     */
    async updateProgress(questKey, progress) {
        const uid = await this.getUserId();
        if (!uid) return;

        // progress is { mastery, nodeType, attempts, status }
        console.log(`☁️ [Sync] Updating quest progress for ${questKey}...`);
        const { error } = await supabase
            .from('quest_progress')
            .upsert({
                user_id: uid,
                quest_key: questKey,
                node_type: progress.nodeType,
                mastery: progress.mastery,
                status: progress.status,
                attempts: progress.attempts,
                last_attempted_at: new Date().toISOString()
            }, { onConflict: 'user_id, quest_key, node_type' });

        if (error) console.error("❌ Progress sync failed:", error.message);
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

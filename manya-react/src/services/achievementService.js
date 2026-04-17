/**
 * MANYA ACHIEVEMENT SERVICE
 * ==========================
 * 80+ Milestone badges (20 per subject) that celebrate learning progress.
 * Achievements are checked after every quest completion and persisted to
 * localStorage + Supabase.
 * 
 * Ported & expanded from: Manya-app-master/question-fetcher.js (checkAchievements)
 */

import { supabase } from '../infrastructure/remote/supabaseClient.js';
import { syncService } from '../infrastructure/sync/syncService';

// ── 20 ACHIEVEMENTS PER SUBJECT ──────────────────────────────────────────────

const SUBJECT_BADGES = {
    math: [
        { id: 'math_first_step',       name: 'Number Seedling',       icon: '🌱', desc: 'Complete your first Math quest', condition: ctx => ctx.questsCompleted >= 1 },
        { id: 'math_3_quests',         name: 'Equation Explorer',     icon: '🧭', desc: 'Complete 3 Math quests', condition: ctx => ctx.questsCompleted >= 3 },
        { id: 'math_5_quests',         name: 'Formula Finder',        icon: '🔍', desc: 'Complete 5 Math quests', condition: ctx => ctx.questsCompleted >= 5 },
        { id: 'math_10_quests',        name: 'Math Pathfinder',       icon: '🗺️', desc: 'Complete 10 Math quests', condition: ctx => ctx.questsCompleted >= 10 },
        { id: 'math_20_quests',        name: 'Calculation King',      icon: '👑', desc: 'Complete 20 Math quests', condition: ctx => ctx.questsCompleted >= 20 },
        { id: 'math_perfect',          name: 'Perfect Equation',      icon: '💎', desc: 'Score 90%+ on a Math quest', condition: ctx => ctx.mastery >= 90 },
        { id: 'math_streak_3',         name: 'Triple Solve',          icon: '🔥', desc: 'Get a 3-day streak in Math', condition: ctx => ctx.streak >= 3 },
        { id: 'math_streak_7',         name: 'Week of Numbers',       icon: '⚡', desc: '7-day Math streak', condition: ctx => ctx.streak >= 7 },
        { id: 'math_streak_14',        name: 'Fortnight Formula',     icon: '🌟', desc: '14-day Math streak', condition: ctx => ctx.streak >= 14 },
        { id: 'math_no_hints',         name: 'Mental Math',           icon: '🧠', desc: 'Complete a quest without hints', condition: ctx => ctx.questCompletedNoHints },
        { id: 'math_speed',            name: 'Speed Calculator',      icon: '⏱️', desc: 'Avg answer time < 8s with 80%+ accuracy', condition: ctx => ctx.avgTime < 8000 && ctx.accuracy > 0.8 },
        { id: 'math_50_correct',       name: 'Fifty Solver',          icon: '🎯', desc: '50 correct Math answers', condition: ctx => ctx.totalCorrect >= 50 },
        { id: 'math_100_correct',      name: 'Century Mark',          icon: '💯', desc: '100 correct Math answers', condition: ctx => ctx.totalCorrect >= 100 },
        { id: 'math_mastery_node',     name: 'Math Boss Slayer',      icon: '🐉', desc: 'Complete a MASTERY node', condition: ctx => ctx.nodeType === 'MASTERY' && ctx.mastery >= 60 },
        { id: 'math_comeback',         name: 'Math Comeback',         icon: '🦅', desc: 'Pass after 2+ failed attempts', condition: ctx => ctx.attempts >= 3 && ctx.mastery >= 60 },
        { id: 'math_v3_master',        name: 'V3 Virtuoso',           icon: '🏆', desc: 'Master 5 concepts to V3', condition: ctx => ctx.v3Mastered >= 5 },
        { id: 'math_all_warmups',      name: 'Warmed Up',             icon: '☀️', desc: 'Complete all warmup nodes in a unit', condition: ctx => ctx.allWarmupsComplete },
        { id: 'math_gem_collector',     name: 'Gem Hoarder',           icon: '💰', desc: 'Earn 200+ Math gems', condition: ctx => ctx.gemsEarned >= 200 },
        { id: 'math_night_owl',        name: 'Night Calculator',      icon: '🦉', desc: 'Complete a quest after 9PM', condition: ctx => ctx.hour >= 21 },
        { id: 'math_early_bird',       name: 'Morning Math',          icon: '🐦', desc: 'Complete a quest before 7AM', condition: ctx => ctx.hour < 7 },
    ],
    science: [
        { id: 'sci_first_step',        name: 'Lab Apprentice',        icon: '🧪', desc: 'Complete your first Science quest', condition: ctx => ctx.questsCompleted >= 1 },
        { id: 'sci_3_quests',          name: 'Junior Scientist',      icon: '🔬', desc: 'Complete 3 Science quests', condition: ctx => ctx.questsCompleted >= 3 },
        { id: 'sci_5_quests',          name: 'Hypothesis Tester',     icon: '📋', desc: 'Complete 5 Science quests', condition: ctx => ctx.questsCompleted >= 5 },
        { id: 'sci_10_quests',         name: 'Research Fellow',       icon: '🎓', desc: 'Complete 10 Science quests', condition: ctx => ctx.questsCompleted >= 10 },
        { id: 'sci_20_quests',         name: 'Science Legend',        icon: '🧬', desc: 'Complete 20 Science quests', condition: ctx => ctx.questsCompleted >= 20 },
        { id: 'sci_perfect',           name: 'Flawless Experiment',   icon: '💎', desc: 'Score 90%+ on a Science quest', condition: ctx => ctx.mastery >= 90 },
        { id: 'sci_streak_3',          name: 'Lab Streak',            icon: '🔥', desc: '3-day Science streak', condition: ctx => ctx.streak >= 3 },
        { id: 'sci_streak_7',          name: 'Weekly Researcher',     icon: '⚡', desc: '7-day Science streak', condition: ctx => ctx.streak >= 7 },
        { id: 'sci_streak_14',         name: 'Science Devotee',       icon: '🌟', desc: '14-day Science streak', condition: ctx => ctx.streak >= 14 },
        { id: 'sci_no_hints',          name: 'Independent Thinker',   icon: '🧠', desc: 'Complete a quest without hints', condition: ctx => ctx.questCompletedNoHints },
        { id: 'sci_speed',             name: 'Quick Thinker',         icon: '⏱️', desc: 'Avg < 8s with 80%+ accuracy', condition: ctx => ctx.avgTime < 8000 && ctx.accuracy > 0.8 },
        { id: 'sci_50_correct',        name: 'Discovery Maker',       icon: '🎯', desc: '50 correct Science answers', condition: ctx => ctx.totalCorrect >= 50 },
        { id: 'sci_100_correct',       name: 'Nobel Nominee',         icon: '💯', desc: '100 correct Science answers', condition: ctx => ctx.totalCorrect >= 100 },
        { id: 'sci_mastery_node',      name: 'Lab Boss',              icon: '🐉', desc: 'Complete a MASTERY node', condition: ctx => ctx.nodeType === 'MASTERY' && ctx.mastery >= 60 },
        { id: 'sci_comeback',          name: 'Retry Champion',        icon: '🦅', desc: 'Pass after 2+ failed attempts', condition: ctx => ctx.attempts >= 3 && ctx.mastery >= 60 },
        { id: 'sci_v3_master',         name: 'Expert Analyst',        icon: '🏆', desc: 'Master 5 concepts to V3', condition: ctx => ctx.v3Mastered >= 5 },
        { id: 'sci_all_warmups',       name: 'Pre-Lab Ready',         icon: '☀️', desc: 'Complete all warmup nodes', condition: ctx => ctx.allWarmupsComplete },
        { id: 'sci_gem_collector',      name: 'Crystal Collector',     icon: '💰', desc: 'Earn 200+ Science gems', condition: ctx => ctx.gemsEarned >= 200 },
        { id: 'sci_night_owl',         name: 'Midnight Lab',          icon: '🦉', desc: 'Complete a quest after 9PM', condition: ctx => ctx.hour >= 21 },
        { id: 'sci_early_bird',        name: 'Dawn Researcher',       icon: '🐦', desc: 'Complete a quest before 7AM', condition: ctx => ctx.hour < 7 },
    ],
    sst: [
        { id: 'sst_first_step',        name: 'World Discoverer',      icon: '🌍', desc: 'Complete your first SST quest', condition: ctx => ctx.questsCompleted >= 1 },
        { id: 'sst_3_quests',          name: 'Map Reader',            icon: '🗺️', desc: 'Complete 3 SST quests', condition: ctx => ctx.questsCompleted >= 3 },
        { id: 'sst_5_quests',          name: 'Geography Scout',       icon: '🧭', desc: 'Complete 5 SST quests', condition: ctx => ctx.questsCompleted >= 5 },
        { id: 'sst_10_quests',         name: 'History Buff',          icon: '📜', desc: 'Complete 10 SST quests', condition: ctx => ctx.questsCompleted >= 10 },
        { id: 'sst_20_quests',         name: 'Social Studies Master', icon: '🏛️', desc: 'Complete 20 SST quests', condition: ctx => ctx.questsCompleted >= 20 },
        { id: 'sst_perfect',           name: 'Perfect Explorer',      icon: '💎', desc: 'Score 90%+ on an SST quest', condition: ctx => ctx.mastery >= 90 },
        { id: 'sst_streak_3',          name: 'Explorer Streak',       icon: '🔥', desc: '3-day SST streak', condition: ctx => ctx.streak >= 3 },
        { id: 'sst_streak_7',          name: 'Weekly Historian',      icon: '⚡', desc: '7-day SST streak', condition: ctx => ctx.streak >= 7 },
        { id: 'sst_streak_14',         name: 'Fortnight Explorer',    icon: '🌟', desc: '14-day SST streak', condition: ctx => ctx.streak >= 14 },
        { id: 'sst_no_hints',          name: 'Unaided Navigator',     icon: '🧠', desc: 'Complete a quest without hints', condition: ctx => ctx.questCompletedNoHints },
        { id: 'sst_speed',             name: 'Rapid Recall',          icon: '⏱️', desc: 'Avg < 8s with 80%+ accuracy', condition: ctx => ctx.avgTime < 8000 && ctx.accuracy > 0.8 },
        { id: 'sst_50_correct',        name: 'Continental Scholar',   icon: '🎯', desc: '50 correct SST answers', condition: ctx => ctx.totalCorrect >= 50 },
        { id: 'sst_100_correct',       name: 'World Authority',       icon: '💯', desc: '100 correct SST answers', condition: ctx => ctx.totalCorrect >= 100 },
        { id: 'sst_mastery_node',      name: 'Globe Boss',            icon: '🐉', desc: 'Complete a MASTERY node', condition: ctx => ctx.nodeType === 'MASTERY' && ctx.mastery >= 60 },
        { id: 'sst_comeback',          name: 'History Rewriter',      icon: '🦅', desc: 'Pass after 2+ failures', condition: ctx => ctx.attempts >= 3 && ctx.mastery >= 60 },
        { id: 'sst_v3_master',         name: 'Civilization Expert',   icon: '🏆', desc: 'Master 5 concepts to V3', condition: ctx => ctx.v3Mastered >= 5 },
        { id: 'sst_all_warmups',       name: 'Briefing Complete',     icon: '☀️', desc: 'Complete all warmup nodes', condition: ctx => ctx.allWarmupsComplete },
        { id: 'sst_gem_collector',      name: 'Treasure Hunter',       icon: '💰', desc: 'Earn 200+ SST gems', condition: ctx => ctx.gemsEarned >= 200 },
        { id: 'sst_night_owl',         name: 'Midnight Historian',    icon: '🦉', desc: 'Quest after 9PM', condition: ctx => ctx.hour >= 21 },
        { id: 'sst_early_bird',        name: 'Dawn Explorer',         icon: '🐦', desc: 'Quest before 7AM', condition: ctx => ctx.hour < 7 },
    ],
    english: [
        { id: 'eng_first_step',        name: 'Word Sprout',           icon: '📖', desc: 'Complete your first English quest', condition: ctx => ctx.questsCompleted >= 1 },
        { id: 'eng_3_quests',          name: 'Sentence Builder',      icon: '✏️', desc: 'Complete 3 English quests', condition: ctx => ctx.questsCompleted >= 3 },
        { id: 'eng_5_quests',          name: 'Grammar Guardian',      icon: '🛡️', desc: 'Complete 5 English quests', condition: ctx => ctx.questsCompleted >= 5 },
        { id: 'eng_10_quests',         name: 'Storyteller',           icon: '📚', desc: 'Complete 10 English quests', condition: ctx => ctx.questsCompleted >= 10 },
        { id: 'eng_20_quests',         name: 'Literary Legend',       icon: '🏆', desc: 'Complete 20 English quests', condition: ctx => ctx.questsCompleted >= 20 },
        { id: 'eng_perfect',           name: 'Perfect Prose',         icon: '💎', desc: 'Score 90%+ on an English quest', condition: ctx => ctx.mastery >= 90 },
        { id: 'eng_streak_3',          name: 'Reading Rhythm',        icon: '🔥', desc: '3-day English streak', condition: ctx => ctx.streak >= 3 },
        { id: 'eng_streak_7',          name: 'Weekly Wordsmith',      icon: '⚡', desc: '7-day English streak', condition: ctx => ctx.streak >= 7 },
        { id: 'eng_streak_14',         name: 'Poetic Persistence',    icon: '🌟', desc: '14-day English streak', condition: ctx => ctx.streak >= 14 },
        { id: 'eng_no_hints',          name: 'Solo Reader',           icon: '🧠', desc: 'Complete a quest without hints', condition: ctx => ctx.questCompletedNoHints },
        { id: 'eng_speed',             name: 'Speed Reader',          icon: '⏱️', desc: 'Avg < 8s with 80%+ accuracy', condition: ctx => ctx.avgTime < 8000 && ctx.accuracy > 0.8 },
        { id: 'eng_50_correct',        name: 'Vocabulary Victor',     icon: '🎯', desc: '50 correct English answers', condition: ctx => ctx.totalCorrect >= 50 },
        { id: 'eng_100_correct',       name: 'Language Master',       icon: '💯', desc: '100 correct English answers', condition: ctx => ctx.totalCorrect >= 100 },
        { id: 'eng_mastery_node',      name: 'Grammar Boss',          icon: '🐉', desc: 'Complete a MASTERY node', condition: ctx => ctx.nodeType === 'MASTERY' && ctx.mastery >= 60 },
        { id: 'eng_comeback',          name: 'Rewrite Hero',          icon: '🦅', desc: 'Pass after 2+ failures', condition: ctx => ctx.attempts >= 3 && ctx.mastery >= 60 },
        { id: 'eng_v3_master',         name: 'Vocabulary Virtuoso',   icon: '🏆', desc: 'Master 5 concepts to V3', condition: ctx => ctx.v3Mastered >= 5 },
        { id: 'eng_all_warmups',       name: 'Warmed Up Reader',      icon: '☀️', desc: 'Complete all warmup nodes', condition: ctx => ctx.allWarmupsComplete },
        { id: 'eng_gem_collector',      name: 'Ink Collector',         icon: '💰', desc: 'Earn 200+ English gems', condition: ctx => ctx.gemsEarned >= 200 },
        { id: 'eng_night_owl',         name: 'Bedtime Storyteller',   icon: '🦉', desc: 'Quest after 9PM', condition: ctx => ctx.hour >= 21 },
        { id: 'eng_early_bird',        name: 'Morning Pages',         icon: '🐦', desc: 'Quest before 7AM', condition: ctx => ctx.hour < 7 },
    ]
};

// ── STORAGE ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'manya_achievements';

function loadAchievements() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
}

function saveAchievements(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── PUBLIC API ──────────────────────────────────────────────────────────────

export const achievementService = {

    /**
     * Check for newly earned achievements after a quest completion.
     * 
     * @param {string} subject - 'math' | 'science' | 'sst' | 'english'
     * @param {object} context - Performance context with all metrics
     * @returns {Array} - Newly earned achievements (empty if none)
     */
    checkAchievements(subject, context) {
        const earned = loadAchievements();
        const badges = SUBJECT_BADGES[subject] || [];
        const newlyEarned = [];

        // Enrich context with time-of-day
        const hour = new Date().getHours();
        const enrichedCtx = { ...context, hour };

        for (const badge of badges) {
            // Skip if already earned
            if (earned[badge.id]) continue;

            try {
                if (badge.condition(enrichedCtx)) {
                    const achievement = {
                        ...badge,
                        subject,
                        earnedAt: new Date().toISOString(),
                        justEarned: true
                    };

                    // Persist locally
                    earned[badge.id] = {
                        name: badge.name,
                        icon: badge.icon,
                        desc: badge.desc,
                        subject,
                        earnedAt: achievement.earnedAt
                    };

                    newlyEarned.push(achievement);
                    console.log(`🏅 [Achievement] UNLOCKED: ${badge.icon} ${badge.name}`);
                }
            } catch (e) {
                // Condition function threw — skip silently
            }
        }

        if (newlyEarned.length > 0) {
            saveAchievements(earned);

            // Sync to Supabase (fire-and-forget)
            for (const a of newlyEarned) {
                this.syncToCloud(a).catch(() => {});
            }
        }

        return newlyEarned;
    },

    /**
     * Get all earned achievements.
     */
    getEarnedAchievements() {
        return loadAchievements();
    },

    /**
     * Get earned count for a specific subject.
     */
    getSubjectCount(subject) {
        const earned = loadAchievements();
        return Object.values(earned).filter(a => a.subject === subject).length;
    },

    /**
     * Get total possible badges for a subject.
     */
    getTotalForSubject(subject) {
        return (SUBJECT_BADGES[subject] || []).length;
    },

    /**
     * Get all badge definitions for display.
     */
    getAllBadges(subject) {
        const earned = loadAchievements();
        const badges = SUBJECT_BADGES[subject] || [];

        return badges.map(badge => ({
            ...badge,
            earned: !!earned[badge.id],
            earnedAt: earned[badge.id]?.earnedAt || null
        }));
    },

    /**
     * Sync a single achievement to Supabase.
     */
    async syncToCloud(achievement) {
        try {
            const uid = await syncService.getUserId();
            if (!uid) return;

            const { error } = await supabase.from('achievements').upsert({
                user_id: uid,
                achievement_type: achievement.id,
                achievement_name: achievement.name,
                icon: achievement.icon,
                earned_at: achievement.earnedAt
            }, { onConflict: 'user_id, achievement_type' });

            if (error) throw error;
        } catch (err) {
            console.warn('[Achievement] Cloud sync failed:', err.message);
        }
    },

    /**
     * Pull achievements from Supabase on login.
     */
    async pullFromCloud() {
        try {
            const uid = await syncService.getUserId();
            if (!uid) return;

            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .eq('user_id', uid);

            if (error || !data) return;

            const local = loadAchievements();
            let merged = false;

            for (const row of data) {
                if (!local[row.achievement_type]) {
                    local[row.achievement_type] = {
                        name: row.achievement_name,
                        icon: row.icon,
                        subject: row.achievement_type.split('_')[0] === 'eng' ? 'english'
                               : row.achievement_type.split('_')[0] === 'sci' ? 'science'
                               : row.achievement_type.split('_')[0],
                        earnedAt: row.earned_at
                    };
                    merged = true;
                }
            }

            if (merged) {
                saveAchievements(local);
                console.log(`☁️ [Achievement] Merged ${data.length} badges from cloud`);
            }
        } catch (err) {
            console.warn('[Achievement] Cloud pull failed:', err.message);
        }
    }
};

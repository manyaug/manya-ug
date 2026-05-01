/**
 * MANYA BADGE REGISTRY v1.1
 * Reusable Logic Helpers for Maintainability
 */

export const BADGE_TIERS = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
    DIAMOND: 'diamond'
};

export const BADGE_CATEGORIES = {
    GENERAL: 'General Heroism',
    MATH: 'Math Ninja',
    SCIENCE: 'Science Lab',
    SST: 'SST Explorer',
    ENGLISH: 'English Master'
};

/**
 * 🛠️ RULE HELPERS
 * Use these to define badge criteria. Makes adding 100+ badges easy to maintain.
 */
const hasGems = (sub, amt) => (u) => (u[`${sub.toLowerCase()}Gems`] || 0) >= amt;
const hasProg = (sub, count) => (u) => (u[`prog_${sub.toLowerCase()}`] || 0) >= count;
const hasStreak = (days) => (u) => (u.current_streak || 0) >= days;
const hasCoins = (amt) => (u) => (u.coins || 0) >= amt;
const hasStat = (key, amt) => (u) => (u[key] || 0) >= amt;
const hasQuestCount = (amt) => (u) => (u.stats_quests_completed || 0) >= amt;

export const BADGES = [
    // --- 🌍 GENERAL HEROISM (20) ---
    { id: 'gen_01', cat: 'GENERAL', tier: 'BRONZE', icon: 'Wand2', name: 'Apprentice', desc: 'Complete your first quest ever.', check: hasQuestCount(1) },
    { id: 'gen_02', cat: 'GENERAL', tier: 'BRONZE', icon: 'Zap', name: 'Current', desc: 'Achieve a 3-day streak.', check: hasStreak(3) },
    { id: 'gen_03', cat: 'GENERAL', tier: 'SILVER', icon: 'Zap', name: 'Live Wire', desc: 'Achieve a 7-day streak.', check: hasStreak(7) },
    { id: 'gen_04', cat: 'GENERAL', tier: 'GOLD', icon: 'Flame', name: 'Fire Starter', desc: 'Achieve a 14-day streak.', check: hasStreak(14) },
    { id: 'gen_05', cat: 'GENERAL', tier: 'PLATINUM', icon: 'FlameKindle', name: 'Inferno', desc: 'Achieve a 30-day streak.', check: hasStreak(30) },
    { id: 'gen_06', cat: 'GENERAL', tier: 'DIAMOND', icon: 'Sun', name: 'Eternal Flame', desc: 'Achieve a 100-day streak.', check: hasStreak(100) },
    { id: 'gen_07', cat: 'GENERAL', tier: 'BRONZE', icon: 'Coins', name: 'Thrifty', desc: 'Collect 100 coins.', check: hasCoins(100) },
    { id: 'gen_08', cat: 'GENERAL', tier: 'SILVER', icon: 'Coins', name: 'Investor', desc: 'Collect 1,000 coins.', check: hasCoins(1000) },
    { id: 'gen_09', cat: 'GENERAL', tier: 'GOLD', icon: 'Banknote', name: 'Tycoon', desc: 'Collect 5,000 coins.', check: hasCoins(5000) },
    { id: 'gen_10', cat: 'GENERAL', tier: 'DIAMOND', icon: 'Gem', name: 'Billionaire', desc: 'Collect 50,000 coins.', check: hasCoins(50000) },
    { id: 'gen_11', cat: 'GENERAL', tier: 'BRONZE', icon: 'Moon', name: 'Night Owl', desc: 'Finish a quest after 10 PM.', check: (u) => {
        const hour = new Date().getHours();
        return hour >= 22 || hour <= 4;
    }}, 
    { id: 'gen_12', cat: 'GENERAL', tier: 'BRONZE', icon: 'Sunrise', name: 'Early Bird', desc: 'Finish a quest before 8 AM.', check: (u) => {
        const hour = new Date().getHours();
        return hour >= 5 && hour < 8;
    }}, 
    { id: 'gen_13', cat: 'GENERAL', tier: 'SILVER', icon: 'Timer', name: 'Marathon', desc: 'Study for over 60 mins in one day.', check: (u) => {
        const today = new Date().toISOString().split('T')[0];
        return (u.engagement_stats?.[today] || 0) > 3600000;
    }},
    { id: 'gen_14', cat: 'GENERAL', tier: 'GOLD', icon: 'Trophy', name: 'Champion', desc: 'Complete 100 units.', check: hasQuestCount(100) },
    { id: 'gen_15', cat: 'GENERAL', tier: 'BRONZE', icon: 'UserCheck', name: 'Profiled', desc: 'Set your nickname and avatar.', check: (u) => !!u.nickname },
    { id: 'gen_16', cat: 'GENERAL', tier: 'SILVER', icon: 'Target', name: 'Sniper', desc: 'Correct on first try 50 times.', check: hasStat('stats_perfect_answers', 50) },
    { id: 'gen_17', cat: 'GENERAL', tier: 'GOLD', icon: 'Crosshair', name: 'Deadeye', desc: 'Correct on first try 200 times.', check: hasStat('stats_perfect_answers', 200) },
    { id: 'gen_18', cat: 'GENERAL', tier: 'PLATINUM', icon: 'ShieldCheck', name: 'Invincible', desc: 'Answer 500 questions correctly.', check: (u) => ((u.math_correct || 0) + (u.science_correct || 0) + (u.sst_correct || 0) + (u.english_correct || 0)) >= 500 },
    { id: 'gen_19', cat: 'GENERAL', tier: 'BRONZE', icon: 'Lightbulb', name: 'Curious', desc: 'Use 10 hints to understand better.', check: hasStat('stats_hints_used', 10) },
    { id: 'gen_20', cat: 'GENERAL', tier: 'SILVER', icon: 'BrainCircuit', name: 'Researcher', desc: 'View 50 explanations.', check: hasStat('stats_explanations_viewed', 50) },

    // --- 📐 MATH NINJA (20) ---
    { id: 'math_01', cat: 'MATH', tier: 'BRONZE', icon: 'Hash', name: 'Counter', desc: 'Earn 10 Math gems.', check: hasGems('math', 10) },
    { id: 'math_02', cat: 'MATH', tier: 'BRONZE', icon: 'Calculator', name: 'Sum Buddy', desc: 'Complete 5 Math units.', check: hasProg('math', 5) },
    { id: 'math_03', cat: 'MATH', tier: 'SILVER', icon: 'Divide', name: 'Fraction Fan', desc: 'Complete 15 Math units.', check: hasProg('math', 15) },
    { id: 'math_04', cat: 'MATH', tier: 'SILVER', icon: 'Percent', name: 'Percents', desc: 'Earn 500 Math gems.', check: hasGems('math', 500) },
    { id: 'math_05', cat: 'MATH', tier: 'GOLD', icon: 'Binary', name: 'Logician', desc: 'Earn 1,000 Math gems.', check: hasGems('math', 1000) },
    { id: 'math_06', cat: 'MATH', tier: 'GOLD', icon: 'Sigma', name: 'Sigma Hero', desc: 'Complete 50 Math units.', check: hasProg('math', 50) },
    { id: 'math_07', cat: 'MATH', tier: 'PLATINUM', icon: 'Cpu', name: 'Algorithm', desc: 'Earn 5,000 Math gems.', check: hasGems('math', 5000) },
    { id: 'math_08', cat: 'MATH', tier: 'DIAMOND', icon: 'Infinity', name: 'Math God', desc: 'Earn 25,000 Math gems.', check: hasGems('math', 25000) },
    { id: 'math_09', cat: 'MATH', tier: 'BRONZE', icon: 'PlusSquare', name: 'Addict', desc: '50 Correct Math answers.', check: hasStat('math_correct', 50) },
    { id: 'math_10', cat: 'MATH', tier: 'SILVER', icon: 'MinusSquare', name: 'Subtracter', desc: '150 Correct Math answers.', check: hasStat('math_correct', 150) },
    { id: 'math_11', cat: 'MATH', tier: 'BRONZE', icon: 'Circle', name: 'Zero Hero', desc: '30 Correct Math answers.', check: hasStat('math_correct', 30) },
    { id: 'math_12', cat: 'MATH', tier: 'GOLD', icon: 'Box', name: 'Geometry', desc: '300 Correct Math answers.', check: hasStat('math_correct', 300) },
    { id: 'math_13', cat: 'MATH', tier: 'SILVER', icon: 'Tally5', name: 'Tally', desc: '75 Correct Math answers.', check: hasStat('math_correct', 75) },
    { id: 'math_14', cat: 'MATH', tier: 'BRONZE', icon: 'Scaling', name: 'Scaler', desc: '20 Correct Math answers.', check: hasStat('math_correct', 20) },
    { id: 'math_15', cat: 'MATH', tier: 'GOLD', icon: 'Variable', name: 'X-Hunter', desc: '100 Correct Math answers.', check: hasStat('math_correct', 100) },
    { id: 'math_16', cat: 'MATH', tier: 'PLATINUM', icon: 'SquareRoot', name: 'Rooted', desc: '400 Correct Math answers.', check: hasStat('math_correct', 400) },
    { id: 'math_17', cat: 'MATH', tier: 'SILVER', icon: 'Triangle', name: 'Trig', desc: '125 Correct Math answers.', check: hasStat('math_correct', 125) },
    { id: 'math_18', cat: 'MATH', tier: 'GOLD', icon: 'TrendingUp', name: 'Statistician', desc: '200 Correct Math answers.', check: hasStat('math_correct', 200) },
    { id: 'math_19', cat: 'MATH', tier: 'BRONZE', icon: 'Grid', name: 'Gridder', desc: '15 Correct Math answers.', check: hasStat('math_correct', 15) },
    { id: 'math_20', cat: 'MATH', tier: 'DIAMOND', icon: 'Crown', name: 'Abacus Lord', desc: '500 Correct Math answers.', check: hasStat('math_correct', 500) },

    // --- 🔬 SCIENCE LAB (20) ---
    { id: 'sci_01', cat: 'SCIENCE', tier: 'BRONZE', icon: 'Microscope', name: 'Observer', desc: 'Earn 10 Science gems.', check: hasGems('science', 10) },
    { id: 'sci_02', cat: 'SCIENCE', tier: 'BRONZE', icon: 'GlassWater', name: 'H2O Expert', desc: 'Complete 5 Science units.', check: hasProg('science', 5) },
    { id: 'sci_03', cat: 'SCIENCE', tier: 'SILVER', icon: 'FlaskConical', name: 'Mixer', desc: 'Complete 15 Science units.', check: hasProg('science', 15) },
    { id: 'sci_04', cat: 'SCIENCE', tier: 'SILVER', icon: 'Leaf', name: 'Botanist', desc: 'Earn 500 Science gems.', check: hasGems('science', 500) },
    { id: 'sci_05', cat: 'SCIENCE', tier: 'GOLD', icon: 'Zap', name: 'Electric', desc: 'Earn 1,000 Science gems.', check: hasGems('science', 1000) },
    { id: 'sci_06', cat: 'SCIENCE', tier: 'GOLD', icon: 'Bone', name: 'Biologist', desc: 'Complete 50 Science units.', check: hasProg('science', 50) },
    { id: 'sci_07', cat: 'SCIENCE', tier: 'PLATINUM', icon: 'Atom', name: 'Physicist', desc: 'Earn 5,000 Science gems.', check: hasGems('science', 5000) },
    { id: 'sci_08', cat: 'SCIENCE', tier: 'DIAMOND', icon: 'Rocket', name: 'Astronaut', desc: 'Earn 25,000 Science gems.', check: hasGems('science', 25000) },
    { id: 'sci_09', cat: 'SCIENCE', tier: 'BRONZE', icon: 'Thermometer', name: 'Thermal', desc: '50 Correct Science answers.', check: hasStat('science_correct', 50) },
    { id: 'sci_10', cat: 'SCIENCE', tier: 'SILVER', icon: 'TestTube2', name: 'Lab Tech', desc: '150 Correct Science answers.', check: hasStat('science_correct', 150) },
    { id: 'sci_11', cat: 'SCIENCE', tier: 'BRONZE', icon: 'CloudRain', name: 'Weather', desc: '30 Correct Science answers.', check: hasStat('science_correct', 30) },
    { id: 'sci_12', cat: 'SCIENCE', tier: 'GOLD', icon: 'Activity', name: 'Doctor', desc: '300 Correct Science answers.', check: hasStat('science_correct', 300) },
    { id: 'sci_13', cat: 'SCIENCE', tier: 'SILVER', icon: 'Magnet', name: 'Attractive', desc: '75 Correct Science answers.', check: hasStat('science_correct', 75) },
    { id: 'sci_14', cat: 'SCIENCE', tier: 'BRONZE', icon: 'Sun', name: 'Solar', desc: '20 Correct Science answers.', check: hasStat('science_correct', 20) },
    { id: 'sci_15', cat: 'SCIENCE', tier: 'GOLD', icon: 'Dna', name: 'Geneticist', desc: '100 Correct Science answers.', check: hasStat('science_correct', 100) },
    { id: 'sci_16', cat: 'SCIENCE', tier: 'PLATINUM', icon: 'Waves', name: 'Ocean', desc: '400 Correct Science answers.', check: hasStat('science_correct', 400) },
    { id: 'sci_17', cat: 'SCIENCE', tier: 'SILVER', icon: 'Settings', name: 'Engineer', desc: '125 Correct Science answers.', check: hasStat('science_correct', 125) },
    { id: 'sci_18', cat: 'SCIENCE', tier: 'GOLD', icon: 'Sprout', name: 'Ecologist', desc: '200 Correct Science answers.', check: hasStat('science_correct', 200) },
    { id: 'sci_19', cat: 'SCIENCE', tier: 'BRONZE', icon: 'Eye', name: 'Optics', desc: '15 Correct Science answers.', check: hasStat('science_correct', 15) },
    { id: 'sci_20', cat: 'SCIENCE', tier: 'DIAMOND', icon: 'Cloud', name: 'Cosmos', desc: '500 Correct Science answers.', check: hasStat('science_correct', 500) },

    // --- 🗿 SST EXPLORER (20) ---
    { id: 'sst_01', cat: 'SST', tier: 'BRONZE', icon: 'Map', name: 'Scout', desc: 'Earn 10 SST gems.', check: hasGems('sst', 10) },
    { id: 'sst_02', cat: 'SST', tier: 'BRONZE', icon: 'Tent', name: 'Camper', desc: 'Complete 5 SST units.', check: hasProg('sst', 5) },
    { id: 'sst_03', cat: 'SST', tier: 'SILVER', icon: 'Compass', name: 'Navigator', desc: 'Complete 15 SST units.', check: hasProg('sst', 15) },
    { id: 'sst_04', cat: 'SST', tier: 'SILVER', icon: 'Globe', name: 'Traveler', desc: 'Earn 500 SST gems.', check: hasGems('sst', 500) },
    { id: 'sst_05', cat: 'SST', tier: 'GOLD', icon: 'Castle', name: 'Historian', desc: 'Earn 1,000 SST gems.', check: hasGems('sst', 1000) },
    { id: 'sst_06', cat: 'SST', tier: 'GOLD', icon: 'Mountain', name: 'Sherpa', desc: 'Complete 50 SST units.', check: hasProg('sst', 50) },
    { id: 'sst_07', cat: 'SST', tier: 'PLATINUM', icon: 'Scroll', name: 'Archivist', desc: 'Earn 5,000 SST gems.', check: hasGems('sst', 5000) },
    { id: 'sst_08', cat: 'SST', tier: 'DIAMOND', icon: 'Milestone', name: 'Conqueror', desc: 'Earn 25,000 SST gems.', check: hasGems('sst', 25000) },
    { id: 'sst_09', cat: 'SST', tier: 'BRONZE', icon: 'Scale', name: 'Citizen', desc: '50 Correct SST answers.', check: hasStat('sst_correct', 50) },
    { id: 'sst_10', cat: 'SST', tier: 'SILVER', icon: 'Flag', name: 'Patriot', desc: '150 Correct SST answers.', check: hasStat('sst_correct', 150) },
    { id: 'sst_11', cat: 'SST', tier: 'BRONZE', icon: 'UtilityPole', name: 'Utility', desc: '30 Correct SST answers.', check: hasStat('sst_correct', 30) },
    { id: 'sst_12', cat: 'SST', tier: 'GOLD', icon: 'Landmark', name: 'Curator', desc: '300 Correct SST answers.', check: hasStat('sst_correct', 300) },
    { id: 'sst_13', cat: 'SST', tier: 'SILVER', icon: 'Plane', name: 'Pilot', desc: '75 Correct SST answers.', check: hasStat('sst_correct', 75) },
    { id: 'sst_14', cat: 'SST', tier: 'BRONZE', icon: 'Ship', name: 'Sailor', desc: '20 Correct SST answers.', check: hasStat('sst_correct', 20) },
    { id: 'sst_15', cat: 'SST', tier: 'GOLD', icon: 'Shield', name: 'Defender', desc: '100 Correct SST answers.', check: hasStat('sst_correct', 100) },
    { id: 'sst_16', cat: 'SST', tier: 'PLATINUM', icon: 'Church', name: 'Culture', desc: '400 Correct SST answers.', check: hasStat('sst_correct', 400) },
    { id: 'sst_17', cat: 'SST', tier: 'SILVER', icon: 'TrendingUp', name: 'Economist', desc: '125 Correct SST answers.', check: hasStat('sst_correct', 125) },
    { id: 'sst_18', cat: 'SST', tier: 'GOLD', icon: 'Handshake', name: 'Diplomat', desc: '200 Correct SST answers.', check: hasStat('sst_correct', 200) },
    { id: 'sst_19', cat: 'SST', tier: 'BRONZE', icon: 'Vote', name: 'Voter', desc: '15 Correct SST answers.', check: hasStat('sst_correct', 15) },
    { id: 'sst_20', cat: 'SST', tier: 'DIAMOND', icon: 'MapPin', name: 'Leader', desc: '500 Correct SST answers.', check: hasStat('sst_correct', 500) },

    // --- 📚 ENGLISH MASTER (20) ---
    { id: 'eng_01', cat: 'ENGLISH', tier: 'BRONZE', icon: 'PenTool', name: 'Writer', desc: 'Earn 10 English gems.', check: hasGems('english', 10) },
    { id: 'eng_02', cat: 'ENGLISH', tier: 'BRONZE', icon: 'BookOpen', name: 'Reader', desc: 'Complete 5 English units.', check: hasProg('english', 5) },
    { id: 'eng_03', cat: 'ENGLISH', tier: 'SILVER', icon: 'Quote', name: 'Grammar', desc: 'Complete 15 English units.', check: hasProg('english', 15) },
    { id: 'eng_04', cat: 'ENGLISH', tier: 'SILVER', icon: 'Languages', name: 'Polyglot', desc: 'Earn 500 English gems.', check: hasGems('english', 500) },
    { id: 'eng_05', cat: 'ENGLISH', tier: 'GOLD', icon: 'Library', name: 'Scribe', desc: 'Earn 1,000 English gems.', check: hasGems('english', 1000) },
    { id: 'eng_06', cat: 'ENGLISH', tier: 'GOLD', icon: 'LibraryBig', name: 'Author', desc: 'Complete 50 English units.', check: hasProg('english', 50) },
    { id: 'eng_07', cat: 'ENGLISH', tier: 'PLATINUM', icon: 'Pencil', name: 'Editor', desc: 'Earn 5,000 English gems.', check: hasGems('english', 5000) },
    { id: 'eng_08', cat: 'ENGLISH', tier: 'DIAMOND', icon: 'Trophy', name: 'Legend', desc: 'Earn 25,000 English gems.', check: hasGems('english', 25000) },
    { id: 'eng_09', cat: 'ENGLISH', tier: 'BRONZE', icon: 'SpellCheck', name: 'Speller', desc: '50 Correct English answers.', check: hasStat('english_correct', 50) },
    { id: 'eng_10', cat: 'ENGLISH', tier: 'SILVER', icon: 'WholeWord', name: 'Lexicon', desc: '150 Correct English answers.', check: hasStat('english_correct', 150) },
    { id: 'eng_11', cat: 'ENGLISH', tier: 'BRONZE', icon: 'TextSelect', name: 'Editor', desc: '30 Correct English answers.', check: hasStat('english_correct', 30) },
    { id: 'eng_12', cat: 'ENGLISH', tier: 'GOLD', icon: 'Newspaper', name: 'Reporter', desc: '300 Correct English answers.', check: hasStat('english_correct', 300) },
    { id: 'eng_13', cat: 'ENGLISH', tier: 'SILVER', icon: 'Speech', name: 'Orator', desc: '75 Correct English answers.', check: hasStat('english_correct', 75) },
    { id: 'eng_14', cat: 'ENGLISH', tier: 'BRONZE', icon: 'Feather', name: 'Poet', desc: '20 Correct English answers.', check: hasStat('english_correct', 20) },
    { id: 'eng_15', cat: 'ENGLISH', tier: 'GOLD', icon: 'Type', name: 'Sentence', desc: '100 Correct English answers.', check: hasStat('english_correct', 100) },
    { id: 'eng_16', cat: 'ENGLISH', tier: 'PLATINUM', icon: 'BookMarked', name: 'Lit', desc: '400 Correct English answers.', check: hasStat('english_correct', 400) },
    { id: 'eng_17', cat: 'ENGLISH', tier: 'SILVER', icon: 'Ear', name: 'Listener', desc: '125 Correct English answers.', check: hasStat('english_correct', 125) },
    { id: 'eng_18', cat: 'ENGLISH', tier: 'GOLD', icon: 'Shapes', name: 'Creator', desc: '200 Correct English answers.', check: hasStat('english_correct', 200) },
    { id: 'eng_19', cat: 'ENGLISH', tier: 'BRONZE', icon: 'Text', name: 'Analyst', desc: '15 Correct English answers.', check: hasStat('english_correct', 15) },
    { id: 'eng_20', cat: 'ENGLISH', tier: 'DIAMOND', icon: 'History', name: 'Bard', desc: '500 Correct English answers.', check: hasStat('english_correct', 500) }
];

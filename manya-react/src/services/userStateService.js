import { syncService } from './syncService';

const KEYS = {
    USER_STATE: 'manya_user_state',
    SESSION: 'manya_session',
    answers: (subject) => `manya_answers_${subject}`,
};

// ─── Default State ───────────────────────────────────────────────────────────

const DEFAULT_USER_STATE = {
    userId: 'student-local',
    totalPoints: 0,
    overallGems: 0,
    subjectGems: { math: 0, english: 0, sst: 0, science: 0 },
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    badges: [],
    questProgress: {},   // { "sst/locating_africa/quest_1": { mastery: 80, completed: true } }
};

const DEFAULT_SESSION = {
    startedAt: null,
    frustrationLevel: 0,
    confidenceLevel: 70,
    consecutiveWrong: 0,
    consecutiveCorrect: 0,
    questionsAnswered: 0,
    hintCount: 0,
    answerChangeCount: 0,
};

// ─── Read / Write Helpers ────────────────────────────────────────────────────

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('[UserState] localStorage write failed:', e);
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get full user state */
export function getUserState() {
    return readJSON(KEYS.USER_STATE, { ...DEFAULT_USER_STATE });
}

/** Save full user state */
export function saveUserState(state) {
    writeJSON(KEYS.USER_STATE, state);
    // ☁️ BACKGROUND SYNC TO SUPABASE
    syncService.uploadProfile(state).catch(console.error);
}

/** Get current session */
export function getSession() {
    return readJSON(KEYS.SESSION, { ...DEFAULT_SESSION, startedAt: new Date().toISOString() });
}

/** Save current session */
export function saveSession(session) {
    writeJSON(KEYS.SESSION, session);
}

/** Reset session (called on new quest start) */
export function resetSession() {
    writeJSON(KEYS.SESSION, { ...DEFAULT_SESSION, startedAt: new Date().toISOString() });
}

// ─── Answer History ──────────────────────────────────────────────────────────

/** Get all answers for a subject */
export function getAnswerHistory(subject) {
    return readJSON(KEYS.answers(subject), []);
}

/** Record a single answer */
export function recordAnswer(subject, answerData) {
    const history = getAnswerHistory(subject);
    const session = getSession();
    const stamped = {
        ...answerData,
        answeredAt: new Date().toISOString(),
        frustrationLevel: session.frustrationLevel || 0,
    };
    history.push(stamped);
    // Keep last 500 answers per subject to avoid localStorage bloat
    if (history.length > 500) history.splice(0, history.length - 500);
    writeJSON(KEYS.answers(subject), history);

    // ☁️ BACKGROUND SYNC TO SUPABASE
    syncService.pushAnswer(subject, stamped).catch(console.error);
}

// ─── Session Metrics (live, updated per-answer) ──────────────────────────────

/** Update session after an answer is submitted */
export function updateSessionAfterAnswer(isCorrect, hintUsed, answerChanged, timeSpentMs) {
    const session = getSession();

    session.questionsAnswered += 1;
    if (hintUsed) session.hintCount += 1;
    if (answerChanged) session.answerChangeCount += 1;

    if (isCorrect) {
        session.consecutiveWrong = 0;
        session.consecutiveCorrect += 1;
        session.frustrationLevel = Math.max(0, session.frustrationLevel - 5);
    } else {
        session.consecutiveCorrect = 0;
        session.consecutiveWrong += 1;
        session.frustrationLevel = Math.min(100, session.frustrationLevel + 15);
    }

    // Time-based frustration
    if (timeSpentMs > 30000) {
        session.frustrationLevel = Math.min(100, session.frustrationLevel + 10);
    }

    saveSession(session);
    return session;
}

// ─── Streak Management ──────────────────────────────────────────────────────

/** Update daily streak (call once per session) */
export function updateStreak() {
    const state = getUserState();
    const today = new Date().toDateString();

    if (state.lastActiveDate === today) return state; // Already counted today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (state.lastActiveDate === yesterday.toDateString()) {
        state.currentStreak += 1;
    } else if (state.lastActiveDate !== today) {
        state.currentStreak = 1;
    }

    state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    state.lastActiveDate = today;
    saveUserState(state);
    return state;
}

/** Get streak multiplier for gem rewards */
export function getStreakMultiplier() {
    const state = getUserState();
    if (state.currentStreak >= 7) return 2.0;
    if (state.currentStreak >= 5) return 1.5;
    if (state.currentStreak >= 3) return 1.2;
    return 1.0;
}

// ─── Quest Progress ─────────────────────────────────────────────────────────

/** Save quest completion */
export function saveQuestCompletion(questKey, mastery) {
    const state = getUserState();
    const nodeType = questKey.split('/').pop()?.toUpperCase() || 'PRACTICE';
    
    const progressRecord = {
        mastery,
        completed: mastery >= 60,
        completedAt: new Date().toISOString(),
        attempts: (state.questProgress[questKey]?.attempts || 0) + 1,
        status: mastery >= 60 ? 'completed' : 'available'
    };

    state.questProgress[questKey] = progressRecord;
    saveUserState(state);

    // ☁️ BACKGROUND SYNC TO SUPABASE
    syncService.updateProgress(questKey, {
        mastery,
        nodeType,
        attempts: progressRecord.attempts,
        status: progressRecord.status
    }).catch(console.error);
}

/** Check if a quest was completed with sufficient mastery */
export function getQuestMastery(questKey) {
    const state = getUserState();
    return state.questProgress[questKey]?.mastery || 0;
}

// ─── Gem Economy ────────────────────────────────────────────────────────────

/** Award gems after a correct answer */
export function awardGems(subject, isCorrect, hintUsed) {
    if (!isCorrect) return { subjectGems: 0, overallGems: 0 };

    const multiplier = getStreakMultiplier();
    const baseSubject = hintUsed ? 1 : 3;
    const baseOverall = hintUsed ? 0 : 1;
    const bonus = (!hintUsed && isCorrect) ? 1 : 0;

    const subjectGems = Math.floor((baseSubject + bonus) * multiplier);
    const overallGems = Math.floor((baseOverall + bonus) * multiplier);

    const state = getUserState();
    state.subjectGems[subject] = (state.subjectGems[subject] || 0) + subjectGems;
    state.overallGems = (state.overallGems || 0) + overallGems;
    state.totalPoints += (hintUsed ? 5 : 10);
    saveUserState(state);

    return { subjectGems, overallGems };
}

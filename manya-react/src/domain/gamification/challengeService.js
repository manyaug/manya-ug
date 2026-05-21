/**
 * MANYA CHALLENGE SERVICE  (Domain Layer)
 * =========================================
 * Manages the sequential daily challenge system.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — CHALLENGES                                             │
 * │                                                                              │
 * │  This service reads from two tables:                                        │
 * │    challenges       → pre-seeded content, defines what each day's task is  │
 * │    user_challenges  → tracks user's progress on their current challenge     │
 * │                                                                              │
 * │  challenges table schema:                                                   │
 * │    id TEXT PRIMARY KEY, day_number INTEGER,                                 │
 * │    challenge_type TEXT,  -- 'CORRECT_ANSWERS' | 'MATH_CORRECT' | etc.      │
 * │    target_value INTEGER,  description TEXT,                                 │
 * │    reward_value INTEGER,  subject TEXT                                      │
 * │                                                                              │
 * │  user_challenges table schema:                                              │
 * │    id INTEGER PRIMARY KEY AUTOINCREMENT,                                    │
 * │    user_id TEXT, challenge_id TEXT,                                         │
 * │    current_value INTEGER DEFAULT 0,                                         │
 * │    is_completed INTEGER DEFAULT 0,                                          │
 * │    completed_at TEXT, last_updated_at TEXT                                  │
 * │                                                                              │
 * │  SEEDING: Pre-populate the challenges table from the Supabase "challenges" │
 * │  table on first app run. These rarely change.                               │
 * │                                                                              │
 * │  FLOW:                                                                       │
 * │    1. Read profile.challenge_day from profiles table                        │
 * │    2. Fetch challenge WHERE day_number = challenge_day from local SQLite    │
 * │    3. Fetch or create user_challenges row for this user+challenge           │
 * │    4. tick() increments current_value in SQLite                             │
 * │    5. On completion: update user_challenges, increment profile.challenge_day│
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * NOTE: Previously used raw supabase calls. Now routed through storageFacade
 * so Android can handle these via SQLite.
 */

import { storageFacade } from '../../backend/storage/storageFacade.js';
import { syncService } from '../../backend/sync/syncService.js';

// In-memory cache to avoid repeated DB calls per session
let _cache = { challenge: null, progress: null };
let _listeners = [];
let _fetchPromise = null;

export const challengeService = {

    onChange(callback) {
        _listeners.push(callback);
        return () => { _listeners = _listeners.filter(l => l !== callback); };
    },

    _notify() {
        _listeners.forEach(fn => fn({ challenge: _cache.challenge, progress: _cache.progress }));
    },

    async fetchActive(forceRefetch = false) {
        if (!forceRefetch && _cache.challenge && _cache.progress) {
            return { challenge: _cache.challenge, progress: _cache.progress };
        }
        if (_fetchPromise) return _fetchPromise;

        _fetchPromise = (async () => {
            const uid = await syncService.getUserId();
            if (!uid) return null;

            // 1. Get user's current challenge_day from profile
            const profile = await storageFacade.get(`db:/profiles/${uid}`);
            const dayNumber = profile?.challenge_day || 1;

            // 2. Fetch challenge definition for this day
            const challengeList = await storageFacade.get(`db:/challenges?day_number=${dayNumber}&single=maybe`);
            const challenge = Array.isArray(challengeList) ? challengeList[0] : challengeList;

            if (!challenge) {
                console.warn('🏆 [Challenge] No challenge found for day', dayNumber);
                _cache.challenge = null; _cache.progress = null;
                return null;
            }

            // 3. Fetch or create user_challenges progress row
            let progress = await storageFacade.get(
                `db:/user_challenges?uid=${uid}&challenge_id=${challenge.id}&single=maybe`
            );

            if (!progress) {
                progress = await storageFacade.put('db:/user_challenges', {
                    user_id: uid, challenge_id: challenge.id,
                    current_value: 0, is_completed: false
                });
                if (Array.isArray(progress)) progress = progress[0];
            }

            _cache.challenge = challenge;
            _cache.progress = progress;
            this._notify();
            return { challenge, progress, dayNumber };
        })();

        try {
            return await _fetchPromise;
        } catch (e) {
            console.error('🏆 [Challenge] fetchActive failed:', e.message);
            return null;
        } finally {
            _fetchPromise = null;
        }
    },

    /**
     * TICK: Increment challenge progress.
     * Called after every correct answer or matching event.
     * Android: UPDATE user_challenges SET current_value=? WHERE id=?
     */
    async tick(type, amount = 1) {
        try {
            if (!_cache.challenge) await this.fetchActive();
            const challenge = _cache.challenge;
            const progress = _cache.progress;
            if (!challenge || !progress) return;
            if (progress.is_completed) return;
            if (challenge.challenge_type !== type) return;

            const newValue = Math.min((progress.current_value || 0) + amount, challenge.target_value);

            const updated = await storageFacade.patch(`db:/user_challenges/${progress.id}`, {
                current_value: newValue,
                last_updated_at: new Date().toISOString()
            });

            _cache.progress = updated || { ..._cache.progress, current_value: newValue };

            if (newValue >= challenge.target_value) {
                await this.complete();
            } else {
                this._notify();
            }
            console.log(`🏆 [Challenge] Tick: ${type} → ${newValue}/${challenge.target_value}`);
        } catch (e) {
            console.warn('🏆 [Challenge] tick failed:', e.message);
        }
    },

    /**
     * COMPLETE: Mark challenge done and advance to next day.
     * Android:
     *   1. UPDATE user_challenges SET is_completed=1, completed_at=now() WHERE id=?
     *   2. UPDATE profiles SET challenge_day=challenge_day+1 WHERE id=uid
     *   3. Call syncService.updateBalance for the reward
     */
    async complete() {
        try {
            const uid = await syncService.getUserId();
            const progress = _cache.progress;
            const challenge = _cache.challenge;
            if (!uid || !progress || !challenge) return;

            // 1. Mark completed
            await storageFacade.patch(`db:/user_challenges/${progress.id}`, {
                is_completed: true, completed_at: new Date().toISOString()
            });

            // 2. Advance challenge_day
            await storageFacade.patch(`db:/profiles/${uid}`, {
                challenge_day: (challenge.day_number || 1) + 1
            });

            // 3. Award gems
            if (challenge.reward_value) {
                const subject = (challenge.subject || 'all').toLowerCase();
                const gemColumn = subject === 'all' ? 'gem_overall' : `gem_${subject}`;
                try {
                    await syncService.updateBalance(
                        gemColumn, challenge.reward_value,
                        'challenge_reward', `challenge_day_${challenge.day_number}`
                    );
                } catch (e) {
                    console.warn('⚠️ [Challenge] Economy sync failed:', e.message);
                }
            }

            _cache.progress = { ...progress, is_completed: true };
            this._notify();

            window.dispatchEvent(new CustomEvent('manya-challenge-completed', {
                detail: { challenge, reward: challenge.reward_value }
            }));

            console.log(`🏆 [Challenge] COMPLETED Day ${challenge.day_number}! +${challenge.reward_value} gems`);
            return { challenge, reward: challenge.reward_value };
        } catch (e) {
            console.error('🏆 [Challenge] complete failed:', e.message);
        }
    },

    getCached() { return { challenge: _cache.challenge, progress: _cache.progress }; },
    reset()     { _cache = { challenge: null, progress: null }; }
};

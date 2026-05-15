import { supabase } from '../../infrastructure/remote/supabaseClient.js';
import { syncService } from '../../infrastructure/sync/syncService.js';
// Removed store import to break circular dependency

/**
 * MANYA CHALLENGE SERVICE (v1.0)
 * ===============================
 * Manages the sequential daily challenge system.
 * 
 * Flow:
 *   1. fetchActive() → gets the user's current challenge based on challenge_day
 *   2. tick(type, amount) → increments current_value for matching challenge
 *   3. When current_value >= target_value → complete() fires
 */

// In-memory cache to avoid repeated DB calls per session
let _cache = {
    challenge: null,
    progress: null,
};
let _listeners = [];
let _fetchPromise = null;

export const challengeService = {

    /**
     * Subscribe to challenge state changes (for UI reactivity)
     */
    onChange(callback) {
        _listeners.push(callback);
        return () => {
            _listeners = _listeners.filter(l => l !== callback);
        };
    },

    _notify() {
        _listeners.forEach(fn => fn({
            challenge: _cache.challenge,
            progress: _cache.progress
        }));
    },

    async fetchActive(forceRefetch = false) {
        if (!forceRefetch && _cache.challenge && _cache.progress) {
            return { challenge: _cache.challenge, progress: _cache.progress };
        }

        if (_fetchPromise) return _fetchPromise;

        _fetchPromise = (async () => {
            const uid = await syncService.getUserId();
            if (!uid) return null;

            // 1. Get the user's current challenge_day from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('challenge_day')
                .eq('id', uid)
                .single();

            const dayNumber = profile?.challenge_day || 1;

            // 2. Fetch the challenge definition for this day
            const { data: challenge, error: cErr } = await supabase
                .from('challenges')
                .select('*')
                .eq('day_number', dayNumber)
                .single();

            if (cErr || !challenge) {
                console.warn('🏆 [Challenge] No challenge found for day', dayNumber);
                _cache.challenge = null;
                _cache.progress = null;
                return null;
            }

            // 3. Fetch or create user_challenges progress row
            let { data: progress } = await supabase
                .from('user_challenges')
                .select('*')
                .eq('user_id', uid)
                .eq('challenge_id', challenge.id)
                .maybeSingle();

            if (!progress) {
                // First time seeing this challenge — create progress row
                const { data: newProgress } = await supabase
                    .from('user_challenges')
                    .insert({
                        user_id: uid,
                        challenge_id: challenge.id,
                        current_value: 0,
                        is_completed: false
                    })
                    .select()
                    .single();
                progress = newProgress;
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
     * TICK: Increment progress for matching challenge types.
     * Called from userSlice.updateSessionAfterAnswer.
     * 
     * @param {string} type - e.g. 'CORRECT_ANSWERS', 'MATH_CORRECT'
     * @param {number} amount - how much to increment (usually 1)
     */
    async tick(type, amount = 1) {
        try {
            // Use cache if available, otherwise fetch
            if (!_cache.challenge) {
                await this.fetchActive();
            }

            const challenge = _cache.challenge;
            const progress = _cache.progress;

            if (!challenge || !progress) return;
            if (progress.is_completed) return; // Already done

            // Check if this tick matches the challenge type
            if (challenge.challenge_type !== type) return;

            // Increment
            const newValue = Math.min(
                (progress.current_value || 0) + amount,
                challenge.target_value
            );

            // Update in DB
            const { data: updated } = await supabase
                .from('user_challenges')
                .update({
                    current_value: newValue,
                    last_updated_at: new Date().toISOString()
                })
                .eq('id', progress.id)
                .select()
                .single();

            _cache.progress = updated;

            // Check completion
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
     * COMPLETE: Mark the current challenge as done and advance to next day.
     */
    async complete() {
        try {
            const uid = await syncService.getUserId();
            const progress = _cache.progress;
            const challenge = _cache.challenge;

            if (!uid || !progress || !challenge) return;

            // 1. Mark challenge completed
            await supabase
                .from('user_challenges')
                .update({
                    is_completed: true,
                    completed_at: new Date().toISOString()
                })
                .eq('id', progress.id);

            // 2. Advance challenge_day on profile
            await supabase
                .from('profiles')
                .update({
                    challenge_day: (challenge.day_number || 1) + 1
                })
                .eq('id', uid);

            // 3. Award the gems based on subject
            if (challenge.reward_value) {
                const subject = (challenge.subject || 'all').toLowerCase();
                const gemColumn = subject === 'all' ? 'gem_overall' : `gem_${subject}`;

                try {
                    await syncService.updateBalance(
                        gemColumn,
                        challenge.reward_value,
                        'challenge_reward',
                        `challenge_day_${challenge.day_number}`
                    );
                } catch (e) {
                    console.warn('⚠️ [Challenge] Cloud economy sync failed, but proceeding with local state update:', e.message);
                }
                
                // Note: Dispatching to Redux is now handled via the 'manya-challenge-completed' event
                // to avoid circular dependencies with the store.
            }

            // 4. Update cache
            _cache.progress = { ...progress, is_completed: true };
            this._notify();

            // 5. Notify Global App UI for Modal Interception
            window.dispatchEvent(new CustomEvent('manya-challenge-completed', {
                detail: { challenge, reward: challenge.reward_value }
            }));

            console.log(`🏆 [Challenge] COMPLETED Day ${challenge.day_number}! +${challenge.reward_value} gems`);
            return { challenge, reward: challenge.reward_value };
        } catch (e) {
            console.error('🏆 [Challenge] complete failed:', e.message);
        }
    },

    /**
     * Get cached state (for synchronous reads in components)
     */
    getCached() {
        return {
            challenge: _cache.challenge,
            progress: _cache.progress
        };
    },

    /**
     * Clear cache (on logout)
     */
    reset() {
        _cache = { challenge: null, progress: null, listeners: [] };
    }
};

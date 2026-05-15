import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { challengeService } from '../../domain/gamification/challengeService.js';
import { getGem } from '../../config/assetUrls.js';
import './ChallengesModal.css';

export default function ChallengesModal({ isOpen, onClose }) {
    const [state, setState] = useState({ challenge: null, progress: null });
    const [celebrating, setCelebrating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        challengeService.fetchActive().then(result => {
            if (result) setState({ challenge: result.challenge, progress: result.progress });
            setLoading(false);
        });
    }, [isOpen]);

    useEffect(() => {
        const unsub = challengeService.onChange(({ challenge, progress }) => {
            setState({ challenge, progress });
            if (progress?.is_completed && !celebrating) {
                setCelebrating(true);
                setTimeout(() => setCelebrating(false), 4000);
            }
        });
        return unsub;
    }, [celebrating]);

    const { challenge, progress } = state;
    const cur = progress?.current_value || 0;
    const target = challenge?.target_value || 1;
    const pct = Math.min(100, Math.round((cur / target) * 100));
    const isComplete = progress?.is_completed || false;
    const R = 46;
    const C = 2 * Math.PI * R;
    const offset = C - (pct / 100) * C;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="cm-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="cm-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button className="cm-x" onClick={onClose}><X size={16} /></button>

                        {loading ? (
                            <div className="cm-loading">
                                <div className="cm-spinner" />
                                <span>Loading...</span>
                            </div>
                        ) : !challenge ? (
                            <div className="cm-empty">
                                <Sparkles size={32} />
                                <h3>All Complete!</h3>
                                <p>You're a Manya Legend.</p>
                            </div>
                        ) : (
                            <>
                                {/* Celebration */}
                                <AnimatePresence>
                                    {celebrating && (
                                        <motion.div
                                            className="cm-celebrate"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <span className="cm-big-emoji">🎉</span>
                                            <h2>Challenge Complete!</h2>
                                            <p>+{challenge.reward_value} Gems earned</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Day label */}
                                <span className="cm-day">Day {challenge.day_number}</span>

                                {/* Ring */}
                                <div className="cm-ring">
                                    <svg width="100" height="100" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r={R} fill="none"
                                            stroke="hsla(330, 70%, 51%, 0.12)" strokeWidth="5" />
                                        <motion.circle cx="50" cy="50" r={R} fill="none"
                                            stroke="var(--manya-pink)" strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeDasharray={C}
                                            initial={{ strokeDashoffset: C }}
                                            animate={{ strokeDashoffset: offset }}
                                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                            transform="rotate(-90 50 50)"
                                        />
                                    </svg>
                                    <div className="cm-ring-text">
                                        <span className="cm-ring-num">{pct}</span>
                                        <span className="cm-ring-pct">%</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <h2 className="cm-title">{challenge.title}</h2>
                                <p className="cm-desc">{challenge.description}</p>

                                {/* Progress row */}
                                <div className="cm-progress-row">
                                    <div className="cm-bar-track">
                                        <motion.div
                                            className="cm-bar-fill"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                        />
                                    </div>
                                    <span className="cm-frac">{cur}/{target}</span>
                                </div>

                                {/* Reward */}
                                <div className="cm-reward">
                                    <span className="cm-reward-label">Reward</span>
                                    <span className="cm-reward-val">
                                        <img src={getGem(challenge.challenge_type || challenge.title)} className="cm-reward-gem-img" alt="gem" />
                                        {challenge.reward_value}
                                    </span>
                                </div>

                                {/* Status */}
                                {isComplete && (
                                    <div className="cm-done">
                                        <Check size={14} /> Next challenge unlocked
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

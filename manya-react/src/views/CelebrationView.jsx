import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Zap, Star, Sparkles, BookOpen, Layers, Trophy } from 'lucide-react';
import { Ribbon, WorldClassConfetti } from '../components/ui/CelebrationBling';
import { audioService } from '../infrastructure/audio/audioService';
import { getGem } from '../config/assetUrls';

const CoinCounter = ({ value }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = parseInt(value);
        if (start === end) return;
        const totalDuration = 1000;
        const increment = end / (totalDuration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else { setCount(Math.floor(start)); }
        }, 16);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{count}</span>;
};

const CharacterMap = {
    math: { name: 'Manya', image: '/assets/images/manya.png' },
    science: { name: 'Kiki', image: '/assets/images/kiki.png' },
    english: { name: 'Polly', image: '/assets/images/polly.png' },
    sst: { name: 'Zany', image: '/assets/images/zany.png' },
    default: { name: 'Manya', image: '/assets/images/manya.png' }
};

const MilestoneMessages = {
    science: {
        WARMUP: { title: 'Lab Initialized!', sub: 'Your scientific journey is underway.' },
        EXPLORE: { title: 'Discovery Made!', sub: 'You\'ve uncovered a new scientific truth.' },
        PRACTICE: { title: 'Data Validated!', sub: 'Your experimental accuracy is improving.' },
        REINFORCE: { title: 'Theory Confirmed!', sub: 'Your understanding of this concept is now ironclad.' },
        MASTERY: { title: 'Elite Researcher!', sub: 'You have mastered this scientific field!' }
    },
    math: {
        WARMUP: { title: 'Formula Ready!', sub: 'Starting your mathematical expedition.' },
        EXPLORE: { title: 'Theorem Unlocked!', sub: 'A new logical path has been revealed.' },
        PRACTICE: { title: 'Equation Solved!', sub: 'Persistent calculation leads to perfection.' },
        REINFORCE: { title: 'Math Legend!', sub: 'Your problem-solving skills are unstoppable.' },
        MASTERY: { title: 'Grand Architect!', sub: 'The numbers answer to you now.' }
    },
    english: {
        WARMUP: { title: 'Prologue Complete!', sub: 'Your literary adventure begins.' },
        EXPLORE: { title: 'Chapters Gathered!', sub: 'New narratives are coming together.' },
        PRACTICE: { title: 'Wordsmithing!', sub: 'Refining your craft, one word at a time.' },
        REINFORCE: { title: 'Literary Expert!', sub: 'Your command of language is truly impressive.' },
        MASTERY: { title: 'Master Storyteller!', sub: 'You have conquered this linguistic realm!' }
    }
};

const DefaultMilestones = {
    pass: { title: 'Victory!', sub: 'You reached the target like a pro.' },
    fail: { title: 'Keep Pushing!', sub: 'Success is just around the corner. Retry!' }
};

const CelebrationView = ({
    subject = 'default',
    nodeType = 'PRACTICE',
    mastery = 0,
    score = 0,
    total = 0,
    stars = 0,
    coinsEarned = 0,
    gemsEarned = 0,
    customTitle = null,
    customSub = null,
    onCollect
}) => {
    const char = CharacterMap[subject.toLowerCase()] || CharacterMap.default;
    const isPassing = mastery >= 60;

    const subjectMessages = MilestoneMessages[subject.toLowerCase()];
    const milestone = subjectMessages ? subjectMessages[nodeType.toUpperCase()] : null;

    const msg = {
        title: customTitle || (milestone ? milestone.title : (isPassing ? DefaultMilestones.pass.title : DefaultMilestones.fail.title)),
        sub: customSub || (milestone ? milestone.sub : (isPassing ? DefaultMilestones.pass.sub : DefaultMilestones.fail.sub))
    };

    const handleCollectClick = () => {
        if (coinsEarned > 0) {
            const coinSource = document.getElementById('celebration-coin-source');
            if (coinSource) {
                const rect = coinSource.getBoundingClientRect();
                // 🚀 TRIGGER GLOBAL MANYA FX SYSTEM
                window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                    detail: {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        type: 'coin',
                        amount: coinsEarned
                    }
                }));
            }
            // Small delay to let the particles start their journey before closing the modal
            setTimeout(onCollect, 800);
        } else {
            onCollect();
        }
    };

    useEffect(() => {
        if (isPassing) {
            audioService.playSFX('bass_drop');
            setTimeout(() => {
                if (nodeType?.toUpperCase() === 'MASTERY') audioService.playSFX('applause');
                else audioService.finish();
            }, 600); 
        } else {
            audioService.playSFX('challenge_woosh'); 
            setTimeout(() => audioService.error(), 400);
        }
    }, [isPassing, nodeType]);

    return (
        <div className={`celebration-arena-overlay ${!isPassing ? 'is-fail' : ''}`}>
            {isPassing && <WorldClassConfetti />}

            <motion.div
                className="celebration-card-container !py-8"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
            >
                <button className="celebration-close-x" onClick={handleCollectClick}>
                    <X size={20} strokeWidth={4} />
                </button>

                <div className="celebration-hero-blob !h-[120px] !w-[120px] !mb-0">
                    <motion.img
                        src={char.image}
                        alt={char.name}
                        className={`celebration-mascot-hero ${!isPassing ? 'grayscale opacity-60' : ''}`}
                        animate={isPassing ? { y: [0, -6, 0] } : { x: [-2, 2, -2] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                <Ribbon 
                    text={isPassing ? `${nodeType} COMPLETE` : `${nodeType} ATTEMPTED`} 
                    variant={isPassing ? 'success' : 'fail'} 
                />

                <h1 className="celebration-title-premium !text-2xl mt-2">{msg.title}</h1>
                <p className="celebration-subtext-premium !mb-4">{msg.sub}</p>

                <div className="premium-stats-list-celebration !my-6">
                    <div className="stat-chip-celebration">
                        <span className="label">QUEST STARS</span>
                        <div className="val flex gap-1 items-center justify-center">
                            {[1, 2, 3].map(s => (
                                <Star key={s} size={16} fill={s <= stars ? "#fbbf24" : "rgba(255,255,255,0.05)"} stroke={s <= stars ? "#fbbf24" : "rgba(255,255,255,0.1)"} />
                            ))}
                        </div>
                    </div>

                    <div className="stat-chip-celebration !border-x !border-white/5">
                        <span className="label">MASTERY</span>
                        <span className="val" style={{ color: mastery >= 75 ? '#fbbf24' : '#10b981' }}>{mastery}%</span>
                    </div>

                    <div className="stat-chip-celebration !border-x !border-white/5">
                        <span className="label">GEMS EARNED</span>
                        <div className="val flex items-center justify-center gap-1">
                            <span style={{ color: '#10b981' }}>{gemsEarned}</span>
                            <div className="w-3 h-3 bg-[#10b981] rotate-45 border border-[#065f46]" />
                        </div>
                    </div>

                    <div className="stat-chip-celebration">
                        <span className="label">COIN REWARD</span>
                        <div className="val flex items-center justify-center gap-1.5" style={{ color: '#fbbf24' }}>
                           <CoinCounter value={coinsEarned} />
                           <motion.div
                             id="celebration-coin-source"
                             animate={{ rotateY: [0, 360] }}
                             transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                           >
                              <div className="w-4 h-4 bg-amber-400 rounded-full border border-amber-600 shadow-[0_0_8px_#fbbf24]" />
                           </motion.div>
                        </div>
                    </div>
                </div>

                <button 
                    className={`btn-collect-3d !h-14 !max-w-[240px] ${!isPassing ? 'is-retry' : ''}`} 
                    onClick={handleCollectClick}
                >
                    <div className="btn-gloss-highlight" />
                    <span className="!text-sm">{isPassing ? 'COLLECT REWARDS' : 'BACK TO MAP'}</span>
                    <ArrowRight size={18} strokeWidth={3} />
                </button>
            </motion.div>
        </div>
    );
};

export default CelebrationView;

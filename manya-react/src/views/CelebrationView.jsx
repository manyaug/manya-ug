import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Zap, Star, Sparkles, BookOpen, Layers, Trophy } from 'lucide-react';
import { Ribbon, WorldClassConfetti } from '../components/ui/CelebrationBling';
import { audioService } from '../infrastructure/audio/audioService';
import { getGem } from '../config/assetUrls';
import PremiumChest from '../components/ui/PremiumChest';

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
    math: { name: 'Manya', image: '/assets/images/manya.png', color: '#7c3aed' },
    science: { name: 'Kiki', image: '/assets/images/kiki.png', color: '#10b981' },
    english: { name: 'Polly', image: '/assets/images/polly.png', color: '#818cf8' },
    sst: { name: 'Zany', image: '/assets/images/zany.png', color: '#fbbf24' },
    default: { name: 'Manya', image: '/assets/images/manya.png', color: '#7c3aed' }
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
    const gemIcon = getGem(subject.toLowerCase() === 'general' ? 'master' : subject.toLowerCase());
    
    const user = useSelector(state => state.user.data);
    const pendingChests = user?.pendingChests || [];
    const activeChest = pendingChests[0];
    const dispatch = useDispatch();

    const [isOpening, setIsOpening] = useState(false);
    const [openedRewards, setOpenedRewards] = useState(null);
    const [revealPhase, setRevealPhase] = useState('closed'); // closed | opening | revealed

    const subjectMessages = MilestoneMessages[subject.toLowerCase()];
    const milestone = subjectMessages ? subjectMessages[nodeType.toUpperCase()] : null;

    const msg = {
        title: customTitle || (milestone ? milestone.title : (isPassing ? DefaultMilestones.pass.title : DefaultMilestones.fail.title)),
        sub: customSub || (milestone ? milestone.sub : (isPassing ? DefaultMilestones.pass.sub : DefaultMilestones.fail.sub))
    };

    const handleOpenChest = async () => {
        if (!activeChest || isOpening) return;
        setIsOpening(true);
        setRevealPhase('opening');
        audioService.playSFX('chest_unlock');
        
        try {
            const result = await dispatch(openChestThunk({ chestId: activeChest.id })).unwrap();
            setTimeout(() => {
                setOpenedRewards(result.rewards);
                setRevealPhase('revealed');
                audioService.playSFX('epic');
                // Trigger FX flight for each reward
                result.rewards.forEach((r, idx) => {
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                            detail: {
                                x: window.innerWidth / 2,
                                y: window.innerHeight / 2,
                                type: r.currency === 'coins' ? 'coin' : 'gem',
                                amount: r.amount
                            }
                        }));
                    }, idx * 200);
                });
            }, 1000);
        } catch (e) {
            setIsOpening(false);
            setRevealPhase('closed');
        }
    };

    const handleCollectClick = () => {
        if (activeChest && revealPhase !== 'revealed') {
            handleOpenChest();
            return;
        }
        
        if (activeChest) {
            dispatch(dismissChest());
            if (pendingChests.length === 1) onCollect();
            return;
        }

        if (coinsEarned > 0) {
            const coinSource = document.getElementById('celebration-coin-source');
            if (coinSource) {
                const rect = coinSource.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                    detail: {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        type: 'coin',
                        amount: coinsEarned
                    }
                }));
            }
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
                className="celebration-card-container !py-10"
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
            >
                <button className="celebration-close-x" onClick={handleCollectClick}>
                    <X size={20} strokeWidth={4} />
                </button>

                {/*  Mascot Hero or Active Chest */}
                <div className="w-full flex items-center justify-center mb-6 relative min-h-[160px]">
                    <AnimatePresence mode="wait">
                        {activeChest ? (
                            <motion.div
                                key="chest"
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <PremiumChest 
                                    type={activeChest.chestType}
                                    phase={revealPhase === 'closed' ? 'closed' : revealPhase === 'opening' ? 'opening' : 'open'}
                                    onClick={handleOpenChest}
                                />
                            </motion.div>
                        ) : (
                            <motion.div key="mascot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <motion.img
                                    src={char.image}
                                    alt={char.name}
                                    className={`w-32 h-32 object-contain ${!isPassing ? 'grayscale opacity-60' : ''}`}
                                    animate={isPassing ? { y: [0, -10, 0] } : { x: [-2, 2, -2] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <Ribbon 
                    text={activeChest ? 'NEW LOOT EARNED!' : isPassing ? `${nodeType} COMPLETE` : `${nodeType} ATTEMPTED`} 
                    variant={isPassing ? 'success' : 'fail'} 
                />

                <div className="celebration-text-content px-6 mt-4">
                    <h1 className="celebration-title-premium !text-3xl mt-1">
                        {activeChest ? `${activeChest.chestType.toUpperCase()} CHEST` : msg.title}
                    </h1>
                    <p className="celebration-subtext-premium mb-2">
                        {activeChest ? activeChest.reason : msg.sub}
                    </p>
                </div>

                <div className="premium-stats-list-celebration !my-6 !px-4">
                    {activeChest && revealPhase === 'revealed' ? (
                        <div className="flex gap-4 justify-center w-full animate-in zoom-in duration-500">
                            {openedRewards.map((r, i) => (
                                <div key={i} className="stat-chip-celebration !flex-row gap-2">
                                    <img src={r.currency === 'coins' ? getGem('coin.svg') : gemIcon} className="w-5 h-5" />
                                    <span className="val" style={{ color: r.currency === 'coins' ? '#fbbf24' : '#10b981' }}>+{r.amount}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="stat-chip-celebration">
                                <span className="label">MASTERY</span>
                                <span className="val" style={{ color: mastery >= 75 ? '#fbbf24' : '#10b981' }}>{mastery}%</span>
                            </div>

                            <div className="stat-chip-celebration">
                                <span className="label">GEMS</span>
                                <div className="val flex items-center justify-center gap-1.5">
                                    <img src={gemIcon} alt="Gem" className="w-4 h-4 object-contain" />
                                    <span style={{ color: '#10b981' }}>+{gemsEarned}</span>
                                </div>
                            </div>

                            <div className="stat-chip-celebration">
                                <span className="label">COINS</span>
                                <div className="val flex items-center justify-center gap-1.5" style={{ color: '#fbbf24' }}>
                                <CoinCounter value={coinsEarned} />
                                <motion.div
                                    id="celebration-coin-source"
                                    animate={{ rotateY: [0, 360] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                >
                                    <div className="w-3.5 h-3.5 bg-amber-400 rounded-full border border-amber-600 shadow-[0_0_8px_#fbbf24]" />
                                </motion.div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-8 w-full">
                    <button 
                        className={`btn-collect-3d !h-14 w-full ${!isPassing ? 'is-retry' : ''}`} 
                        onClick={handleCollectClick}
                    >
                        <div className="btn-gloss-highlight" />
                        <span className="flex items-center justify-center gap-2">
                            {isPassing ? 'CLAIM REWARDS' : 'BACK TO MAP'}
                            <ArrowRight size={20} strokeWidth={3} />
                        </span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CelebrationView;

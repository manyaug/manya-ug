import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Zap, Star, Sparkles, BookOpen, Layers, Trophy } from 'lucide-react';
import { Ribbon, WorldClassConfetti } from '../components/ui/CelebrationBling';
import { audioService } from '../infrastructure/audio/audioService';

const CharacterMap = {
    math: { name: 'Manya', image: '/assets/images/manya.png' },
    science: { name: 'Kiki', image: '/assets/images/kiki.png' },
    english: { name: 'Polly', image: '/assets/images/polly.png' },
    sst: { name: 'Zany', image: '/assets/images/zany.png' },
    default: { name: 'Manya', image: '/assets/images/manya.png' }
};

const MilestoneMap = {
    WARMUP: {
        pass: { title: 'Adventure Begins!', sub: 'Your journey through the subject has started.', icon: Zap },
        fail: { title: 'Needs Warming!', sub: 'Don\'t worry, the gears are just getting started.', icon: Zap }
    },
    EXPLORE: {
        pass: { title: 'Knowledge Unlocked!', sub: 'You\'ve explored a new chapter of wisdom.', icon: BookOpen },
        fail: { title: 'Mystery Awaits!', sub: 'Some secrets are still hidden. Let\'s find them.', icon: BookOpen }
    },
    PRACTICE: {
        pass: { title: 'Skill Sharpened!', sub: 'Your practice is paying off. Keep it up!', icon: Layers },
        fail: { title: 'Forge Ahead!', sub: 'Every mistake is a lesson. Forge your skills!', icon: Layers }
    },
    REINFORCE: {
        pass: { title: 'Strong Foundations!', sub: 'Your understanding is becoming rock solid.', icon: Sparkles },
        fail: { title: 'Building Strength!', sub: 'Consistency is key to a powerful mind.', icon: Sparkles }
    },
    MASTERY: {
        pass: { title: 'Absolute Legend!', sub: 'You have mastered this quest completely!', icon: Trophy },
        fail: { title: 'Almost There!', sub: 'The final crown is within your reach. Retry!', icon: Trophy }
    },
    DEFAULT: {
        pass: { title: 'Congratulations!', sub: 'You just reached a new milestone!', icon: Star },
        fail: { title: 'Good Effort!', sub: 'Keep at it and you\'ll pass next time!', icon: Star }
    }
};



const CelebrationView = ({
    subject = 'default',
    nodeType = 'PRACTICE',
    mastery = 0,
    score = 0,
    total = 0,
    streak = 0,
    maxStreak = 0,
    gemsEarned = 0,
    customTitle = null,
    customSub = null,
    onCollect
}) => {
    const char = CharacterMap[subject.toLowerCase()] || CharacterMap.default;
    const isPassing = mastery >= 60;
    const milestone = MilestoneMap[nodeType.toUpperCase()] || MilestoneMap.DEFAULT;
    const msg = {
        title: customTitle || (isPassing ? milestone.pass.title : milestone.fail.title),
        sub: customSub || (isPassing ? milestone.pass.sub : milestone.fail.sub)
    };

    // Intelligent Audio Choreography
    useEffect(() => {
        if (isPassing) {
            audioService.playSFX('bass_drop');
            const isBossChest = nodeType?.toUpperCase() === 'MASTERY';
            
            setTimeout(() => {
                if (isBossChest) {
                    audioService.playSFX('applause');
                } else {
                    audioService.finish(); // Standard success jingle
                }
            }, 600); // More breathing room for the impact sound
        } else {
            audioService.playSFX('challenge_woosh'); 
            setTimeout(() => audioService.error(), 400);
        }
    }, [isPassing, nodeType]);

    return (
        <div className="celebration-arena-overlay">
            <WorldClassConfetti />

            <motion.div
                className="celebration-card-container !py-8"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
            >
                {/* Close Button */}
                <button className="celebration-close-x" onClick={onCollect}>
                    <X size={20} strokeWidth={4} />
                </button>

                {/* Hero Mascot */}
                <div className="celebration-hero-blob !h-[120px] !w-[120px] !mb-0">
                    <motion.img
                        src={char.image}
                        alt={char.name}
                        className="celebration-mascot-hero"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                {/* Badge Ribbon */}
                <Ribbon text={`${nodeType} COMPLETE`} />

                <h1 className="celebration-title-premium !text-2xl mt-2">{msg.title}</h1>
                <p className="celebration-subtext-premium !mb-4">{msg.sub}</p>

                {/* STATS AREA — Compacted */}
                <div className="premium-stats-list-celebration !my-4">
                    <div className="stat-chip-celebration">
                        <span className="label">SCORE</span>
                        <span className="val">{score}/{total}</span>
                    </div>
                    <div className="stat-chip-celebration">
                        <span className="label">MASTERY</span>
                        <span className="val" style={{ color: mastery >= 60 ? '#10b981' : '#f43f5e' }}>{mastery}%</span>
                    </div>
                    <div className="stat-chip-celebration">
                        <span className="label">GEMS</span>
                        <span className="val" style={{ color: '#22d3ee' }}>+{gemsEarned} ✨</span>
                    </div>
                </div>

                {/* Action Button */}
                <button className="btn-collect-3d !h-14 !max-w-[240px]" onClick={onCollect}>
                    <div className="btn-gloss-highlight" />
                    <span className="!text-sm">COLLECT REWARDS</span>
                    <ArrowRight size={18} strokeWidth={3} />
                </button>
            </motion.div>
        </div>
    );
};

export default CelebrationView;

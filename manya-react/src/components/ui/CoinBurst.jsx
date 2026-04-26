import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGem } from '../../config/assetUrls';

const CoinParticle = ({ startPos, endPos, delay, onComplete }) => {
    return (
        <motion.img
            src={getGem('coin.svg')}
            initial={{ 
                x: startPos.x - 10, 
                y: startPos.y - 10, 
                scale: 0.4, 
                opacity: 0,
                rotate: 0
            }}
            animate={{ 
                x: [startPos.x - 10, startPos.x + (Math.random() - 0.5) * 200, endPos.x - 10],
                y: [startPos.y - 10, startPos.y - 120, endPos.y - 10],
                scale: [0.4, 1.6, 0.8],
                opacity: [0, 1, 1, 0],
                rotate: [0, 1080]
            }}
            transition={{ 
                duration: 1.2, 
                delay: delay,
                ease: [0.16, 1, 0.3, 1] // Custom snappy cubic-bezier
            }}
            onAnimationComplete={onComplete}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 100000, // Absolute top
                pointerEvents: 'none',
                width: '20px',
                height: '20px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
            }}
        />
    );
};

export const CoinBurst = ({ trigger, onFinish }) => {
    const [particles, setParticles] = useState([]);
    const [sourcePos, setSourcePos] = useState({ x: 0, y: 0 });
    const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
    const isRunning = useRef(false);

    useEffect(() => {
        console.log("💎 [CoinBurst] Component Mounted.");
    }, []);

    useEffect(() => {
        if (trigger && !isRunning.current) {
            console.log("🚀 [CoinBurst] Initializing fly-up sequence...");
            isRunning.current = true;

            // Small delay to ensure DOM is ready and modal is stabilized
            const timer = setTimeout(() => {
                const sourceEl = document.getElementById('celebration-coin-source');
                const targetEl = document.getElementById('hud-coin-pill');

                if (sourceEl && targetEl) {
                    const sRect = sourceEl.getBoundingClientRect();
                    const tRect = targetEl.getBoundingClientRect();

                    console.log("✅ [CoinBurst] Target dimensions locked:", { sRect, tRect });

                    setSourcePos({ 
                        x: sRect.left + sRect.width / 2, 
                        y: sRect.top + sRect.height / 2 
                    });
                    setTargetPos({ 
                        x: tRect.left + tRect.width / 2, 
                        y: tRect.top + tRect.height / 2 
                    });

                    const count = 20; 
                    setParticles(Array.from({ length: count }).map((_, i) => ({
                        id: i,
                        delay: i * 0.03
                    })));
                } else {
                    console.error("❌ [CoinBurst] Critical Failure: Source/Target missing!", { source: !!sourceEl, target: !!targetEl });
                    onFinish();
                }
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [trigger, onFinish]);

    const handleParticleComplete = (id) => {
        if (id === 19) { // Last of 20
            console.log("🎊 [CoinBurst] Animation Complete!");
            setTimeout(() => {
                onFinish();
                window.dispatchEvent(new CustomEvent('manya-reward-arrived', { detail: { type: 'coin' } }));
            }, 100);
        }
    };

    return (
        <AnimatePresence>
            {particles.map(p => (
                <CoinParticle 
                    key={p.id}
                    startPos={sourcePos}
                    endPos={targetPos}
                    delay={p.delay}
                    onComplete={() => handleParticleComplete(p.id)}
                />
            ))}
        </AnimatePresence>
    );
};

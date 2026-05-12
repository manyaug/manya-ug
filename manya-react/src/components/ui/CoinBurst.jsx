import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGem, IMAGES } from '../../config/assetUrls';

const CoinParticle = ({ startPos, endPos, delay, onComplete }) => {
    return (
        <motion.div
            initial={{ 
                x: startPos.x - 20, 
                y: startPos.y - 20, 
                scale: 0, 
                opacity: 0,
                rotate: 0
            }}
            animate={{ 
                x: [startPos.x - 20, startPos.x + (Math.random() - 0.5) * 160, endPos.x - 20],
                y: [startPos.y - 20, startPos.y - 140, endPos.y - 20],
                scale: [0.5, 2.2, 1.2],
                opacity: [0, 1, 1, 0],
                rotate: [0, 720]
            }}
            transition={{ 
                duration: 0.9, 
                delay: delay,
                ease: [0.23, 1, 0.32, 1] 
            }}
            onAnimationComplete={onComplete}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999999, 
                pointerEvents: 'none',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div className="relative w-8 h-8">
                {/* CORE GLOW */}
                <div className="absolute inset-[-10px] bg-amber-400/40 rounded-full blur-xl animate-pulse" />
                
                {/* IMAGE COIN */}
                <img src={getGem('coin.svg')} alt="coin" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />
            </div>
        </motion.div>
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

                    const sPos = { 
                        x: sRect.left + sRect.width / 2, 
                        y: sRect.top + sRect.height / 2 
                    };
                    const tPos = { 
                        x: tRect.left + tRect.width / 2, 
                        y: tRect.top + tRect.height / 2 
                    };

                    console.log("✅ [CoinBurst] Coordinates:", { from: sPos, to: tPos });

                    setSourcePos(sPos);
                    setTargetPos(tPos);

                    const count = 25; 
                    setParticles(Array.from({ length: count }).map((_, i) => ({
                        id: i,
                        delay: i * 0.02
                    })));
                } else {
                    console.error("❌ [CoinBurst] Critical Failure: Source/Target missing!", { source: !!sourceEl, target: !!targetEl });
                    onFinish();
                }
            }, 80);

            return () => clearTimeout(timer);
        }
    }, [trigger, onFinish]);

    const handleParticleComplete = (id) => {
        if (id === 24) { // Last of 25
            console.log("🎊 [CoinBurst] Final Particle Landed!");
            setTimeout(() => {
                onFinish();
                window.dispatchEvent(new CustomEvent('manya-reward-arrived', { detail: { type: 'coin' } }));
            }, 50);
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

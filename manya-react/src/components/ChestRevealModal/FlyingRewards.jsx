import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES, getGem } from '../../config/assetUrls';

export default function FlyingRewards({ rewards, isCollecting, onComplete }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (isCollecting && rewards?.length) {
            const newParticles = [];
            rewards.forEach((r, rIdx) => {
                for (let i = 0; i < 15; i++) {
                    newParticles.push({
                        id: `${rIdx}-${i}`,
                        type: r.type,
                        subject: r.subject,
                        x: Math.random() * 200 - 100, // random start offset
                        y: Math.random() * 200 - 100,
                        delay: Math.random() * 0.5,
                        duration: 0.8 + Math.random() * 0.5
                    });
                }
            });
            setParticles(newParticles);

            const timer = setTimeout(onComplete, 1500);
            return () => clearTimeout(timer);
        }
    }, [isCollecting, rewards, onComplete]);

    if (!isCollecting) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[2000]">
            <AnimatePresence>
                {particles.map(p => (
                    <motion.img
                        key={p.id}
                        src={p.type === 'coins' ? IMAGES.coin_gem : getGem(p.subject || 'master')}
                        className="absolute w-8 h-8 object-contain"
                        initial={{ 
                            left: '50%', 
                            top: '50%', 
                            scale: 0,
                            x: p.x,
                            y: p.y,
                            opacity: 0
                        }}
                        animate={{ 
                            left: '85%', // Fly towards top right (where HUD counters usually are)
                            top: '5%',
                            scale: [0, 1.2, 0.5],
                            x: 0,
                            y: 0,
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{ 
                            duration: p.duration,
                            delay: p.delay,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

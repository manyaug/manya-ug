/**
 * MANYA ACHIEVEMENT UNLOCKED — Premium Animation Component
 * =========================================================
 * Full-screen celebration overlay when a badge is earned.
 * Features: particle burst, glow ring, icon zoom, and staggered text reveal.
 */

import React, { useState, useEffect, useRef } from 'react';

// ── PARTICLE SYSTEM ─────────────────────────────────────────────────────────

const PARTICLE_COUNT = 40;
const COLORS = ['#FFD700', '#FF6B35', '#00D4FF', '#A855F7', '#34D399', '#F472B6', '#FBBF24'];

function generateParticles() {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50 + (Math.random() - 0.5) * 10,
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 30,
        distance: 120 + Math.random() * 180,
        size: 3 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.3,
        shape: Math.random() > 0.5 ? 'circle' : 'square',
        rotation: Math.random() * 360,
    }));
}

// ── COMPONENT ───────────────────────────────────────────────────────────────

const AchievementUnlocked = ({ achievements = [], onDismiss }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState('enter'); // enter → show → exit
    const [particles] = useState(generateParticles);
    const timerRef = useRef(null);

    const current = achievements[currentIndex];

    useEffect(() => {
        if (!current) return;

        // Phase timeline
        setPhase('enter');
        const t1 = setTimeout(() => setPhase('show'), 100);
        const t2 = setTimeout(() => setPhase('exit'), 3800);
        const t3 = setTimeout(() => {
            if (currentIndex < achievements.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setPhase('enter');
            } else {
                onDismiss?.();
            }
        }, 4400);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [currentIndex, current]);

    if (!current) return null;

    const subjectColor = {
        math: { primary: '#A855F7', glow: 'rgba(168,85,247,0.4)', bg: 'rgba(88,28,135,0.95)' },
        science: { primary: '#34D399', glow: 'rgba(52,211,153,0.4)', bg: 'rgba(6,78,59,0.95)' },
        sst: { primary: '#FBBF24', glow: 'rgba(251,191,36,0.4)', bg: 'rgba(120,53,15,0.95)' },
        english: { primary: '#60A5FA', glow: 'rgba(96,165,250,0.4)', bg: 'rgba(30,58,138,0.95)' },
    }[current.subject] || { primary: '#FFD700', glow: 'rgba(255,215,0,0.4)', bg: 'rgba(40,40,40,0.95)' };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: phase === 'show' ? subjectColor.bg : 'rgba(0,0,0,0)',
            backdropFilter: phase === 'show' ? 'blur(20px)' : 'blur(0px)',
            transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            pointerEvents: phase === 'exit' ? 'none' : 'auto',
            opacity: phase === 'exit' ? 0 : 1,
        }} onClick={onDismiss}>

            {/* ── PARTICLES ── */}
            {phase === 'show' && particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: `${p.x}%`, top: `${p.y}%`,
                    width: p.size, height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.shape === 'circle' ? '50%' : '2px',
                    transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                    animation: `achieveParticle 1.2s ${p.delay}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    opacity: 0,
                    '--angle': `${p.angle}deg`,
                    '--distance': `${p.distance}px`,
                }} />
            ))}

            {/* ── GLOW RING ── */}
            <div style={{
                position: 'absolute',
                width: phase === 'show' ? 280 : 0,
                height: phase === 'show' ? 280 : 0,
                borderRadius: '50%',
                border: `3px solid ${subjectColor.primary}`,
                boxShadow: `0 0 60px ${subjectColor.glow}, inset 0 0 60px ${subjectColor.glow}`,
                transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: phase === 'show' ? 0.6 : 0,
                animation: phase === 'show' ? 'achieveRingPulse 2s ease-in-out infinite' : 'none',
            }} />

            {/* ── MAIN CONTENT ── */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, zIndex: 2, padding: '40px 32px',
                transform: phase === 'show' ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(40px)',
                opacity: phase === 'show' ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>

                {/* ── LABEL ── */}
                <div style={{
                    fontSize: 11, fontWeight: 900, letterSpacing: 6,
                    textTransform: 'uppercase', color: subjectColor.primary,
                    opacity: phase === 'show' ? 1 : 0,
                    transform: phase === 'show' ? 'translateY(0)' : 'translateY(-10px)',
                    transition: 'all 0.4s 0.3s ease',
                    textShadow: `0 0 20px ${subjectColor.glow}`,
                }}>
                    ACHIEVEMENT UNLOCKED
                </div>

                {/* ── ICON ── */}
                <div style={{
                    fontSize: 72, lineHeight: 1,
                    filter: `drop-shadow(0 0 30px ${subjectColor.glow})`,
                    animation: phase === 'show' ? 'achieveIconBounce 0.6s 0.2s cubic-bezier(0.22, 1, 0.36, 1) both' : 'none',
                }}>
                    {current.icon}
                </div>

                {/* ── NAME ── */}
                <div style={{
                    fontSize: 28, fontWeight: 900, color: '#fff',
                    textAlign: 'center', lineHeight: 1.2,
                    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                    opacity: phase === 'show' ? 1 : 0,
                    transform: phase === 'show' ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s 0.4s ease',
                }}>
                    {current.name}
                </div>

                {/* ── DESCRIPTION ── */}
                <div style={{
                    fontSize: 14, color: 'rgba(255,255,255,0.7)',
                    textAlign: 'center', maxWidth: 260,
                    opacity: phase === 'show' ? 1 : 0,
                    transform: phase === 'show' ? 'translateY(0)' : 'translateY(15px)',
                    transition: 'all 0.5s 0.6s ease',
                }}>
                    {current.desc}
                </div>

                {/* ── PROGRESS ── */}
                {achievements.length > 1 && (
                    <div style={{
                        display: 'flex', gap: 6, marginTop: 8,
                        opacity: phase === 'show' ? 1 : 0,
                        transition: 'opacity 0.4s 0.8s ease',
                    }}>
                        {achievements.map((_, i) => (
                            <div key={i} style={{
                                width: 8, height: 8, borderRadius: '50%',
                                backgroundColor: i <= currentIndex ? subjectColor.primary : 'rgba(255,255,255,0.2)',
                                transition: 'background-color 0.3s ease',
                            }} />
                        ))}
                    </div>
                )}

                {/* ── TAP HINT ── */}
                <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    marginTop: 20,
                    opacity: phase === 'show' ? 1 : 0,
                    transition: 'opacity 0.4s 1s ease',
                }}>
                    Tap anywhere to continue
                </div>
            </div>

            {/* ── CSS KEYFRAMES ── */}
            <style>{`
                @keyframes achieveParticle {
                    0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) translateX(0); }
                    100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)); }
                }
                @keyframes achieveRingPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.08); opacity: 0.7; }
                }
                @keyframes achieveIconBounce {
                    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
                    60% { transform: scale(1.3) rotate(5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AchievementUnlocked;

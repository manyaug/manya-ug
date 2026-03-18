import React, { useState, useEffect, useRef } from 'react';

export default function WaterCycleSim({ onComplete, onScoreUpdate }) {
    const [sunIntensity, setSunIntensity] = useState(50);
    const [windSpeed, setWindSpeed] = useState(20);

    const canvasRef = useRef(null);
    const requestRef = useRef();

    // Internal simulation state (not reactive to avoid re-renders and stale closures)
    const state = useRef({
        sunIntensity: 50,
        windSpeed: 20,
        evaporation: [],
        rain: [],
        clouds: [
            { x: 100, y: 100, saturation: 0, scale: 1, isRaining: false },
            { x: 400, y: 80, saturation: 0.3, scale: 0.8, isRaining: false },
            { x: 650, y: 120, saturation: 0.1, scale: 1.1, isRaining: false }
        ],
        lastTime: 0
    });

    // Sync React state to Ref for the animation loop
    useEffect(() => {
        state.current.sunIntensity = sunIntensity;
        state.current.windSpeed = windSpeed;
    }, [sunIntensity, windSpeed]);

    const animate = (time) => {
        if (!state.current.lastTime) state.current.lastTime = time;

        // BUG FIX 1: Cap the delta-time (dt) at 0.05. 
        // This prevents physics from exploding if the user leaves the app and comes back.
        const dt = Math.min((time - state.current.lastTime) / 1000, 0.05);
        state.current.lastTime = time;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 800, 500);

        const currentSun = state.current.sunIntensity;
        const currentWind = state.current.windSpeed;

        // --- RULE A: EVAPORATION ---
        if (currentSun > 20 && Math.random() < currentSun / 100) {
            state.current.evaporation.push({
                x: 150 + Math.random() * 500,
                y: 450,
                size: 2 + Math.random() * 4,
                vy: - (20 + (currentSun / 2)),
                opacity: 0.8
            });
        }

        // Draw Annotations
        ctx.font = 'bold 12px italic system-ui';
        ctx.textAlign = 'center';
        
        if (currentSun > 40) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, (currentSun - 40) / 100)})`;
            ctx.fillText("EVAPORATION", 400, 350);
        }

        // --- RULE D: WIND & CLOUD MOVEMENT ---
        const windX = (currentWind / 50) * 100 * dt;
        state.current.clouds.forEach(c => {
            c.x += windX;
            if (c.x > 900) c.x = -100;
            if (c.x < -100) c.x = 900;
        });

        // Update Evaporation particles
        state.current.evaporation = state.current.evaporation.filter(p => {
            p.y += p.vy * dt;
            p.opacity -= 0.15 * dt;

            // --- RULE B: CONDENSATION (Formation) ---
            if (p.y < 160) {
                const cloud = state.current.clouds.sort((a, b) =>
                    Math.abs(a.x - p.x) - Math.abs(b.x - p.x)
                )[0];
                if (cloud && Math.abs(cloud.x - p.x) < 120) {
                    cloud.saturation = Math.min(cloud.saturation + 0.008, 1.5);
                    cloud.scale = 0.8 + (cloud.saturation * 0.6);
                }
                return false;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.fill();
            return p.opacity > 0;
        });

        // --- RULE C: PRECIPITATION ---
        let anyRain = false;
        state.current.clouds.forEach(c => {
            // Condensation Label
            if (c.saturation > 0.3 && c.saturation < 0.8) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillText("CONDENSATION", c.x, c.y - 50);
            }

            if (c.saturation > 0.7) c.isRaining = true;

            if (c.isRaining) {
                anyRain = true;
                if (Math.random() < 0.6) {
                    state.current.rain.push({
                        x: c.x + (Math.random() * 100 * c.scale - 50 * c.scale),
                        y: c.y + 20,
                        dx: (currentWind / 100) * 8, 
                        dy: 400 + Math.random() * 100
                    });
                }
                c.saturation = Math.max(0, c.saturation - 0.005 * dt * 25); 
                c.scale = 0.8 + (c.saturation * 0.6);
                if (c.saturation < 0.15) c.isRaining = false;
            }

            const gray = Math.max(80, 255 - (c.saturation * 180));
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;

            ctx.beginPath();
            ctx.arc(c.x, c.y, 40 * c.scale, 0, Math.PI * 2);
            ctx.arc(c.x + 35 * c.scale, c.y - 10 * c.scale, 30 * c.scale, 0, Math.PI * 2);
            ctx.arc(c.x - 35 * c.scale, c.y - 5 * c.scale, 25 * c.scale, 0, Math.PI * 2);
            ctx.fill();
        });

        if (anyRain) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.fillText("PRECIPITATION", 400, 250);
        }

        // Update Rain particles
        state.current.rain = state.current.rain.filter(p => {
            p.y += p.dy * dt;
            p.x += p.dx;

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.dx * 1.5, p.y + 10);
            ctx.stroke();

            return p.y < 450;
        });

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []); // Run only once

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
            
            {/* VIEWPORT (TOP) - HYBRID LAYER */}
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-100/50 min-h-0" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* 
                  THE STAGE: Bulletproof Inline Stacking.
                  We use explicit inline styles because external utility classes may fail.
                  The SVG defines natural height, Canvas absolutely perfectly overlays it.
                */}
                <div 
                    className="shadow-2xl rounded-2xl bg-sky-100 border-4 border-white"
                    style={{ position: 'relative', width: '100%', maxWidth: '800px', overflow: 'hidden' }}
                >
                    {/* SVG LAYER: RELATIVE BLOCK (Gives layout height) */}
                    <svg 
                        viewBox="0 0 800 500" 
                        style={{ display: 'block', width: '100%', height: 'auto', position: 'relative', zIndex: 1 }}
                    >
                        <rect x="0" y="0" width="800" height="500" fill="#bae6fd" />
                        
                        {/* Sun with Intensity Glow */}
                        <circle 
                            cx="700" cy="80" 
                            r={30 + (sunIntensity / 5)} 
                            fill="#fde047"
                            style={{ 
                                filter: `blur(${sunIntensity / 10}px)`, 
                                opacity: 0.3 + (sunIntensity / 100) * 0.7 
                            }}
                        />
                        <circle cx="700" cy="80" r="15" fill="#facc15" />
                        
                        {/* Mountains */}
                        <path d="M-50 500 L200 250 L450 500 Z" fill="#92400e" />
                        <path d="M300 500 L550 300 L850 500 Z" fill="#78350f" />
                        
                        {/* Water Line */}
                        <rect x="0" y="440" width="800" height="60" fill="#3b82f6" opacity="0.9" />
                    </svg>

                    {/* CANVAS LAYER: ABSOLUTE OVERLAY */}
                    <canvas 
                        ref={canvasRef}
                        width={800} height={500}
                        style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%', 
                            pointerEvents: 'none',
                            zIndex: 2 
                        }}
                    />

                    {/* Floating Labels (Still inside grid-stack for containment) */}
                    <div style={{ gridArea: '1/1' }} className="relative pointer-events-none z-20">
                         <div className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-white shadow-lg transition-transform hover:scale-105">
                            <h3 className="text-[10px] font-black text-[#7c3aed] uppercase tracking-tighter italic flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Hybrid Engine 2.1
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Physics Optimized</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROL PANEL (BOTTOM UI) */}
            <div className="p-6 bg-white flex flex-col gap-6 md:flex-row md:items-center border-t border-slate-100">
                <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest">
                            <label>☀️ SUN INTENSITY</label>
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded italic">{sunIntensity}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" 
                            value={sunIntensity} 
                            onChange={(e) => setSunIntensity(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest">
                            <label>💨 WIND SPEED</label>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded italic">{windSpeed}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" 
                            value={windSpeed} 
                            onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                        />
                    </div>
                </div>

                <div className="pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8">
                    <button 
                        onClick={() => {
                            onScoreUpdate?.(100);
                            onComplete?.();
                        }}
                        className="w-full md:w-auto px-10 py-4 bg-[#7c3aed] text-white rounded-2xl font-black text-xs tracking-[0.1em] shadow-xl shadow-[#7c3aed]/20 hover:-translate-y-1 active:scale-95 transition-all uppercase italic"
                    >
                        Mastery Achieved
                    </button>
                </div>
            </div>
        </div>
    );
}
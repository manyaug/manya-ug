import React, { useState, useEffect, useRef } from 'react';

// Decoupled Resources
import { initializeWaterState, updatePhysics } from '../../engines/science/WaterCycle/WaterLogic';
import WaterRenderer from '../../engines/science/WaterCycle/WaterRenderer';

/**
 * MANYA WATER CYCLE SIMULATION v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates atmospheric physics from Canvas rendering.
 */

export default function WaterCycleSim({ onComplete, onScoreUpdate }) {
    const [sunIntensity, setSunIntensity] = useState(50);
    const [windSpeed, setWindSpeed] = useState(20);
    const [isRaining, setIsRaining] = useState(false);

    const canvasRef = useRef(null);
    const requestRef = useRef();
    const state = useRef(initializeWaterState());

    // 1. Sync React state to Physics engine
    useEffect(() => {
        state.current.sunIntensity = sunIntensity;
        state.current.windSpeed = windSpeed;
    }, [sunIntensity, windSpeed]);

    // 2. Main Simulation Loop
    const animate = (time) => {
        if (!state.current.lastTime) state.current.lastTime = time;
        const dt = Math.min((time - state.current.lastTime) / 1000, 0.05);
        state.current.lastTime = time;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 800, 500);

        // --- Core Physics Engine Call ---
        const rainingNow = updatePhysics(state.current, dt, sunIntensity, windSpeed);
        setIsRaining(rainingNow);

        // --- Drawing Logic (Optimized) ---
        // A. Draw Condensed Clouds
        state.current.clouds.forEach(c => {
            const gray = Math.max(80, 255 - (c.saturation * 180));
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 40 * c.scale, 0, Math.PI * 2);
            ctx.arc(c.x + 35 * c.scale, c.y - 10 * c.scale, 30 * c.scale, 0, Math.PI * 2);
            ctx.arc(c.x - 35 * c.scale, c.y - 5 * c.scale, 25 * c.scale, 0, Math.PI * 2);
            ctx.fill();
        });

        // B. Draw Rain Particles
        state.current.rain.forEach(p => {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.dx * 1.5, p.y + 10);
            ctx.stroke();
        });

        // C. Draw Evaporation Particles
        state.current.evaporation.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.fill();
        });

        // D. Floating Labels
        ctx.font = 'bold 12px italic system-ui';
        ctx.textAlign = 'center';
        if (sunIntensity > 40) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, (sunIntensity - 40) / 100)})`;
            ctx.fillText("EVAPORATION", 400, 350);
        }
        if (rainingNow) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.fillText("PRECIPITATION", 400, 250);
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
            <WaterRenderer canvasRef={canvasRef} sunIntensity={sunIntensity} />

            {/* CONTROL PANEL */}
            <div className="p-6 bg-white flex flex-col gap-6 md:flex-row md:items-center border-t border-slate-100 pb-safe">
                <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                            <label>☀️ SUN INTENSITY</label>
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded italic">{sunIntensity}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={sunIntensity} onChange={(e) => setSunIntensity(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#f59e0b]" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                            <label>💨 WIND SPEED</label>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded italic">{windSpeed}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={windSpeed} onChange={(e) => setWindSpeed(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]" />
                    </div>
                </div>

                <div className="md:border-l md:pl-8 border-slate-100">
                    <button 
                        onClick={() => { onScoreUpdate?.(100); onComplete?.(); }}
                        className="w-full md:w-auto px-10 py-4 bg-[#7c3aed] text-white rounded-2xl font-black text-xs tracking-widest shadow-xl hover:-translate-y-1 active:scale-95 transition-all uppercase italic"
                    >
                        Mastery Achieved
                    </button>
                </div>
            </div>
        </div>
    );
}
import React, { useState, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/**
 * PostureSim - Interactive SVG-based simulation for spine alignment.
 * Part of Quest 12: Posture and Teeth.
 */
export default function PostureSim({ onComplete, onScoreUpdate }) {
    const [neckTilt, setNeckTilt] = useState(0);
    const [shoulderSlouch, setShoulderSlouch] = useState(0);

    // Calculate stress metrics
    const stressScore = useMemo(() => {
        // Weighted stress: Neck tilt is often more detrimental to "text neck"
        return (neckTilt * 60) + (shoulderSlouch * 40);
    }, [neckTilt, shoulderSlouch]);

    const isHealthy = stressScore < 30;
    const isWarning = stressScore >= 30 && stressScore < 70;
    const isDanger = stressScore >= 70;

    // Spine Path Logic (Bezier Curve)
    // Base points for a neutral spine
    const spinePath = useMemo(() => {
        const startX = 400;
        const startY = 450; // Pelvis
        
        // Lumbar (Fixed-ish base)
        const lX = 400;
        const lY = 380;

        // Thoracic (Shoulder influence)
        const tX = 400 + (shoulderSlouch * 40);
        const tY = 300;

        // Cervical (Neck influence)
        const cX = tX + (neckTilt * 60);
        const cY = 220;

        // Head center
        const hX = cX + (neckTilt * 30);
        const hY = 160;

        return {
            path: `M ${startX} ${startY} Q 390 ${startY - 40}, ${lX} ${lY} T ${tX} ${tY} T ${cX} ${cY}`,
            head: { x: hX, y: hY },
            neck: { x: cX, y: cY },
            shoulder: { x: tX, y: tY }
        };
    }, [neckTilt, shoulderSlouch]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
            {/* VIEWPORT */}
            <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-100/50 overflow-hidden min-h-0">
                <div className="relative w-full max-w-[800px] aspect-[16/10] shadow-2xl rounded-2xl overflow-hidden bg-white border-4 border-slate-200">
                    
                    <svg viewBox="0 0 800 500" className="w-full h-full">
                        {/* Background Grid */}
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="800" height="500" fill="url(#grid)" />

                        {/* Title Overlay */}
                        <text x="40" y="50" className="text-[14px] font-black fill-slate-800 uppercase tracking-tighter">Postural Alignment Lab</text>
                        <text x="40" y="70" className="text-[10px] font-bold fill-slate-400 uppercase tracking-widest italic">Digital Spine Analysis</text>

                        {/* Character Silhouette (Simple side profile) */}
                        <g opacity="0.1">
                            <path 
                                d={`M 350 480 L 450 480 L 450 450 Q 460 350, ${spinePath.shoulder.x + 50} 300 Q ${spinePath.neck.x + 40} 220, ${spinePath.head.x + 40} 180 Q ${spinePath.head.x} 100, ${spinePath.head.x - 50} 180 Q ${spinePath.neck.x - 40} 220, ${spinePath.shoulder.x - 60} 300 Q 340 350, 350 450 Z`}
                                fill="#64748b"
                            />
                        </g>

                        {/* The Spine Visual */}
                        <path 
                            d={spinePath.path} 
                            fill="none" 
                            stroke={isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981"} 
                            strokeWidth="12" 
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                        />

                        {/* Vertebrae details (dots) */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
                            <circle 
                                key={i}
                                cx={400 + (spinePath.shoulder.x - 400) * t}
                                cy={450 - (450 - spinePath.shoulder.y) * t}
                                r="4"
                                fill="white"
                                opacity="0.5"
                            />
                        ))}

                        {/* Shoulder Joint Indicator */}
                        <circle 
                            cx={spinePath.shoulder.x} 
                            cy={spinePath.shoulder.y} 
                            r={12 + shoulderSlouch * 5} 
                            fill={isDanger ? "#fee2e2" : "#f1f5f9"} 
                            stroke={isDanger ? "#ef4444" : "#cbd5e1"} 
                            strokeWidth="3"
                        />
                        <text x={spinePath.shoulder.x + 25} y={spinePath.shoulder.y + 5} className="text-[9px] font-black fill-slate-400 uppercase">Thoracic T1-T12</text>

                        {/* Neck/Head Connector */}
                        <line 
                            x1={spinePath.shoulder.x} y1={spinePath.shoulder.y} 
                            x2={spinePath.neck.x} y2={spinePath.neck.y} 
                            stroke={isDanger ? "#ef4444" : "#94a3b8"} 
                            strokeWidth="8" 
                            strokeDasharray="4,4"
                        />

                        {/* Head Visual */}
                        <g transform={`translate(${spinePath.head.x}, ${spinePath.head.y})`}>
                            <circle r="45" fill="white" stroke={isDanger ? "#ef4444" : "#cbd5e1"} strokeWidth="4" />
                            {/* Eye (looking left as side profile) */}
                            <circle cx="-15" cy="-10" r="4" fill="#1e293b" />
                            <path d="M -25 15 Q -10 25, 5 15" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                        </g>
                        <text x={spinePath.head.x + 55} y={spinePath.head.y} className="text-[9px] font-black fill-slate-400 uppercase tracking-tighter">Cervical Spine (C1-C7)</text>

                        {/* Force Indicators */}
                        {neckTilt > 0.3 && (
                            <g transform={`translate(${spinePath.neck.x + 20}, ${spinePath.neck.y - 20})`}>
                                <path d="M 0 0 L 20 -20 M 20 -20 L 15 -20 M 20 -20 L 20 -15" stroke="#ef4444" strokeWidth="2" fill="none" />
                                <text x="25" y="-15" className="text-[10px] fill-red-500 font-bold">Neck Strain</text>
                            </g>
                        )}
                    </svg>

                    {/* DYNAMIC HUD */}
                    <div className="absolute top-6 right-6 flex flex-col items-end gap-3 pointer-events-none">
                        <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all shadow-lg ${
                            isHealthy ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                            isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                            'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            {isHealthy ? <CheckCircle2 size={18} /> : isWarning ? <AlertTriangle size={18} /> : <AlertTriangle size={18} />}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Posterior Health</span>
                                <span className="text-sm font-black">{isHealthy ? 'OPIMAL' : isWarning ? 'COMPROMISED' : 'DESTRUCTIVE'}</span>
                            </div>
                        </div>

                        <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border border-slate-200 shadow-xl w-48 transition-all">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Spine Load</span>
                                <span className={`text-lg font-black ${isDanger ? 'text-red-500' : 'text-slate-800'}`}>{Math.round(stressScore)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${isHealthy ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${stressScore}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* LEARNING TOOLTIP */}
                    <div className="absolute bottom-6 left-6 max-w-xs group">
                        <div className="flex items-start gap-3 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 shadow-sm transition-all hover:bg-white group-hover:shadow-lg">
                            <Info size={20} className="text-[#7c3aed] mt-0.5" />
                            <div>
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Anatomy Insight</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                                    Every inch the head tilts forward adds <span className="font-bold text-red-500">10 lbs</span> of pressure to the cervical spine.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="p-8 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
                    
                    {/* Neck Slider */}
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Neck Alignment (C-Spine)</label>
                            <span className="text-[10px] font-black text-[#7c3aed] uppercase underline underline-offset-4 decoration-2">Tilt {Math.round(neckTilt * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={neckTilt}
                            onChange={(e) => setNeckTilt(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7c3aed] hover:accent-[#6d28d9] transition-all"
                        />
                        <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase italic">
                            <span>Upright</span>
                            <span>Text Neck</span>
                        </div>
                    </div>

                    {/* Shoulder Slider */}
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Shoulder Position (T-Spine)</label>
                            <span className="text-[10px] font-black text-[#7c3aed] uppercase underline underline-offset-4 decoration-2">Slouch {Math.round(shoulderSlouch * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={shoulderSlouch}
                            onChange={(e) => setShoulderSlouch(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7c3aed] hover:accent-[#6d28d9] transition-all"
                        />
                         <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase italic">
                            <span>Roll Back</span>
                            <span>Hunchback</span>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => {
                            if (isHealthy) {
                                onScoreUpdate(100);
                                onComplete();
                            } else {
                                alert("Achieve optimal upright posture to master this quest!");
                            }
                        }}
                        className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group ${
                            isHealthy 
                            ? 'bg-[#7c3aed] text-white shadow-xl shadow-[#7c3aed]/30 hover:-translate-y-1' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                    >
                        {isHealthy ? (
                            <>
                                Mastery Achieved
                                <Activity size={14} className="animate-pulse" />
                            </>
                        ) : (
                            'Correct Posture First'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

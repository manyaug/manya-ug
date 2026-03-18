import React, { useState, useEffect, useRef } from 'react';

export default function MuscleSim({ onComplete, onScoreUpdate }) {
    const canvasRef = useRef(null);
    const [flexion, setFlexion] = useState(0.2);

    const stateRef = useRef({
        flexion: 0.2,
        target: 0.2
    });

    // Dimensions calibrated safely for 800x600 canvas
    const shoulder = { x: 300, y: 150 };
    const humerusLength = 180;
    const forearmLength = 170;
    const elbowAngleBase = Math.PI / 3.2;

    const drawRealisticMuscle = (ctx, origin, insertion, flex, isBiceps, side) => {
        const midX = (origin.x + insertion.x) / 2;
        const midY = (origin.y + insertion.y) / 2;
        const dx = insertion.x - origin.x;
        const dy = insertion.y - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        const isActive = (isBiceps && flex > 0.5) || (!isBiceps && flex < 0.5);
        const bulge = isBiceps ? 25 + flex * 50 : 20 + (1 - flex) * 45;

        const cpX = midX + nx * bulge * 1.4 * side;
        const cpY = midY + ny * bulge * 1.4 * side;

        // Tendons
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(insertion.x, insertion.y);
        ctx.stroke();

        // Muscle Belly
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.quadraticCurveTo(cpX, cpY, insertion.x, insertion.y);
        const innerCpX = midX + nx * (bulge * 0.1) * side;
        const innerCpY = midY + ny * (bulge * 0.1) * side;
        ctx.quadraticCurveTo(innerCpX, innerCpY, origin.x, origin.y);

        const grad = ctx.createLinearGradient(origin.x, origin.y, insertion.x, insertion.y);
        grad.addColorStop(0, '#7f1d1d');
        grad.addColorStop(0.5, isActive ? (isBiceps ? '#ef4444' : '#a78bfa') : '#991b1b');
        grad.addColorStop(1, '#7f1d1d');

        ctx.fillStyle = grad;
        ctx.fill();

        // Fibers
        ctx.save();
        ctx.clip();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        for (let i = -bulge; i < bulge; i += 6) {
            ctx.moveTo(origin.x, origin.y);
            ctx.quadraticCurveTo(midX + nx * i * side, midY + ny * i * side, insertion.x, insertion.y);
        }
        ctx.stroke();
        ctx.restore();
    };

    const drawAnatomy = (ctx, flex) => {
        const elbowX = shoulder.x + humerusLength * Math.cos(elbowAngleBase);
        const elbowY = shoulder.y + humerusLength * Math.sin(elbowAngleBase);

        const dx = elbowX - shoulder.x;
        const dy = elbowY - shoulder.y;
        const boneLen = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / boneLen;
        const ny = dx / boneLen;

        const rotation = flex * (Math.PI / 1.75);
        const wristX = elbowX + forearmLength * Math.cos(elbowAngleBase - rotation);
        const wristY = elbowY + forearmLength * Math.sin(elbowAngleBase - rotation);

        // Biceps
        const bOrigin = { x: shoulder.x - nx * 15, y: shoulder.y - ny * 15 };
        const forearmAngle = elbowAngleBase - rotation;
        const insertionDist = 65;
        const bInsertion = {
            x: elbowX - nx * 12 + insertionDist * Math.cos(forearmAngle),
            y: elbowY - ny * 12 + insertionDist * Math.sin(forearmAngle)
        };
        drawRealisticMuscle(ctx, bOrigin, bInsertion, flex, true, -1);

        // Triceps
        const tOrigin = { x: shoulder.x + nx * 20, y: shoulder.y + ny * 20 };
        const tInsertion = { x: elbowX + nx * 22, y: elbowY + ny * 22 };
        drawRealisticMuscle(ctx, tOrigin, tInsertion, flex, false, 1);

        // Bones (Tuned Light Orange)
        ctx.strokeStyle = '#ffedd5';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.05)';

        // Humerus
        ctx.lineWidth = 50;
        ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(elbowX, elbowY); ctx.stroke();

        // Forearm
        ctx.lineWidth = 40;
        ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(wristX, wristY); ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath(); ctx.arc(shoulder.x, shoulder.y, 45, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(elbowX, elbowY, 35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wristX, wristY, 20, 0, Math.PI * 2); ctx.fill();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId;
        const animate = () => {
            stateRef.current.flexion += (stateRef.current.target - stateRef.current.flexion) * 0.15;
            const f = stateRef.current.flexion;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Subtle background grid
            ctx.save();
            ctx.globalAlpha = 0.05;
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            for (let x = 0; x < canvas.width; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }
            ctx.restore();

            drawAnatomy(ctx, f);
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const isFlexed = flexion > 0.6;
    const isExtended = flexion < 0.4;

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-full bg-slate-50 p-4 md:p-8 space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Antagonistic Muscles</h2>
                <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
                    Muscles work in pairs! When one muscle <span className="text-red-500 font-bold">Pulls (Contracts)</span>, the opposite muscle <span className="text-indigo-500 font-bold">Relaxes (Extends)</span>.
                </p>
            </div>

            {/* Status Badges (Mobile Only) */}
            <div className="flex md:hidden gap-3 w-full">
                <div className={`flex-1 px-4 py-3 rounded-2xl border-2 transition-all ${isFlexed ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-50 opacity-60'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-tight ${isFlexed ? 'text-red-500' : 'text-slate-400'}`}>Biceps</h3>
                    <p className={`text-[9px] font-bold ${isFlexed ? 'text-red-400' : 'text-slate-300'}`}>
                        {isFlexed ? '🔥 Pulling' : '✨ Relaxed'}
                    </p>
                </div>
                <div className={`flex-1 px-4 py-3 rounded-2xl border-2 transition-all ${isExtended ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-50 opacity-60'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-tight ${isExtended ? 'text-indigo-500' : 'text-slate-400'}`}>Triceps</h3>
                    <p className={`text-[9px] font-bold ${isExtended ? 'text-indigo-400' : 'text-slate-300'}`}>
                        {isExtended ? '🔥 Pulling' : '✨ Relaxed'}
                    </p>
                </div>
            </div>

            {/* Stage */}
            <div className="relative w-full aspect-[4/3] md:aspect-video bg-sky-50/50 rounded-3xl shadow-xl border-4 border-slate-100 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={800} height={600}
                    className="w-full h-full object-cover md:object-contain"
                />

                {/* Floating Kid-Friendly Badges (Desktop Only) */}
                <div className="hidden md:flex absolute top-8 left-8 flex-col gap-3">
                    <div className={`px-6 py-4 rounded-2xl shadow-lg border-2 transition-all ${isFlexed ? 'bg-red-50 border-red-200 scale-105' : 'bg-white border-slate-100 opacity-80'}`}>
                        <h3 className={`text-lg font-black uppercase ${isFlexed ? 'text-red-500' : 'text-slate-400'}`}>Biceps</h3>
                        <p className={`text-sm font-bold ${isFlexed ? 'text-red-400' : 'text-slate-300'}`}>
                            {isFlexed ? '🔥 Pulling (Contracted)' : '✨ Relaxed'}
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex absolute bottom-8 right-8 flex-col gap-3">
                    <div className={`px-6 py-4 rounded-2xl shadow-lg border-2 transition-all ${isExtended ? 'bg-indigo-50 border-indigo-200 scale-105' : 'bg-white border-slate-100 opacity-80'}`}>
                        <h3 className={`text-lg font-black uppercase ${isExtended ? 'text-indigo-500' : 'text-slate-400'}`}>Triceps</h3>
                        <p className={`text-sm font-bold ${isExtended ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {isExtended ? '🔥 Pulling (Contracted)' : '✨ Relaxed'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">Straight Arm</span>
                        <span className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">Flexed Arm</span>
                    </div>
                    
                    <input
                        type="range" min="0" max="1" step="0.01" value={flexion}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            stateRef.current.target = val;
                            setFlexion(val);
                            if (val > 0.8 || val < 0.2) {
                                onScoreUpdate?.(2);
                            }
                        }}
                        className="w-full h-8 md:h-12 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                <button
                    onClick={() => { onScoreUpdate?.(100); onComplete?.(); }}
                    className="w-full py-5 md:py-6 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl font-black text-sm md:text-lg uppercase tracking-widest shadow-xl shadow-[#7c3aed]/20 transition-all active:scale-95"
                >
                    I Understand Muscle Pairs!
                </button>
            </div>
        </div>
    );
}

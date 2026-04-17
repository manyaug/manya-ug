import React, { useState, useEffect, useRef } from 'react';

// Decoupled Resources
import { SHOULDER, HUMERUS_LENGTH, FOREARM_LENGTH, ELBOW_ANGLE_BASE, calculateKinematics, getMuscleActivation, calculateMuscleScoring } from '../../engines/science/MuscleSim/MuscleLogic';
import MuscleRenderer from '../../engines/science/MuscleSim/MuscleRenderer';

/**
 * MANYA MUSCLE SIMULATION v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates biological kinematics from Canvas rendering.
 */

export default function MuscleSim({ onComplete, onScoreUpdate }) {
    const canvasRef = useRef(null);
    const [flexion, setFlexion] = useState(0.2);
    const stateRef = useRef({ flexion: 0.2, target: 0.2 });
    const startTimeRef = useRef(Date.now());

    // --- Drawing Helper (Muscle) ---
    const drawMuscle = (ctx, origin, insertion, flex, isBiceps, side) => {
        const { isActive, bulge } = getMuscleActivation(flex, isBiceps);
        const midX = (origin.x + insertion.x) / 2;
        const midY = (origin.y + insertion.y) / 2;
        const dx = insertion.x - origin.x;
        const dy = insertion.y - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        const cpX = midX + nx * bulge * 1.4 * side;
        const cpY = midY + ny * bulge * 1.4 * side;

        // Tendon
        ctx.beginPath(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.moveTo(origin.x, origin.y); ctx.lineTo(insertion.x, insertion.y); ctx.stroke();

        // Muscle Belly
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y);
        ctx.quadraticCurveTo(cpX, cpY, insertion.x, insertion.y);
        const innerCpX = midX + nx * (bulge * 0.1) * side;
        const innerCpY = midY + ny * (bulge * 0.1) * side;
        ctx.quadraticCurveTo(innerCpX, innerCpY, origin.x, origin.y);

        const grad = ctx.createLinearGradient(origin.x, origin.y, insertion.x, insertion.y);
        grad.addColorStop(0, '#7f1d1d');
        grad.addColorStop(0.5, isActive ? (isBiceps ? '#ef4444' : '#a78bfa') : '#991b1b');
        grad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = grad; ctx.fill();

        // Fiber detail
        ctx.save(); ctx.clip(); ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
        for (let i = -bulge; i < bulge; i += 6) {
            ctx.moveTo(origin.x, origin.y);
            ctx.quadraticCurveTo(midX + nx * i * side, midY + ny * i * side, insertion.x, insertion.y);
        }
        ctx.stroke(); ctx.restore();
    };

    // --- Main Simulation Loop ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let frameId;
        const animate = () => {
            stateRef.current.flexion += (stateRef.current.target - stateRef.current.flexion) * 0.15;
            const f = stateRef.current.flexion;
            ctx.clearRect(0, 0, 800, 600);

            // Anatomy calculations
            const { elbow, wrist, rotation } = calculateKinematics(f);
            const boneLen = Math.sqrt((elbow.x - SHOULDER.x)**2 + (elbow.y - SHOULDER.y)**2);
            const nx = -(elbow.y - SHOULDER.y) / boneLen;
            const ny = (elbow.x - SHOULDER.x) / boneLen;

            // Render Muscles
            const bOrigin = { x: SHOULDER.x - nx * 15, y: SHOULDER.y - ny * 15 };
            const bInsertion = { x: elbow.x - nx * 12 + 65 * Math.cos(ELBOW_ANGLE_BASE - rotation), y: elbow.y - ny * 12 + 65 * Math.sin(ELBOW_ANGLE_BASE - rotation) };
            drawMuscle(ctx, bOrigin, bInsertion, f, true, -1);

            const tOrigin = { x: SHOULDER.x + nx * 20, y: SHOULDER.y + ny * 20 };
            const tInsertion = { x: elbow.x + nx * 22, y: elbow.y + ny * 22 };
            drawMuscle(ctx, tOrigin, tInsertion, f, false, 1);

            // Render Bones
            ctx.strokeStyle = '#ffedd5'; ctx.lineCap = 'round'; ctx.lineWidth = 50;
            ctx.beginPath(); ctx.moveTo(SHOULDER.x, SHOULDER.y); ctx.lineTo(elbow.x, elbow.y); ctx.stroke();
            ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(elbow.x, elbow.y); ctx.lineTo(wrist.x, wrist.y); ctx.stroke();

            // Joints
            ctx.fillStyle = '#ffedd5';
            ctx.beginPath(); ctx.arc(SHOULDER.x, SHOULDER.y, 45, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(elbow.x, elbow.y, 35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(wrist.x, wrist.y, 20, 0, Math.PI * 2); ctx.fill();

            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const handleFinish = () => {
        const result = calculateMuscleScoring(flexion, startTimeRef.current);
        onScoreUpdate?.(100);
        onComplete?.(result);
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-full bg-slate-50 p-4 md:p-8 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Antagonistic Muscles</h2>
                <p className="text-sm md:text-base text-slate-500 font-medium">Muscles work in pairs! When one muscle <span className="text-red-500 font-bold">Pulls</span>, the other <span className="text-indigo-500 font-bold">Relaxes</span>.</p>
            </div>

            <MuscleRenderer canvasRef={canvasRef} isFlexed={flexion > 0.6} isExtended={flexion < 0.4} />

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 space-y-6">
                <input type="range" min="0" max="1" step="0.01" value={flexion} onChange={(e) => { const val = parseFloat(e.target.value); stateRef.current.target = val; setFlexion(val); }} className="w-full h-8 md:h-12 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                <button onClick={handleFinish} className="w-full py-5 bg-[#7c3aed] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">I Understand Muscle Pairs!</button>
            </div>
        </div>
    );
}

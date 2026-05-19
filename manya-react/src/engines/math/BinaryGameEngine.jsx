import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, AlertTriangle, Minus, Plus } from 'lucide-react';

// Decoupled Resources
import { calculatePower, validatePower, getElectronMapping, calculateScoring } from './BinaryPower/BinaryLogic';
import BinaryRenderer from './BinaryPower/BinaryRenderer';

/**
 * MANYA BINARY POWER GENERATOR v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates exponential math from orbital rendering.
 */

export default function BinaryGameEngine({ data, onComplete, onResult }) {
    // v9.9: Aggressive Extraction (Search root, data, and questions sub-layers)
    const root = data?.questions?.[0] || data?.data?.questions?.[0] || data?.data || data;
    const target = root?.targetVal || root?.target || 16;
    const prompt = root?.prompt || "Generate the target power!";

    const [n, setN] = useState(0);
    const [isResolved, setIsResolved] = useState(false);
    const [isError, setIsError] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        onResult?.({
            score: 0,
            total: 1,
            type: 'pulse'
        });
    }, [onResult]);

    const modify = (delta) => {
        if (isResolved) return;
        setN(prev => Math.max(0, Math.min(8, prev + delta)));
        audioService.tap?.();
    };

    const check = () => {
        if (isResolved) return;
        
        const isCorrect = validatePower(n, target);
        const result = calculateScoring(isCorrect, mistakes, startTimeRef.current);

        if (isCorrect) {
            setIsResolved(true);
            audioService.success?.();
            if (onResult) onResult(result);
            setTimeout(() => { if (onComplete) onComplete(result); }, 2500);
        } else {
            setIsError(true);
            setMistakes(prev => prev + 1);
            audioService.error?.();
            setTimeout(() => setIsError(false), 1000);
        }
    };

    const currentPower = calculatePower(n);
    const coreSize = 40 + (n * 3);

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative selection:bg-transparent text-slate-100">
            <BinaryRenderer 
                n={n} 
                isResolved={isResolved} 
                isError={isError} 
                coreSize={coreSize} 
                getElectronMapping={getElectronMapping} 
            />

            {/* CONTROL PANEL HUD */}
            <div className="flex-none bg-slate-800 border-t border-slate-700 p-5 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-20 pb-safe">
                <div className="text-center font-bold text-slate-300 mb-4 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: prompt }} />
                
                {/* Screen */}
                <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 flex justify-between items-center mb-5 shadow-inner">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Elements (n)</span>
                        <span className="font-mono text-3xl font-bold text-slate-200">{n}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subsets (2ⁿ)</span>
                        <span className="font-mono text-4xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">{currentPower}</span>
                    </div>
                </div>

                <div className="flex gap-3 mb-4">
                    <button onClick={() => modify(-1)} disabled={isResolved || n <= 0} className="flex-1 py-4 bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-2xl flex items-center justify-center shadow-[0_4px_0_#334155] active:translate-y-[4px] active:shadow-none"><Minus size={24} /></button>
                    <button onClick={() => modify(1)} disabled={isResolved || n >= 8} className="flex-1 py-4 bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-2xl flex items-center justify-center shadow-[0_4px_0_#334155] active:translate-y-[4px] active:shadow-none"><Plus size={24} /></button>
                </div>

                <motion.button
                    onClick={check} disabled={isResolved}
                    animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                    className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 text-[15px] tracking-wide uppercase transition-all ${
                        isResolved ? 'bg-emerald-500 text-white' :
                        isError ? 'bg-rose-500 text-white' : 'bg-violet-600 text-white shadow-[0_4px_0_#4c1d95] active:translate-y-[4px] active:shadow-none'
                    }`}
                >
                    {isResolved ? <><CheckCircle2 size={20} /> STABLE</> : isError ? <><AlertTriangle size={20} /> MISMATCH</> : <><Zap size={20} /> IGNITE</>}
                </motion.button>
            </div>
        </div>
    );
}

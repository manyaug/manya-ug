import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { calculateUSP } from '../../domain/scoring/scoringUtility.js';
import { getEngineType } from './SSTLogic';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';

/**
 * SST SIMULATOR BRIDGE v6.0 (Standardized)
 * ───────────────────────────────────────────────────
 * - SEAMLESS: Uses AnimatePresence for visual continuity.
 * - REGISTRY-BASED: Uses global mapping instead of hardcoded switches.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt, subject = 'sst' }) => {
    const simData = step?.data || step;
    
    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white">
            <AlertCircle size={40} className="mb-4" />
            Asset Missing
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    const rawEngine = getEngineType(step);
    const engineMeta = ENGINE_REGISTRY[rawEngine];

    if (!engineMeta || engineMeta.type !== 'react') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-white">
                <Puzzle size={40} className="mb-4 opacity-20" />
                <p className="font-bold tracking-tight">Unsupported: {rawEngine}</p>
                <button onClick={onComplete} className="mt-4 text-[10px] bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest">Continue Quest</button>
            </div>
        );
    }

    const EngineComponent = engineMeta.component;

    return (
        <div className="flex-1 flex flex-col h-full min-h-[80vh] bg-white overflow-hidden relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id || step.qid}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                >
                    <Suspense fallback={
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Entering {rawEngine}...</p>
                        </div>
                    }>
                        <EngineComponent 
                            data={simData} 
                            onComplete={(res) => {
                                const usp = calculateUSP({
                                    accuracy: res?.accuracy ?? (res?.score && res?.total ? (res.score / res.total) : 1.0),
                                    mistakes: res?.mistakes || 0,
                                    timeSpentMs: res?.duration || res?.timeSpentMs || 30000,
                                    engineType: rawEngine
                                }, subject);

                                onComplete({ 
                                    success: true, 
                                    score: usp.masteryScore,
                                    usp: usp,
                                    simResults: res 
                                });
                            }}
                            onResult={(res) => console.debug(`📊 [Bridge] ${rawEngine} update:`, res)}
                            onAttempt={onAttempt}
                        />
                    </Suspense>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default SimulatorBridge;

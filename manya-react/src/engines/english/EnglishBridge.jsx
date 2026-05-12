import React, { Suspense, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, AlertCircle } from 'lucide-react';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';
import { audioService } from '../../infrastructure/audio/audioService.js';

class EngineErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Game Engine Crash:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-white">
                    <AlertCircle size={40} className="mb-4 text-rose-500" />
                    <p className="font-bold text-center">This activity encountered a technical issue.</p>
                    <button onClick={() => this.props.onSkip?.()} className="mt-6 text-xs bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Skip Activity</button>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * ENGLISH SIMULATOR BRIDGE v2.0
 * --------------------------------------------------
 * Standardized wrapper for English simulations with seamless transitions.
 * Supports "Gamified" celebrations to provide variant gratification.
 */
const EnglishBridge = ({ step, onComplete, onResult, onAttempt, nodeType, onSimSuccess, onSimWrong }) => {
    // --- REMOVED INTERNAL OVERLAYS (Now using global InteractionFeedback) ---
    const simData = step?.data || step;
    
    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white">
            <AlertCircle size={40} className="mb-4" />
            Story Asset Missing
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip to Next Step</button>
        </div>
    );

    let engineType = (step.engine_type || step.engineType || simData.engine_type || simData.engineType || simData.type || 'CHAT').toUpperCase();
    const itemType = (step.item_type || simData.item_type || "").toUpperCase();
    
    // --- 🔮 PEDAGOGICAL ROUTING (Smarter Logic) ---
    const hasRules = Array.isArray(simData.rules) && simData.rules.length > 0;
    
    // 1. Force RULE_MASTER only if we actually HAVE rules
    if ((engineType.includes('RULE_MASTER') || itemType === 'GRAMMAR' || itemType === 'NOTE') && hasRules) {
        engineType = 'ENGLISH_RULE_MASTER';
    } 
    // 2. Default narrative assets to CHAT (even if they were tagged as NOTE)
    else if (engineType === 'CHAT' || itemType === 'NOTE' || itemType === 'QUEST_STORY' || itemType === 'GRAMMAR') {
        engineType = 'CHAT';
    }
    
    // 3. Specialty Game Engines
    if (engineType.includes('WORDGRID')) engineType = 'WORDGRID_ENGINE';
    if (engineType.includes('HARVEST')) engineType = 'HARVEST_GAME';
    if (engineType === 'SENTENCE_BLOCKS' || engineType === 'SYNTAX_ARCHITECT') engineType = 'SENTENCE_BLOCKS';
    if (engineType === 'GARDEN_GUARD' || engineType === 'GRAMMAR_GUARD') engineType = 'GARDEN_GUARD';
    if (engineType === 'PUNCTUATION_STICKERS') engineType = 'PUNCTUATION_STICKERS';
    if (engineType === 'TENSE_TREEHOUSE') engineType = 'TENSE_TREEHOUSE';

    const engineMeta = ENGINE_REGISTRY[engineType];

    if (!engineMeta || engineMeta.type !== 'react') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-white">
                <Puzzle size={40} className="mb-4 opacity-20" />
                <p className="font-bold tracking-tight">Unsupported Activity: {engineType}</p>
                <button onClick={onComplete} className="mt-4 text-xs bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase">Continue Quest</button>
            </div>
        );
    }

    const EngineComponent = engineMeta.component;
    const isNarrative = engineType === 'CHAT' || nodeType === 'EXPLORE' || itemType === 'QUEST' || itemType === 'QUEST_STORY';

    const handleEngineComplete = useCallback((res) => {
        const isWin = res?.isCorrect ?? (res?.accuracy !== undefined ? res.accuracy > 0.5 : true);
        
        if (isWin) {
            audioService.victory?.();
            window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'english' } }));
        } else {
            audioService.error?.();
            window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'english' } }));
        }

        // Auto-advance after 1.5s to keep it snappy like an MCQ
        setTimeout(() => {
            onComplete({ 
                success: isWin, 
                score: res?.score ?? 100, 
                accuracy: res?.accuracy ?? 1,
                simResults: res 
            });
        }, 1500);
    }, [onComplete]);

    const handleCollect = null; // Removed as we skip the celebration screen

    const handleResult = useCallback((res) => {
        onResult?.(res);
        console.debug(`📊 [Bridge] ${engineType} update:`, res);
    }, [onResult, engineType]);

    return (
        <div className={`flex-1 flex flex-col h-full min-h-0 ${isNarrative ? 'bg-slate-950' : 'bg-white'} relative`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id || step.qid}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex-1 flex flex-col min-h-0"
                >
                    {/* Global celebrations are handled by InteractionFeedback in the App root */}

                    <Suspense fallback={
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entering {engineType}...</p>
                        </div>
                    }>
                        <EngineErrorBoundary onSkip={onComplete}>
                            <EngineComponent 
                                data={simData} 
                                onSimSuccess={() => {
                                    window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'english' } }));
                                }}
                                onSimWrong={() => {
                                    window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'english' } }));
                                }}
                                onComplete={handleEngineComplete}
                                onResult={handleResult}
                                onAttempt={onAttempt}
                            />
                        </EngineErrorBoundary>
                    {console.debug(`🔌 [Bridge] Injecting into ${engineType}:`, simData)}
                    </Suspense>
                </motion.div>
            </AnimatePresence>

            {/* Celebration View Removed as per request for snappier transitions */}
        </div>
    );
};

export default EnglishBridge;

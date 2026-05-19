import React, { Suspense, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, AlertCircle } from 'lucide-react';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { feedbackService } from '../../application/feedbackService';

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
    const engineUpper = engineType.toUpperCase();
    if (engineUpper.includes('WORDGRID')) engineType = 'WORDGRID_ENGINE';
    else if (engineUpper.includes('HARVEST')) engineType = 'HARVEST_GAME';
    else if (engineUpper.includes('SENTENCE_TRAIN')) engineType = 'SENTENCE_TRAIN';
    else if (engineUpper.includes('HANGMAN')) engineType = 'HANGMAN_ENGINE';
    else if (engineUpper.includes('MEMORY_MATCH')) engineType = 'MEMORY_MATCH';
    else if (engineUpper.includes('MORPH_GAME')) engineType = 'MORPH_GAME';
    else if (engineUpper.includes('GRAMMAR_MAZE')) engineType = 'GRAMMAR_MAZE';
    else if (engineUpper.includes('DEEP_READER')) engineType = 'DEEP_READER';
    else if (engineUpper.includes('FUNCTIONAL_COMPOSER')) engineType = 'FUNCTIONAL_COMPOSER';
    else if (engineUpper === 'SYNTAX_ARCHITECT' || engineUpper === 'SYNTAX_ENGINE') engineType = 'SYNTAX_ENGINE';
    else if (engineUpper === 'SENTENCE_BLOCKS') engineType = 'SENTENCE_BLOCKS';
    else if (engineUpper === 'GARDEN_GUARD' || engineUpper === 'GRAMMAR_GUARD') engineType = 'GARDEN_GUARD';
    else if (engineUpper === 'PUNCTUATION_STICKERS' || engineUpper === 'PUNCTUATION_PORTAL') engineType = 'PUNCTUATION_STICKERS';
    else if (engineUpper === 'TENSE_TREEHOUSE') engineType = 'TENSE_TREEHOUSE';
    else if (engineUpper === 'ENGLISH_RULE_MASTER') engineType = 'ENGLISH_RULE_MASTER';

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
            feedbackService.triggerCorrect('english', { type: 'simulation' });
        } else {
            feedbackService.triggerWrong('english');
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

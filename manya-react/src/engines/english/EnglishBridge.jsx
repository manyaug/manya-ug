import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, AlertCircle } from 'lucide-react';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';

/**
 * ENGLISH SIMULATOR BRIDGE
 * Standardized wrapper for English simulations with seamless transitions.
 */
const EnglishBridge = ({ step, onComplete, onAttempt, nodeType }) => {
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
    
    // Pedagogical Routing
    if (engineType.includes('RULE_MASTER') || itemType === 'GRAMMAR' || itemType === 'NOTE') engineType = 'ENGLISH_RULE_MASTER';
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

    return (
        <div className={`flex-1 flex flex-col h-full min-h-[80vh] ${isNarrative ? 'bg-slate-950' : 'bg-white'}`}>
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
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entering {engineType}...</p>
                        </div>
                    }>
                        <EngineComponent 
                            data={simData} 
                            onComplete={(res) => {
                                onComplete({ 
                                    success: res?.isCorrect ?? true, 
                                    score: res?.score ?? 100, 
                                    accuracy: res?.accuracy ?? 1,
                                    simResults: res 
                                });
                            }}
                            onResult={(res) => console.debug(`📊 [Bridge] ${engineType} update:`, res)}
                            onAttempt={onAttempt}
                        />
                    </Suspense>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default EnglishBridge;

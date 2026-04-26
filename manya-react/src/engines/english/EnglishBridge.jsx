import React, { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, AlertCircle } from 'lucide-react';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';
import CelebrationView from '../../views/CelebrationView.jsx';
import SimSuccessOverlay from '../../components/ui/SimSuccessOverlay';
import SimWrongOverlay from '../../components/ui/SimWrongOverlay';

/**
 * ENGLISH SIMULATOR BRIDGE v2.0
 * --------------------------------------------------
 * Standardized wrapper for English simulations with seamless transitions.
 * Supports "Gamified" celebrations to provide variant gratification.
 */
const EnglishBridge = ({ step, onComplete, onResult, onAttempt, nodeType, onSimSuccess, onSimWrong }) => {
    const [celebData, setCelebData] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWrong, setShowWrong] = useState(false);
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

    const handleEngineComplete = (res) => {
        if (engineMeta.isGamified) {
            setCelebData({
                mastery: res?.accuracy !== undefined ? res.accuracy * 100 : 100,
                score: res?.score || 100,
                total: res?.total || 100,
                gems: res?.gemsEarned || 20,
                label: engineMeta.label || 'Activity'
            });
        } else {
            onComplete({ 
                success: res?.isCorrect ?? true, 
                score: res?.score ?? 100, 
                accuracy: res?.accuracy ?? 1,
                simResults: res 
            });
        }
    };

    const handleCollect = () => {
        onComplete({ 
            success: true, 
            score: celebData.score, 
            accuracy: celebData.mastery / 100,
            simResults: celebData 
        });
        setCelebData(null);
    };

    return (
        <div className={`flex-1 flex flex-col h-full min-h-[80vh] ${isNarrative ? 'bg-slate-950' : 'bg-white'} relative`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id || step.qid}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                >
                    {/* Global Sim Success Overlay */}
                    <SimSuccessOverlay 
                        show={showSuccess} 
                        subject="english" 
                        onDismiss={() => setShowSuccess(false)} 
                    />

                    {/* Global Sim Wrong Overlay */}
                    <SimWrongOverlay 
                        show={showWrong} 
                        onDismiss={() => setShowWrong(false)} 
                    />

                    <Suspense fallback={
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entering {engineType}...</p>
                        </div>
                    }>
                        <EngineComponent 
                            data={simData} 
                            onSimSuccess={() => setShowSuccess(true)}
                            onSimWrong={() => {
                                setShowWrong(true);
                                setShowSuccess(false);
                            }}
                            onComplete={handleEngineComplete}
                            onResult={(res) => {
                                onResult?.(res);
                                console.debug(`📊 [Bridge] ${engineType} update:`, res);
                            }}
                            onAttempt={onAttempt}
                        />
                    </Suspense>
                </motion.div>
            </AnimatePresence>

            {/* Gamified Celebration Overlay */}
            <AnimatePresence>
                {celebData && (
                    <CelebrationView 
                        subject="english"
                        nodeType={nodeType}
                        mastery={celebData.mastery}
                        score={celebData.score}
                        total={celebData.total}
                        gemsEarned={celebData.gems}
                        customTitle={`${celebData.label} Mastered!`}
                        onCollect={handleCollect}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default EnglishBridge;

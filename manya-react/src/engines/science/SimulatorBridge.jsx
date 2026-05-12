import React, { useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { getEngineType, SUPPORTED_SIM_ENGINES } from './ScienceLogic';
import { calculateUSP } from '../../domain/scoring/scoringUtility.js';
import { useBehavioralTracker } from '../../hooks/useBehavioralTracker';

// Engines
import UniversalGlobeEngine from '../sst/UniversalGlobeEngine.jsx';
import ImageHotspotsEngine from '../shared-engines/ImageHotspotsEngine';
import GalleryStudyEngine from '../shared-engines/GalleryStudyEngine';
import ThreeDStudyEngine from '../shared-engines/ThreeDStudyEngine';
import NoteExplorerEngine from '../shared-engines/NoteExplorerEngine';
import ReaderStudyEngine from '../shared-engines/ReaderStudyEngine';

/**
 * SCIENCE SIMULATOR BRIDGE
 * Connects the Science Fetcher to specialized Simulation Engines with seamless transitions.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt, onResult }) => {
    // --- REMOVED INTERNAL OVERLAYS (Now using global InteractionFeedback) ---

    // 🧠 [Phase 3] Universal Behavioral Tracking
    const { metrics } = useBehavioralTracker(true);

    const simData = step?.data || step;
    const resultRef = useRef(null);

    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white/50 backdrop-blur-md rounded-[3rem] m-4 border-4 border-rose-200">
            <AlertCircle size={40} className="mb-4" />
            Simulation Load Failure
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    let engineType = getEngineType(step);
    if (engineType === 'IMAGE_HOTSPOTS' && !simData.engineType && !simData.type) engineType = 'IMAGE_HOTSPOTS';
    if (simData.study_notes || simData.mode === 'note_explorer') engineType = 'NOTE_EXPLORER';

    const handleSimComplete = (results) => {
        const finalResults = results || resultRef.current;
        const usp = calculateUSP({
            accuracy: finalResults?.accuracy ?? (finalResults?.score && finalResults?.total ? (finalResults.score / finalResults.total) : 1.0),
            mistakes: finalResults?.mistakes || 0,
            timeSpentMs: finalResults?.duration || finalResults?.timeSpentMs || 30000,
            engineType: engineType
        }, 'science');

        onComplete({
            success: true, 
            score: usp.masteryScore,
            usp: usp,
            simResults: finalResults,
            // 🧠 Behavioral Pass-through
            metrics: metrics
        });
    };

    const handleSimResult = (res) => {
        resultRef.current = res;
        onResult?.(res);
    };

    const sharedProps = {
        data: simData,
        subject: simData.subject || 'science',
        onComplete: handleSimComplete,
        onResult: handleSimResult,
        onSimSuccess: () => {
            window.dispatchEvent(new CustomEvent('manya-correct', { 
                detail: { subject: simData.subject || 'science' } 
            }));
        },
        onSimWrong: () => {
            window.dispatchEvent(new CustomEvent('manya-wrong', { 
                detail: { subject: simData.subject || 'science' } 
            }));
        },
        onAttempt
    };

    const renderEngine = () => {
        switch (engineType) {
            case 'GLOBE_TIME_ENGINE':
            case 'GLOBE_ENGINE':
            case 'UNIVERSAL_GLOBE':
                return <UniversalGlobeEngine {...sharedProps} />;
            
            case 'IMAGE_HOTSPOTS':
                return <ImageHotspotsEngine {...sharedProps} />;
            
            case 'GALLERY_STUDY':
                return <GalleryStudyEngine {...sharedProps} />;
            
            case '3D_SKELETON':
            case 'THREE_D_STUDY':
                return <ThreeDStudyEngine {...sharedProps} />;
            
            case 'NOTE_EXPLORER':
                return <NoteExplorerEngine {...sharedProps} />;
            
            case 'READER_STUDY':
                return <ReaderStudyEngine {...sharedProps} />;
            
            default:
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500">
                        <Puzzle size={40} className="mb-4 opacity-20" />
                        <p className="font-bold">Unsupported Engine: {engineType}</p>
                        <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg text-slate-900 font-black">CONTINUE QUEST</button>
                    </div>
                );
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div 
                key={engineType + (step.id || step.qid)}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="flex-1 flex flex-col h-full w-full"
            >
                {/* Global celebrations are handled by InteractionFeedback in the App root */}

                <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-xl">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entering {engineType}...</p>
                    </div>
                }>
                    {renderEngine()}
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
};

export default SimulatorBridge;

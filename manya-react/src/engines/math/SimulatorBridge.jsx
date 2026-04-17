import React, { useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { getEngineType, SUPPORTED_SIM_ENGINES } from './MathLogic';
import { calculateUSP } from '../../domain/scoring/scoringUtility.js';

// Shared Engines
import UniversalGlobeEngine from '../sst/UniversalGlobeEngine.jsx';
import ImageHotspotsEngine from '../shared-engines/ImageHotspotsEngine';
import GalleryStudyEngine from '../shared-engines/GalleryStudyEngine';
import ReaderStudyEngine from '../shared-engines/ReaderStudyEngine';
import NoteExplorerEngine from '../shared-engines/NoteExplorerEngine';

// Math Specialized Engines
import SetTheoryEngine from './SetTheoryEngine';
import SetStudyEngine from './SetStudyEngine';
import VennProbEngine from './VennProbEngine';
import SubsetGameEngine from './SubsetGameEngine';
import PizzaGameEngine from './PizzaGameEngine';
import BinaryGameEngine from './BinaryGameEngine';
import VennSpotlightEngine from './VennSpotlightEngine';
import SetClassifierEngine from './SetClassifierEngine';

/**
 * MATH SIMULATOR BRIDGE
 * Connects the Math Fetcher to specialized Simulation Engines with seamless transitions.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt }) => {
    const simData = step?.data?.questions ? step.data : (step?.data || step);
    const resultRef = useRef(null);
    const finishedRef = useRef(false);

    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white/50 backdrop-blur-md rounded-[3rem] m-4 border-4 border-rose-200">
            <AlertCircle size={40} className="mb-4" />
            Simulation Data Failure
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    let engineType = getEngineType(step);
    if (engineType === 'IMAGE_HOTSPOTS' && !simData.engineType && !simData.type) engineType = 'IMAGE_HOTSPOTS';

    const handleSimComplete = (results) => {
        if (finishedRef.current) return;
        finishedRef.current = true;

        const finalResults = results || resultRef.current;
        const usp = calculateUSP({
            accuracy: finalResults?.accuracy ?? (finalResults?.score && finalResults?.total ? (finalResults.score / finalResults.total) : 1.0),
            mistakes: finalResults?.mistakes || 0,
            timeSpentMs: finalResults?.duration || finalResults?.timeSpentMs || 30000,
            engineType: engineType
        }, 'math');

        onComplete({
            success: true, 
            score: usp.masteryScore,
            usp: usp,
            simResults: finalResults
        });
    };

    const handleSimResult = (res) => {
        if (finishedRef.current) return;
        resultRef.current = res;
    };

    const sharedProps = {
        data: simData,
        onComplete: handleSimComplete,
        onResult: handleSimResult,
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

            case 'SET_THEORY':
                return <SetTheoryEngine {...sharedProps} />;
            
            case 'MATH_STUDY':
                return <SetStudyEngine {...sharedProps} />;
            
            case 'VENN_PROB_ENGINE':
                return <VennProbEngine {...sharedProps} />;
            
            case 'SUBSET_GAME':
                return <SubsetGameEngine {...sharedProps} />;
            
            case 'PIZZA_GAME':
                return <PizzaGameEngine {...sharedProps} />;
            
            case 'BINARY_GENERATOR':
            case 'BINARY_GAME':
                return <BinaryGameEngine {...sharedProps} />;
            
            case 'VENN_SPOTLIGHT':
                return <VennSpotlightEngine {...sharedProps} />;
            
            case 'SET_CLASSIFIER':
                return <SetClassifierEngine {...sharedProps} />;

            case 'READER_STUDY':
                return <ReaderStudyEngine {...sharedProps} />;

            case 'NOTE_EXPLORER':
                return <NoteExplorerEngine {...sharedProps} />;
            
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
                <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-xl">
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Calculating {engineType}...</p>
                    </div>
                }>
                    {renderEngine()}
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
};

export default SimulatorBridge;

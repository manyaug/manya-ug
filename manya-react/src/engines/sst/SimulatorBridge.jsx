import React, { useState, Suspense, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { discoverArtifact, syncUserData } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import { calculateUSP } from '../../domain/scoring/scoringUtility.js';
import { useBehavioralTracker } from '../../hooks/useBehavioralTracker';
import { getEngineType } from './SSTLogic';
import { ENGINE_REGISTRY, getEngine } from '../../config/engineRegistry';
import SimSuccessOverlay from '../../components/ui/SimSuccessOverlay';
import SimWrongOverlay from '../../components/ui/SimWrongOverlay';

/* Study engine types that produce library artifacts — must match engineRegistry.ts keys exactly */
const STUDY_ENGINE_TYPES = [
    'NOTE_EXPLORER',
    'READER_STUDY',
    'GALLERY_STUDY',
];

/**
 * SST SIMULATOR BRIDGE v6.0 (Standardized)
 * ───────────────────────────────────────────────────
 * - SEAMLESS: Uses AnimatePresence for visual continuity.
 * - REGISTRY-BASED: Uses global mapping instead of hardcoded switches.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt, onResult, subject = 'sst' }) => {
    const dispatch = useDispatch();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWrong, setShowWrong] = useState(false);
    
    // 🧠 [Phase 3] Universal Behavioral Tracking
    const { metrics } = useBehavioralTracker(true);

    const user = useSelector(s => s.user.data);
    const simData = step?.data || step;
    const engineType = getEngineType(step);
    
    useEffect(() => {
        console.log(`%c 🌉 [SimulatorBridge] Hydrating Engine: ${engineType}`, 'color: #3b82f6; font-weight: bold;', {
            engineType,
            stepId: step?.id || step?.qid,
            hasData: !!step?.data,
            resolvedPayload: simData
        });
    }, [engineType, step, simData]);
    const resultRef = React.useRef(null);

    const handleSimResult = (res) => {
        resultRef.current = res;
        onResult?.(res);
    };
    
    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white">
            <AlertCircle size={40} className="mb-4" />
            Asset Missing
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    const rawEngine = getEngineType(step);
    
    let engineMeta;
    try {
        engineMeta = getEngine(rawEngine);
    } catch (e) {
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
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id || step.qid}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex-1 flex flex-col h-full"
                >
                    {/* Global Sim Success Overlay */}
                    <SimSuccessOverlay 
                        show={showSuccess} 
                        subject={simData.subject || subject || 'sst'} 
                        onDismiss={() => setShowSuccess(false)} 
                    />

                    {/* Global Sim Wrong Overlay */}
                    <SimWrongOverlay 
                        show={showWrong} 
                        onDismiss={() => setShowWrong(false)} 
                    />

                    <Suspense fallback={
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Entering {rawEngine}...</p>
                        </div>
                    }>
                        <EngineComponent 
                            data={simData} 
                            onSimSuccess={() => setShowSuccess(true)}
                            onSimWrong={() => {
                                setShowWrong(true);
                                setShowSuccess(false);
                            }}
                            onComplete={(res) => {
                                const usp = calculateUSP({
                                    accuracy: res?.accuracy ?? (res?.score && res?.total ? (res.score / res.total) : 1.0),
                                    mistakes: res?.mistakes || 0,
                                    timeSpentMs: res?.duration || res?.timeSpentMs || 30000,
                                    engineType: rawEngine
                                }, subject);

                                /* ── 🏺 Archive study content to Knowledge Vault ── */
                                if (STUDY_ENGINE_TYPES.includes(rawEngine)) {
                                    const artifactTitle =
                                        simData?.title ||
                                        simData?.topic ||
                                        simData?.subtopic ||
                                        step?.title ||
                                        'Social Studies Note';

                                    dispatch(discoverArtifact({
                                        id: step?.id || `sst_study_${Date.now()}`,
                                        type: rawEngine === 'READER' || rawEngine === 'READER_ENGINE'
                                            ? 'recap'
                                            : 'note',
                                        title: artifactTitle,
                                        subject: simData?.subject || subject || 'sst',
                                        data: simData,
                                    }));

                                    dispatch(addToast({
                                        message: `"${artifactTitle}" saved to your Library! 🏺`,
                                        type: 'success',
                                    }));

                                    const newArtifact = {
                                        id: step?.id || `sst_study_${Date.now()}`,
                                        type: rawEngine === 'READER_STUDY' ? 'recap' : 'note',
                                        title: artifactTitle,
                                        subject: simData?.subject || subject || 'sst',
                                        data: simData,
                                        discoveredAt: new Date().toISOString(),
                                    };
                                    const mergedVault = [
                                        ...(user.vaultArtifacts || []).filter(a => a.id !== newArtifact.id),
                                        newArtifact,
                                    ];
                                    dispatch(syncUserData({ ...user, vaultArtifacts: mergedVault }));
                                }

                                onComplete({ 
                                    success: true, 
                                    score: usp.masteryScore,
                                    usp: usp,
                                    simResults: res,
                                    // 🧠 Behavioral Pass-through
                                    metrics: metrics
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

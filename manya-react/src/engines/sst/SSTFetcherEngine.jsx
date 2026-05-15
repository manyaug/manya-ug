import { useEffect, useRef } from 'react';
import { fetchSstQuestions } from '../../services/sstMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { syncService } from '../../infrastructure/sync/syncService';
import { findQuestData, preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';

/**
 * MANYA SST FETCHER ENGINE v8.8 (Optimized)
 * -------------------------------------------------------------
 * Parallel resource loading + extended safety timeout to prevent
 * "Rescue Mode" death loops in complex subjects.
 */
export default function SSTFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();
    const fetchingRef = useRef(false);

    useEffect(() => {
        async function explode() {
            if (fetchingRef.current) return;
            fetchingRef.current = true;
            
            console.log(`[SSTFetcher] Explode sequence started for: ${data?.topic}`);

            // v8.8: Increased timeout for heavy resource counts
            const safetyTimeout = new Promise((resolve) => 
                setTimeout(() => resolve('TIMEOUT'), 12000)
            );

            const fetchOperation = (async () => {
                try {
                    const questions = await fetchSstQuestions(data?.topic || 'default');
                    
                    if (questions && questions.length > 0) {
                        await preloadCurriculum();
                        const questData = findQuestData('sst', data?.unitId, data?.topic);
                        const simResources = [];
                        
                        if (questData?.resources) {
                            console.log(`[SSTFetcher] Found ${questData.resources.length} resources. Loading in parallel...`);
                            
                            // v8.8: PARALLEL LOADING (Faster)
                            const resourcePromises = questData.resources.map(res => 
                                loadQuestSteps('sst', data?.unitId, data?.topic, res.file)
                                    .then(resSteps => resSteps?.steps || [])
                                    .catch(() => [])
                            );
                            
                            const allResSteps = await Promise.all(resourcePromises);
                            allResSteps.forEach(steps => simResources.push(...steps));
                        }

                        const history = await syncService.fetchRecentTelemetry('sst', 20) || [];
                        const session = { consecutiveWrong: 0, confidence: 100 }; 
                        
                        const adaptiveResult = await generateAdaptiveQuest(
                            questions, 
                            data?.nodeType || 'PRACTICE', 
                            'sst', 
                            data?.questKey || 'sst_quest', 
                            session, 
                            history,
                            simResources
                        );

                        const selectedQuestions = adaptiveResult.questions;
                        bus.setPools(adaptiveResult.pools);

                        const explodedSteps = selectedQuestions.map(q => {
                            const itemType = (q.item_type || q.type || "").toUpperCase();
                            return {
                                engineType: q.engineType || q.engine_type || (
                                    (itemType === 'NOTE' || q.isNote) ? 'NOTE_EXPLORER' :
                                    (itemType === 'RECAP' || q.isRecap) ? 'NOTE_EXPLORER' :
                                    (q.type === 'simulation' || q.isSimulation) ? 'THREE_D_STUDY' : 
                                    'MCQ_STANDALONE'
                                ),
                                data: q,
                                subject: 'sst'
                            };
                        });

                        bus.replaceCurrentStepWith(explodedSteps);
                        return 'SUCCESS';
                    }
                    return 'NO_QUESTIONS';
                } catch (err) {
                    console.error("[SSTFetcher] Operation Error:", err);
                    return 'ERROR';
                }
            })();

            const result = await Promise.race([fetchOperation, safetyTimeout]);

            if (result === 'TIMEOUT') {
                console.warn(`⚠️ [SSTFetcher] Safety timeout triggered! Forcing rescue questions...`);
                const fallbackSteps = [
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Let's start with a classic SST fact! Which of these is the largest continent on Earth?",
                            options: ["Africa", "Asia", "Europe", "Antarctica"],
                            answer: "Asia",
                            explanation: "Asia is the largest continent both by land area and population!"
                        },
                        subject: 'sst'
                    },
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Which ocean is located to the east of Africa?",
                            options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
                            answer: "Indian Ocean",
                            explanation: "The Indian Ocean lies to the east of the African continent."
                        },
                        subject: 'sst'
                    }
                ];
                bus.replaceCurrentStepWith(fallbackSteps);
            } else if (result === 'NO_QUESTIONS' || result === 'ERROR') {
                console.warn("[SSTFetcher] Fetch failed or empty. Skipping.");
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

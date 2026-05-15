import { useEffect, useRef } from 'react';
import { fetchScienceQuestions } from '../../services/scienceMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { syncService } from '../../infrastructure/sync/syncService';
import { findQuestData, preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';

/**
 * MANYA SCIENCE FETCHER ENGINE v8.0 (Stateless)
 * -------------------------------------------------------------
 * This is now a "Pure Proxy" engine. It fetches questions and 
 * injects them into the parent orchestrator via the QuestBus.
 */
export default function ScienceFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();
    const fetchingRef = useRef(false);

    useEffect(() => {
        async function explode() {
            if (fetchingRef.current) return;
            fetchingRef.current = true;
            
            console.log(`[ScienceFetcher] Explode sequence started for: ${data?.topic}`);

            const safetyTimeout = new Promise((resolve) => 
                setTimeout(() => resolve('TIMEOUT'), 12000)
            );

            const fetchOperation = (async () => {
                try {
                    // Fetch the raw questions from the DB
                    const questions = await fetchScienceQuestions(data?.topic || 'default');
                    
                    if (questions && questions.length > 0) {
                        console.log(`[ScienceFetcher] Passing ${questions.length} raw questions to Adaptive Engine...`);
                        
                        // 🔬 CURRICULUM RESOURCE INJECTION (v8.5)
                        await preloadCurriculum();
                        
                        const questData = findQuestData('science', data?.unitId, data?.topic);
                        const simResources = [];
                        
                        if (questData?.resources) {
                            console.log(`[ScienceFetcher] Found ${questData.resources.length} resources. Loading in parallel...`);
                            const resourcePromises = questData.resources.map(res => 
                                loadQuestSteps('science', data?.unitId, data?.topic, res.file)
                                    .then(resSteps => resSteps?.steps || [])
                                    .catch(() => [])
                            );
                            
                            const allResSteps = await Promise.all(resourcePromises);
                            allResSteps.forEach(steps => simResources.push(...steps));
                        }

                        // 🧠 ADAPTIVE ENGINE INTEGRATION
                        const history = await syncService.fetchRecentTelemetry('science', 20) || [];
                        const session = { consecutiveWrong: 0, confidence: 100 }; 
                        
                        const adaptiveResult = await generateAdaptiveQuest(
                            questions, 
                            data?.nodeType || 'PRACTICE', 
                            'science', 
                            data?.questKey || 'science_quest', 
                            session, 
                            history,
                            simResources
                        );

                        const selectedQuestions = adaptiveResult.questions;
                        console.log(`[ScienceFetcher] Exploding ${selectedQuestions.length} adaptive steps into quest.`);
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
                                subject: 'science'
                            };
                        });

                        bus.replaceCurrentStepWith(explodedSteps);
                        return 'SUCCESS';
                    }
                    return 'NO_QUESTIONS';
                } catch (err) {
                    console.error("[ScienceFetcher] Operation Error:", err);
                    return 'ERROR';
                }
            })();

            const result = await Promise.race([fetchOperation, safetyTimeout]);

            if (result === 'TIMEOUT') {
                console.warn(`⚠️ [ScienceFetcher] Safety timeout triggered! Forcing rescue questions...`);
                // Emergency Fallback: If DB hangs, we grab anything from local cache or simple questions
                const fallbackSteps = [
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Let's start with a quick check! Which of these is a major part of the human skeleton?",
                            options: ["Skull", "Feathers", "Wings", "Fins"],
                            answer: "Skull",
                            explanation: "The skull is a vital part of the axial skeleton protecting the brain!"
                        },
                        subject: 'science'
                    },
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "How many bones are in the adult human body?",
                            options: ["106", "206", "306", "406"],
                            answer: "206",
                            explanation: "The adult human body has 206 bones!"
                        },
                        subject: 'science'
                    }
                ];
                bus.replaceCurrentStepWith(fallbackSteps);
            } else if (result === 'NO_QUESTIONS' || result === 'ERROR') {
                console.warn("[ScienceFetcher] Fetch failed or empty. Skipping.");
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

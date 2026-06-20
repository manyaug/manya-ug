import { useEffect, useRef } from 'react';
import { fetchMathQuestions, clearMathCache } from '../../services/mathMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { syncService } from '../../infrastructure/sync/syncService';
import { findQuestData, preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getEngineType, isSimSafe } from '../shared-engines/UniversalLogic';

/**
 * MANYA MATH FETCHER ENGINE v10.0 (Hardened)
 * -------------------------------------------------------------
 * Standardized data architecture with universal engine detection.
 * Standardizes math payloads to match English/SST patterns.
 */
export default function MathFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();
    const fetchingRef = useRef(false);

    useEffect(() => {
        async function explode() {
            if (fetchingRef.current) return;
            fetchingRef.current = true;
            clearMathCache();
            
            console.log(`[MathFetcher] Explode sequence started for: ${data?.topic}`);

            const safetyTimeout = new Promise((resolve) => 
                setTimeout(() => resolve('TIMEOUT'), 45000)
            );

            const fetchOperation = (async () => {
                try {
                    const questions = await fetchMathQuestions(data?.topic || 'default');
                    
                    if (questions && questions.length > 0) {
                        await preloadCurriculum();
                        const questData = findQuestData('math', data?.unitId, data?.topic);
                        const simResources = [];
                        
                        if (questData?.resources) {
                            console.log(`[MathFetcher] Found ${questData.resources.length} resources. Loading in parallel...`);
                            
                            const resourcePromises = questData.resources.map(res => 
                                loadQuestSteps('math', data?.unitId, data?.topic, res.file)
                                    .then(resSteps => resSteps?.steps || [])
                                    .catch(() => [])
                            );
                            
                            const allResSteps = await Promise.all(resourcePromises);
                            allResSteps.forEach(steps => simResources.push(...steps));
                        }

                        const history = await syncService.fetchRecentTelemetry('math', 20) || [];
                        const session = { consecutiveWrong: 0, confidence: 100 }; 
                        
                        const adaptiveResult = await generateAdaptiveQuest(
                            questions, 
                            data?.nodeType || 'PRACTICE', 
                            'math', 
                            data?.questKey || 'math_quest', 
                            session, 
                            history,
                            simResources
                        );

                        const selectedQuestions = adaptiveResult.questions;
                        bus.setRawQuestions?.(questions);
                        bus.setPools(adaptiveResult.pools);

                        const explodedSteps = selectedQuestions.map(q => {
                            const rawEngineType = getEngineType(q, 'math');
                            const isRealSim = isSimSafe(q, 'math');
                            const engineType = isRealSim ? rawEngineType : 'MCQ_STANDALONE';

                            return {
                                engineType,
                                data: q,
                                isSimulation: isRealSim,
                                subject: 'math'
                            };
                        });

                        bus.replaceCurrentStepWith(explodedSteps);
                        return 'SUCCESS';
                    }
                    return 'NO_QUESTIONS';
                } catch (err) {
                    console.error("[MathFetcher] Operation Error:", err);
                    return 'ERROR';
                }
            })();

            const result = await Promise.race([fetchOperation, safetyTimeout]);

            if (result === 'TIMEOUT') {
                console.warn(`⚠️ [MathFetcher] Safety timeout triggered! Forcing rescue questions...`);
                const fallbackSteps = [
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Let's start with a warm-up! What is the result of 7 + 8?",
                            options: ["13", "14", "15", "16"],
                            answer: "15",
                            explanation: "Basic addition: 7 + 8 = 15!"
                        },
                        subject: 'math'
                    }
                ];
                bus.replaceCurrentStepWith(fallbackSteps);
            } else if (result === 'NO_QUESTIONS' || result === 'ERROR') {
                console.warn("[MathFetcher] Fetch failed or empty. Skipping.");
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null;
}

import { useEffect, useRef } from 'react';
import { fetchEnglishQuestions } from '../../services/englishMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { syncService } from '../../infrastructure/sync/syncService';
import { findQuestData, preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getEngineType } from '../shared-engines/UniversalLogic';

/**
 * MANYA ENGLISH FETCHER ENGINE v8.8 (Optimized)
 * -------------------------------------------------------------
 * Parallel resource loading + extended safety timeout to prevent
 * "Rescue Mode" death loops in complex subjects.
 */
export default function EnglishFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();
    const fetchingRef = useRef(false);

    useEffect(() => {
        async function explode() {
            if (fetchingRef.current) return;
            fetchingRef.current = true;
            
            console.log(`[EnglishFetcher] Explode sequence started for: ${data?.topic}`);

            const safetyTimeout = new Promise((resolve) => 
                setTimeout(() => resolve('TIMEOUT'), 12000)
            );

            const fetchOperation = (async () => {
                try {
                    const questions = await fetchEnglishQuestions(data?.topic || 'default');
                    
                    if (questions && questions.length > 0) {
                        await preloadCurriculum();
                        const questData = findQuestData('english', data?.unitId, data?.topic);
                        const simResources = [];
                        
                        if (questData?.resources) {
                            console.log(`[EnglishFetcher] Found ${questData.resources.length} resources. Loading in parallel...`);
                            
                            // v8.8: Parallel Loading
                            const resourcePromises = questData.resources.map(res => 
                                loadQuestSteps('english', data?.unitId, data?.topic, res.file)
                                    .then(resSteps => resSteps?.steps || [])
                                    .catch(() => [])
                            );
                            
                            const allResSteps = await Promise.all(resourcePromises);
                            allResSteps.forEach(steps => simResources.push(...steps));
                        }

                        const history = await syncService.fetchRecentTelemetry('english', 20) || [];
                        const session = { consecutiveWrong: 0, confidence: 100 }; 
                        
                        const adaptiveResult = await generateAdaptiveQuest(
                            questions, 
                            data?.nodeType || 'PRACTICE', 
                            'english', 
                            data?.questKey || 'english_quest', 
                            session, 
                            history,
                            simResources
                        );

                        const selectedQuestions = adaptiveResult.questions;
                        bus.setPools(adaptiveResult.pools);

                        const explodedSteps = selectedQuestions.map(q => {
                            const engineType = getEngineType(q, 'english');
                            return {
                                engineType,
                                data: q,
                                isSimulation: engineType !== 'MCQ_STANDALONE',
                                subject: 'english'
                            };
                        });

                        bus.replaceCurrentStepWith(explodedSteps);
                        return 'SUCCESS';
                    }
                    return 'NO_QUESTIONS';
                } catch (err) {
                    console.error("[EnglishFetcher] Operation Error:", err);
                    return 'ERROR';
                }
            })();

            const result = await Promise.race([fetchOperation, safetyTimeout]);

            if (result === 'TIMEOUT') {
                console.warn(`⚠️ [EnglishFetcher] Safety timeout triggered! Forcing rescue questions...`);
                const fallbackSteps = [
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Let's start with a quick English quiz! Which of these is a noun?",
                            options: ["Run", "Blue", "Apple", "Quickly"],
                            answer: "Apple",
                            explanation: "An apple is a person, place, or thing (a noun)!"
                        },
                        subject: 'english'
                    },
                    {
                        engineType: 'MCQ_STANDALONE',
                        data: {
                            question: "Which of these is a synonym for 'Happy'?",
                            options: ["Sad", "Angry", "Joyful", "Tired"],
                            answer: "Joyful",
                            explanation: "Joyful and Happy have very similar meanings."
                        },
                        subject: 'english'
                    }
                ];
                bus.replaceCurrentStepWith(fallbackSteps);
            } else if (result === 'NO_QUESTIONS' || result === 'ERROR') {
                console.warn("[EnglishFetcher] Fetch failed or empty. Skipping.");
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

import { useEffect } from 'react';
import { fetchScienceQuestions } from '../../services/scienceMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';

/**
 * MANYA SCIENCE FETCHER ENGINE v8.0 (Stateless)
 * -------------------------------------------------------------
 * This is now a "Pure Proxy" engine. It fetches questions and 
 * injects them into the parent orchestrator via the QuestBus.
 */
export default function ScienceFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();

    useEffect(() => {
        async function explode() {
            try {
                console.log(`[ScienceFetcher] Fetching questions for topic: ${data?.topic}`);
                
                // Fetch the raw questions from the DB
                const questions = await fetchScienceQuestions(data?.topic || 'default');
                
                if (questions && questions.length > 0) {
                    console.log(`[ScienceFetcher] Exploding ${questions.length} steps into quest.`);
                    
                    const explodedSteps = questions.map(q => ({
                        // Science often uses 3D engines or standard MCQ
                        engineType: q.engineType || (q.type === 'simulation' ? 'THREE_D_STUDY' : 'MCQ_STANDALONE'),
                        data: q,
                        subject: 'science'
                    }));

                    // Inject them into the parent orchestrator
                    bus.replaceCurrentStepWith(explodedSteps);
                } else {
                    console.warn("[ScienceFetcher] No questions found, skipping fetcher.");
                    onComplete?.();
                }
            } catch (error) {
                console.error("[ScienceFetcher] Failed to explode Science quest:", error);
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

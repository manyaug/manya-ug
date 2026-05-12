import { useEffect } from 'react';
import { fetchMathQuestions } from '../../services/mathMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';

/**
 * MANYA MATH FETCHER ENGINE v8.0 (Stateless)
 * -------------------------------------------------------------
 * This is now a "Pure Proxy" engine. It fetches questions and 
 * injects them into the parent orchestrator via the QuestBus.
 */
export default function MathFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();

    useEffect(() => {
        async function explode() {
            try {
                console.log(`[MathFetcher] Fetching questions for topic: ${data?.topic}`);
                
                // Fetch the raw questions from the DB
                const questions = await fetchMathQuestions(data?.topic || 'default');
                
                if (questions && questions.length > 0) {
                    console.log(`[MathFetcher] Exploding ${questions.length} steps into quest.`);
                    
                    // Map questions to the standard MCQ or SIM engine types
                    const explodedSteps = questions.map(q => ({
                        engineType: q.type === 'simulation' ? (q.engine || 'SET_THEORY') : 'MCQ_STANDALONE',
                        data: q,
                        subject: 'math'
                    }));

                    // Inject them into the parent orchestrator
                    bus.replaceCurrentStepWith(explodedSteps);
                } else {
                    console.warn("[MathFetcher] No questions found, skipping fetcher.");
                    onComplete?.();
                }
            } catch (error) {
                console.error("[MathFetcher] Failed to explode math quest:", error);
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

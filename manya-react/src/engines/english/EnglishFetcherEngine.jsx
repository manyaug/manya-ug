import { useEffect } from 'react';
import { fetchEnglishQuestions } from '../../services/englishMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';

/**
 * MANYA ENGLISH FETCHER ENGINE v8.0 (Stateless)
 * -------------------------------------------------------------
 * This is now a "Pure Proxy" engine. It fetches questions and 
 * injects them into the parent orchestrator via the QuestBus.
 */
export default function EnglishFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();

    useEffect(() => {
        async function explode() {
            try {
                console.log(`[EnglishFetcher] Fetching questions for topic: ${data?.topic}`);
                
                // Fetch the raw questions from the DB
                const questions = await fetchEnglishQuestions(data?.topic || 'default');
                
                if (questions && questions.length > 0) {
                    console.log(`[EnglishFetcher] Exploding ${questions.length} steps into quest.`);
                    
                    const explodedSteps = questions.map(q => ({
                        // English has many specialized engines (SentenceBlocks, Harvest, etc.)
                        engineType: q.engineType || (q.type === 'simulation' ? 'SENTENCE_BLOCKS' : 'MCQ_STANDALONE'),
                        data: q,
                        subject: 'english'
                    }));

                    // Inject them into the parent orchestrator
                    bus.replaceCurrentStepWith(explodedSteps);
                } else {
                    console.warn("[EnglishFetcher] No questions found, skipping fetcher.");
                    onComplete?.();
                }
            } catch (error) {
                console.error("[EnglishFetcher] Failed to explode English quest:", error);
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

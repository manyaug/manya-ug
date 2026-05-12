import { useEffect } from 'react';
import { fetchSstQuestions } from '../../services/sstMockDB';
import { useQuestBus } from '../../ui/context/QuestBus';

/**
 * MANYA SST FETCHER ENGINE v8.0 (Stateless)
 * -------------------------------------------------------------
 * This is now a "Pure Proxy" engine. It fetches questions and 
 * injects them into the parent orchestrator via the QuestBus.
 */
export default function SSTFetcherEngine({ data, onComplete }) {
    const bus = useQuestBus();

    useEffect(() => {
        async function explode() {
            try {
                console.log(`[SSTFetcher] Fetching questions for topic: ${data?.topic}`);
                
                // Fetch the raw questions from the DB
                const questions = await fetchSstQuestions(data?.topic || 'default');
                
                if (questions && questions.length > 0) {
                    console.log(`[SSTFetcher] Exploding ${questions.length} steps into quest.`);
                    
                    // SST Fetcher usually explodes into UNIVERSAL_GLOBE or READER_STUDY
                    const explodedSteps = questions.map(q => ({
                        engineType: q.engineType || 'READER_STUDY',
                        data: q,
                        subject: 'sst'
                    }));

                    // Inject them into the parent orchestrator
                    bus.replaceCurrentStepWith(explodedSteps);
                } else {
                    console.warn("[SSTFetcher] No questions found, skipping fetcher.");
                    onComplete?.();
                }
            } catch (error) {
                console.error("[SSTFetcher] Failed to explode SST quest:", error);
                onComplete?.();
            }
        }
        
        explode();
    }, [data?.topic, bus]);

    return null; // Fetcher is invisible
}

import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { ASSET_VERSION } from '../config/constants';
import { hydrateStepData } from '../engines/shared-engines/UniversalLogic';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_1_world_stage': ['The World Stage', 'world_stage'],
    'quest_2_grid_master': ['Grid Master', 'Grid Math', 'latitudes_longitudes', 'quest_2_grid_master'],
    'quest_3_calculating_time': ['Calculating Time', 'time_calc', 'quest_3_calculating_time'],
    'quest_4_water_bodies': ['Water Bodies'],
    'quest_5_coastal_features': ['Coastal Features', 'coastal_features'],
    'quest_6_regional_division_capital_cities': ['Regions and Capitals', 'Regional Division Capital Cities'],
    'quest_7_landlocked_countries': ['Landlocked Countries', 'regions_capitals']
};

/**
 * Fetches and transforms questions from the unified Manya Vault.
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const searchTerms = SUBTOPIC_MAP[topicId] 
            ? [...SUBTOPIC_MAP[topicId], topicId] 
            : [topicId];
            
        // De-duplicate search terms
        const uniqueTerms = [...new Set(searchTerms)];
        
        console.log(`🗄️ [SSTDB] Fetching bank for: ${topicId} (Search terms: ${uniqueTerms.join(', ')})`);
        
        if (BANK_CACHE[topicId]) return BANK_CACHE[topicId];

        let data = null;
        try {
            console.log(`📡 [SSTDB] Querying Supabase for fresh records...`);
            
            // Build the query containing all ILIKE conditions
            const orConditions = uniqueTerms.map(term => `subtopic.ilike.%25${term}%25`).join(',');
            data = await storageFacade.get(`db:/manya_vault?subject=ilike:sst&or=${orConditions}`);
        } catch (dbErr) {
            console.warn(`⚠️ [SSTDB] Supabase query failed, falling back to local IndexedDB cache:`, dbErr);
            const allCached = await ManyaDB.getCachedQuestions('sst');
            const cached = allCached.filter(q => 
                uniqueTerms.some(term => q.subtopic?.toLowerCase().includes(term.toLowerCase()))
            );
            if (cached && cached.length > 0) {
                console.log(`💾 [SSTDB] Successfully loaded ${cached.length} questions from local IndexedDB.`);
                BANK_CACHE[topicId] = cached;
                return cached;
            }
            data = [];
        }

        // FALLBACK: Aggressive Keyword Splitting (v4.5)
        if (!data || data.length === 0) {
            const cleanSub = topicId.replace(/^quest_\d+_/, '').replace(/_/g, ' ');
            const keywords = cleanSub.split(' ').filter(k => k.length > 2); 
            
            if (keywords.length > 0) {
                console.log(`🔍 [SST Vault] No exact match for "${cleanSub}". Trying keywords:`, keywords);
                const keywordFilter = keywords.map(k => `subtopic.ilike.%25${k}%25,topic.ilike.%25${k}%25`).join(',');
                
                const keywordData = await storageFacade.get(`db:/manya_vault?subject=ilike:sst&or=${keywordFilter}`);
                
                if (keywordData?.length > 0) {
                    console.log(`✨ [SST Vault] Discovered ${keywordData.length} related questions via keywords.`);
                    data = keywordData;
                }
            }
        }

        if (!data || data.length === 0) return [];

        const transformed = await Promise.all(data.map(async (q) => {
            const options = [q.option_a, q.option_b, q.option_c, q.option_d]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            let interactivePayload = hydrateStepData(q) || {};

            const isMcqQid = String(q.qid || q.id || '').toLowerCase().includes('quiz') || 
                             String(q.qid || q.id || '').toLowerCase().includes('mcq') || 
                             String(q.qid || q.id || '').toLowerCase().includes('question') ||
                             String(q.qid || q.id || '').toLowerCase().includes('practice');

            const engineUpper = (q.engine_type || "").toUpperCase();
            const hasSpecializedEngine = engineUpper && engineUpper !== 'NULL' && engineUpper !== 'MCQ' && engineUpper !== 'NONE' && engineUpper !== 'MCQ_STANDALONE';

            const isInteractive = (
                q.item_type?.toUpperCase().includes('INTERACTIVE') || 
                q.item_type?.toUpperCase() === 'SIMULATION' || 
                q.item_type?.toUpperCase() === 'RECAP' || 
                hasSpecializedEngine
            ) && !isMcqQid;

            if (isInteractive && q.cdn_url) {
                try {
                    let cleanCdnUrl = q.cdn_url.replace('.net.net', '.net');
                    cleanCdnUrl = cleanCdnUrl.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                    cleanCdnUrl = cleanCdnUrl.replace('@main/', `@${ASSET_VERSION}/`);
                    
                    console.debug(`[SSTDB] Fetching CDN Payload for ${q.qid}: ${cleanCdnUrl}`);
                    const fetchedData = await storageFacade.get(`file:${cleanCdnUrl}`);
                    if (fetchedData) {
                        interactivePayload = { ...interactivePayload, ...fetchedData };
                        console.log(`%c ✅ [SSTDB] Hydrated Simulation: ${q.qid}`, 'color: #10b981; font-weight: bold;');
                    }
                } catch (e) {
                    console.warn(`[SSTDB] CDN Fetch failed for ${q.qid}:`, e.message);
                }
            }

            return {
                ...q,
                id: q.qid || q.id,
                qid: q.qid || q.id,
                subject: 'sst',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text,
                options: options,
                answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                image_url: q.image_location === 'null' ? null : q.image_location,
                variant: q.variant || (q.qid?.includes('-V') ? ('V' + q.qid.split('-V').pop()) : 'V0'),
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type,
                data: interactivePayload
            };
        }));

        BANK_CACHE[topicId] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        return transformed;

    } catch (error) {
        console.error("[SST Vault Service] Fetch Error:", error.message);
        return [];
    }
};

import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { ASSET_VERSION } from '../config/constants';
import { hydrateStepData } from '../engines/shared-engines/UniversalLogic';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_1_world_stage': 'world_stage',
    'quest_2_grid_master': 'latitudes_longitudes',
    'quest_3_calculating_time': 'time_calc',
    'quest_4_water_bodies': 'Water Bodies',
    'quest_5_coastal_features': 'coastal_features',
    'quest_6_regional_division_capital_cities': 'Regional Division Capital Cities',
    'quest_7_landlocked_countries': 'regions_capitals'
};

/**
 * Fetches and transforms questions from the unified Manya Vault.
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`🗄️ [SSTDB] Fetching bank for: ${subtopic}`);
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        let data = null;
        try {
            console.log(`📡 [SSTDB] Querying Supabase for fresh records...`);
            data = await storageFacade.get(`db:/manya_vault?subject=ilike:sst&or=subtopic.ilike.%${subtopic}%,subtopic.ilike.%${topicId}%`);
        } catch (dbErr) {
            console.warn(`⚠️ [SSTDB] Supabase query failed, falling back to local IndexedDB cache:`, dbErr);
            const allCached = await ManyaDB.getCachedQuestions('sst');
            const cached = allCached.filter(q => q.subtopic === subtopic);
            if (cached && cached.length > 0) {
                console.log(`💾 [SSTDB] Successfully loaded ${cached.length} questions from local IndexedDB.`);
                BANK_CACHE[subtopic] = cached;
                return cached;
            }
            data = [];
        }

        // FALLBACK: Aggressive Keyword Splitting (v4.5)
        if (!data || data.length === 0) {
            const cleanSub = subtopic.replace(/^quest_\d+_/, '').replace(/_/g, ' ');
            const keywords = cleanSub.split(' ').filter(k => k.length > 2); 
            
            if (keywords.length > 0) {
                console.log(`🔍 [SST Vault] No exact match for "${cleanSub}". Trying keywords:`, keywords);
                const keywordFilter = keywords.map(k => `subtopic.ilike.%${k}%,topic.ilike.%${k}%`).join(',');
                
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

            const isInteractive = q.item_type?.includes('INTERACTIVE') || q.item_type === 'SIMULATION' || q.item_type === 'RECAP' || q.engine_type;
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
                variant: q.qid.includes('-V') ? q.qid.split('-V')[1] : 'V0',
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type,
                data: interactivePayload
            };
        }));

        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        return transformed;

    } catch (error) {
        console.error("[SST Vault Service] Fetch Error:", error.message);
        return [];
    }
};

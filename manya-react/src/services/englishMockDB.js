import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { findQuestData } from './curriculumService';
import { assetUrl } from '../config/assetUrls';
import { ASSET_VERSION } from '../config/constants';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_01_holiday_kickoff': 'quest_01_holiday_kickoff',
    'quest_02_going_to_mastery': 'quest_02_going_to_mastery',
    'quest_03_question_tags_mastery': 'quest_03_question_tags_mastery',
    'quest_04_reported_speech_mastery': 'quest_04_reported_speech_mastery',
    'quest_05_village_arrival': 'quest_05_village_arrival',
    'quest_06_feeling_and_facts': 'quest_06_feeling_and_facts',
    'quest_07_past_regrets': 'quest_07_past_regrets',
    'quest_08_voice_mastery': 'quest_08_voice_mastery',
    'quest_09_final_review': 'quest_09_final_review',
    'quest_10_vault': 'Vault'
};

/**
 * Fetches and transforms ENGLISH questions from the unified Manya Vault.
 */
export const fetchEnglishQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`🗄️ [EnglishDB] Fetching bank for: ${subtopic}`);
        const subtopicLow = subtopic.toLowerCase();
        const isStorySearch = subtopicLow.includes('quest') || subtopicLow.includes('story') || topicId.toLowerCase().includes('quest');

        if (BANK_CACHE[subtopic] && !isStorySearch) return BANK_CACHE[subtopic];

        let data = null;
        try {
            console.log(`📡 [EnglishDB] Querying Supabase for fresh records...`);
            data = await storageFacade.get(`db:/manya_vault?subject=ilike:english&or=subtopic.ilike.%${subtopic}%,subtopic.ilike.%${topicId}%,qid.eq.${subtopic},qid.eq.${topicId}`);
        } catch (dbErr) {
            console.warn(`⚠️ [EnglishDB] Supabase query failed, falling back to local IndexedDB cache:`, dbErr);
            const allCached = await ManyaDB.getCachedQuestions('english');
            const cached = allCached.filter(q => q.subtopic === subtopic);
            const validQuestions = cached.filter(q => q.question && q.question !== 'None');
            const isBroken = cached.length > 0 && validQuestions.length === 0;

            if (cached && cached.length > 0 && !isBroken && !isStorySearch) {
                console.log(`💾 [EnglishDB] Successfully loaded ${cached.length} questions from local IndexedDB.`);
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
                console.log(`🔍 [English Vault] No exact match for "${cleanSub}". Trying keywords:`, keywords);
                const keywordFilter = keywords.map(k => `subtopic.ilike.%${k}%,topic.ilike.%${k}%`).join(',');
                
                const keywordData = await storageFacade.get(`db:/manya_vault?subject=ilike:english&or=${keywordFilter}`);
                
                if (keywordData?.length > 0) {
                    console.log(`✨ [English Vault] Discovered ${keywordData.length} related questions via keywords.`);
                    data = keywordData;
                }
            }
        }

        if (!data) data = [];

        // --- INJECT MISSING CURRICULUM RESOURCES ---
        try {
            const curriculumQuest = findQuestData('english', null, topicId) || findQuestData('english', null, subtopic);
            if (curriculumQuest && curriculumQuest.resources) {
                curriculumQuest.resources.forEach(res => {
                    const isNoteOrRecap = res.file.includes('recap') || res.file.includes('note') || res.file.includes('study');
                    const exists = data.some(d => d.qid === res.file || d.id === res.file);
                    
                    if (isNoteOrRecap && !exists) {
                        console.log(`[EnglishDB] Auto-injecting missing curriculum resource: ${res.file}`);
                        data.push({
                            id: res.file,
                            qid: res.file,
                            subject: 'english',
                            topic: topicId,
                            subtopic: subtopic,
                            item_type: res.file.includes('recap') ? 'RECAP' : 'NOTE',
                            engine_type: 'NOTE_EXPLORER',
                            cdn_url: assetUrl(`content/english/${curriculumQuest.folder}/${res.file}.json`),
                            question_text: `Explore ${res.label}`,
                            options: ["Ready!"],
                            correct_answer: "Ready!",
                            metadata: {}
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("[EnglishDB] Failed to auto-inject curriculum resources:", e);
        }

        if (data.length === 0) return [];

        const transformed = await Promise.all(data.map(async (q) => {
            const options = [q.option_a, q.option_b, q.option_c, q.option_d]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            // v9.9: Hardened Data Extraction - Ensuring interactive payloads are preserved
            let interactiveData = q.data || q.metadata || {};

            const isInteractive = q.item_type?.includes('INTERACTIVE') || q.item_type === 'SIMULATION' || q.item_type === 'RECAP' || q.engine_type;
            if (isInteractive && q.cdn_url) {
                try {
                    let cleanCdnUrl = q.cdn_url.replace('.net.net', '.net');
                    cleanCdnUrl = cleanCdnUrl.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                    cleanCdnUrl = cleanCdnUrl.replace('@main/', `@${ASSET_VERSION}/`);
                    
                    console.debug(`[EnglishDB] Fetching CDN Payload for ${q.qid}: ${cleanCdnUrl}`);
                    const fetchedData = await storageFacade.get(`file:${cleanCdnUrl}`);
                    if (fetchedData) {
                        interactiveData = { ...interactiveData, ...fetchedData };
                        console.log(`%c ✅ [EnglishDB] Hydrated Simulation: ${q.qid}`, 'color: #10b981; font-weight: bold;');
                    }
                } catch (e) {
                    console.warn(`[EnglishDB] CDN Fetch failed for ${q.qid}:`, e.message);
                }
            }

            return {
                id: q.qid || q.id,
                qid: q.qid || q.id,
                subject: 'english',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text,
                options: options,
                answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                variant: q.qid.includes('-V') ? 'V' + q.qid.split('-V')[1] : 'V0',
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type,
                engineType: q.engine_type,
                data: interactiveData, // CRITICAL: This was missing!
                // Backward compatibility mapping
                mapping: q.item_type === 'QUEST' || q.engine_type ? {
                    qid: q.qid,
                    engine_type: q.engine_type,
                    json_reference_path: q.cdn_url || q.qid, 
                    data: interactiveData,
                    vocabulary: q.metadata?.tags || []
                } : null
            };
        }));

        if (transformed.length > 0) {
            BANK_CACHE[subtopic] = transformed;
            await ManyaDB.cacheQuestions(transformed);
        }
        return transformed;

    } catch (error) {
        console.error("[English Vault Service] Fetch Error:", error.message);
        return [];
    }
};

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EXCEL_PATH = 'D:\\manya_garage\\archived data\\_archive\\content_backup\\main_bank\\english-p7-question-bank.xlsx';
const ASSET_VERSION = 'v2.0.2';
const APP_SUBJECT = 'ENGLISH'; 
const TOPIC_NAME = 'Primary 7 English';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function intelligentDecode(buffer) {
    const buf = Buffer.from(buffer);
    // Check for UTF-16 LE BOM (ff fe)
    if (buf[0] === 0xff && buf[1] === 0xfe) {
        return buf.toString('utf16le').replace(/^\uFEFF/, '').trim();
    }
    // Check for UTF-16 BE BOM (fe ff)
    if (buf[0] === 0xfe && buf[1] === 0xff) {
        return buf.toString('utf16be').replace(/^\uFEFF/, '').trim();
    }
    // Default to UTF-8
    return buf.toString('utf8').replace(/^\uFEFF/, '').trim();
}

async function syncEnglishCurriculum() {
    console.log('🚀 [Master Sync] Starting English P7 Curriculum Stabilization (v2.0.2)...');

    // 1. CLEANUP
    console.log('🧹 [1/3] Purging existing English curriculum data...');
    const { error: deleteError } = await supabase.from('manya_vault').delete().ilike('subject', 'english');
    if (deleteError) {
        console.error('❌ Delete Error:', deleteError);
        return;
    }
    console.log('✅ Purge complete.');

    // 2. EXCEL SYNC (RAW + REPHARASED)
    console.log(`📖 [2/3] Reading Excel sheets (RAW, REPHARASED) from ${EXCEL_PATH}...`);
    const wb = XLSX.readFile(EXCEL_PATH);
    const mcqData = [];

    ['RAW', 'REPHARASED'].forEach(sheetName => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) {
            console.warn(`⚠️ Sheet ${sheetName} not found.`);
            return;
        }
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`📦 Found ${rows.length} rows in ${sheetName}.`);

        rows.forEach(row => {
            mcqData.push({
                qid: row.q_id || row.qid || `ENG-MCQ-${Math.random().toString(36).substr(2, 9)}`,
                subject: APP_SUBJECT,
                topic: TOPIC_NAME,
                subtopic: row['sub-topic'] || row.subtopic || 'General holidays',
                difficulty: row.difficulty || 'M',
                item_type: 'MCQ',
                engine_type: 'MCQ',
                grade_level: 7, // FIXED: Added missing non-null column
                question_text: row.question_text || row.question || '',
                option_a: row.option_a || '',
                option_b: row.option_b || '',
                option_c: row.option_c || row.option_3 || '',
                option_d: row.option_d || row.option_4 || '',
                correct_answer: row.correct_answer || row.correct,
                explanation: row.detailed_solution || row.solution || '',
                hint: row.hint || '',
                metadata: { tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',') : row.tags) : [] }
            });
        });
    });

    console.log(`📤 Uploading ${mcqData.length} MCQs to Supabase...`);
    // Batching to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < mcqData.length; i += batchSize) {
        const batch = mcqData.slice(i, i + batchSize);
        const { error: mcqError } = await supabase.from('manya_vault').insert(batch);
        if (mcqError) {
            console.error(`❌ Insert Error (MCQ Batch ${i}):`, mcqError);
            break;
        }
        process.stdout.write(`.`);
    }
    console.log('\n✅ MCQ Sync complete.');

    // 3. GITHUB PROBE (SIMULATIONS)
    console.log('🔍 [3/3] Probing GitHub for Interactive Simulation JSONs...');
    const simData = [];
    const questFolders = [
        'quest_01_holiday_kickoff', 'quest_02_going_to_mastery', 'quest_03_question_tags_mastery',
        'quest_04_reported_speech_mastery', 'quest_05_village_arrival', 'quest_06_feeling_and_facts',
        'quest_07_past_regrets', 'quest_08_voice_mastery', 'quest_09_final_review'
    ];

    for (const folder of questFolders) {
        const questNumMatch = folder.match(/\d+/);
        if (!questNumMatch) continue;
        const questNum = questNumMatch[0];
        console.log(`📁 Probing ${folder}...`);
        
        const probeLimit = 15;
        const probes = [];
        for (let i = 1; i <= probeLimit; i++) {
            const simNum = String(i).padStart(3, '0');
            const url = `https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@${ASSET_VERSION}/content/english/holidays/${folder}/pq-${questNum}-${simNum}.json`;
            probes.push((async () => {
                try {
                    const response = await fetch(url);
                    if (response.status === 200) {
                        const buffer = await response.arrayBuffer();
                        const text = intelligentDecode(buffer);
                        const json = JSON.parse(text);
                        
                        return {
                            qid: json.qid || `PQ-SIM-ENG-${questNum}-${simNum}`,
                            subject: APP_SUBJECT,
                            grade_level: 7,
                            topic: TOPIC_NAME,
                            subtopic: folder,
                            difficulty: 'M',
                            item_type: 'SIMULATION',
                            engine_type: (json.engine_type || 'SENTENCE_BLOCKS').toUpperCase(),
                            question_text: (json.data?.question || json.data?.prompt || folder).substring(0, 250), // FIXED: Missing not-null field
                            interaction_config: json.data || json,
                            metadata: { tags: ['INTERACTIVE', 'SIMULATION', folder] }
                        };
                    }
                } catch (e) {
                    if (!url.endsWith('pq-01-015.json')) { /* silence common 404s */ }
                    else { console.error(`Failed to parse ${url}: ${e.message}`); }
                }
                return null;
            })());
        }
        
        const results = await Promise.all(probes);
        const found = results.filter(Boolean);
        if (found.length > 0) {
            console.log(`✨ DISCOVERED ${found.length} simulations in ${folder}.`);
            simData.push(...found);
        }

        // 📁 [IDENTITY PROBE] Find the main Folder Story (e.g. 01_holiday_kickoff.json)
        const folderPrefix = questNum; // e.g. "01"
        const folderNamePart = folder.replace(`quest_${questNum}_`, '');
        const identityFilename = `${folderPrefix}_${folderNamePart}.json`;
        const identityUrl = `https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@${ASSET_VERSION}/content/english/holidays/${folder}/${identityFilename}`;
        
        try {
            const identityRes = await fetch(identityUrl);
            if (identityRes.status === 200) {
                const buffer = await identityRes.arrayBuffer();
                const text = intelligentDecode(buffer);
                const json = JSON.parse(text);

                simData.push({
                    qid: `ENGLISH_MASTER_PATH_${folder.toUpperCase()}_IDENTITY`,
                    subject: APP_SUBJECT,
                    grade_level: 7,
                    topic: TOPIC_NAME,
                    subtopic: folder,
                    difficulty: 'E',
                    item_type: 'QUEST_STORY',
                    engine_type: 'CHAT',
                    question_text: `Identity: ${folder}`,
                    interaction_config: json.data || json,
                    metadata: { tags: ['STORY', 'IDENTITY', folder] }
                });
                console.log(`📜 DISCOVERED Story Identity: ${identityFilename}`);
            }
        } catch (e) {
            console.warn(`⚠️ Identity skip for ${folder}: ${e.message}`);
        }
    }

    if (simData.length > 0) {
        console.log(`📤 Uploading ${simData.length} Simulations to Supabase...`);
        const { error: simError } = await supabase.from('manya_vault').insert(simData);
        if (simError) {
            console.error('❌ Insert Error (Sims):', simError);
        } else {
            console.log('✅ Simulation Sync complete.');
        }
    } else {
        console.warn('⚠️ No simulations discovered on GitHub.');
    }

    console.log('🏁 [Master Sync] English Curriculum Stabilized and Synchronized.');
}

syncEnglishCurriculum();

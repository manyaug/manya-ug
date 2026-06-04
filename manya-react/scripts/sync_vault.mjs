import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isReset = process.argv.includes('--reset');

// ─── Configuration ──────────────────────────────────────
const EXCEL_DIR = 'D:\\manya_garage\\archived data\\_archive\\content_backup\\main_bank';
const FILE_MAP = [
    { file: 'eng-p7-question-bank.xlsx', subject: 'ENGLISH' },
    { file: 'math_p7_question_bank.xlsx', subject: 'MATH' },
    { file: 'science-p7-question-bank.xlsx', subject: 'SCIENCE' },
    { file: 'sst_p7_question_bank.xlsx', subject: 'SST' }
];

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const LOCAL_CURRICULUM_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.8/';
const TABLE_NAME = 'manya_vault';
const GRADE_LEVEL = 7;
const CHUNK_SIZE = 50;
const MAX_RETRIES = 3;

// Map top-level folder names → DB subject names
const SUBJECT_MAP = { math: 'MATH', science: 'SCIENCE', sst: 'SST', english: 'ENGLISH' };

// ─── Utility: Read JSON with encoding detection ─────────
function readJsonFile(filePath) {
    const buf = fs.readFileSync(filePath);
    let text;
    // Detect UTF-16LE BOM (ff fe)
    if (buf[0] === 0xff && buf[1] === 0xfe) {
        text = buf.toString('utf16le');
    } else {
        text = buf.toString('utf8');
    }
    // Strip BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return JSON.parse(text);
}

// ─── Utility: Walk directory recursively ────────────────
function walkDir(dir, filter) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(walkDir(fullPath, filter));
        } else if (!filter || filter(entry)) {
            results.push(fullPath);
        }
    }
    return results;
}

// ─── Classify item_type from JSON content ────────────
function classifyItemType(payload, fileName, isExcel = false) {
    if (isExcel) return "MCQ's";
    
    const data = payload || {};
    const mode = data.mode;
    const engineType = data.engineType || data.engine_type;
    const lowerName = String(fileName || '').toLowerCase();

    // 1. Recaps
    if (lowerName.includes('recap') || mode === 'recap') {
        return "Recaps";
    }

    // 2. Notes
    if (lowerName.startsWith('note_') || mode === 'note_explorer' || lowerName.includes('note')) {
        return "Notes";
    }

    // 3. Interactive Study
    if (lowerName.includes('study') || lowerName.includes('guide') || lowerName.includes('rule') || mode === 'study') {
        if (engineType && engineType !== 'MCQ_STANDALONE') {
            return "Interactive_study";
        }
        return "Notes";
    }

    // 4. MCQ's
    const hasOptions = !!(data.options && data.options.length > 0) || 
                       !!(data.option_a || data.option_b) ||
                       (data.questions && data.questions.some(q => q.options || q.choices));
    const hasAnswer = !!(data.answer || data.correct_answer) ||
                      (data.questions && data.questions.some(q => q.answer || q.correct_answer || q.expected));

    if (engineType === 'MCQ_STANDALONE' || (hasOptions && hasAnswer && !engineType) || lowerName.startsWith('pq-') || lowerName.includes('quiz') || lowerName.includes('practice')) {
        return "MCQ's";
    }

    // 5. Interactive Questions
    return "Interactive_questions";
}

// ─── Resolve actual engine type ──────────────────────────
function resolveEngineType(payload, qid, subject, itemType) {
    const data = payload || {};
    const sub = String(subject || data?.subject || '').trim().toLowerCase();
    const id = String(qid || data?.qid || '').trim().toLowerCase();
    const topic = String(data?.topic || data?.subtopic || '').trim().toLowerCase();

    // 0. Explicit QID Keywords
    if (id.includes('recap')) return 'STUDY_RECAP';
    if (id.includes('note')) return 'NOTE_EXPLORER';
    if (id.includes('study_sim')) return 'NOTE_EXPLORER';

    // 1. Explicit Engine Type
    const raw = data?.engineType || data?.engine_type || data?.type || "";
    let type = String(raw).toUpperCase().trim();
    
    const genericTypes = ['MCQ', 'SIMULATION', 'INTERACTIVE_QUESTION', 'INTERACTIVE_STUDY', 'NOTE', 'RECAP'];
    if (type && !genericTypes.includes(type)) return type;

    // 2. Math-Specific Topic Routing
    if (sub === 'math') {
        if (topic.includes('set_theory') || topic.includes('subset') || topic.includes('venn')) return 'SET_THEORY';
        if (topic.includes('binary') || topic.includes('logic_gate')) return 'BINARY_GAME';
        if (topic.includes('probability')) return 'VENN_PROB';
        if (topic.includes('coordinate') || topic.includes('graph')) return 'COORDINATE_GAME';
    }

    // 3. Shared Heuristics
    if (data?.study_notes || data?.mode === 'note_explorer' || itemType === 'Notes' || itemType === 'Interactive_study') return 'NOTE_EXPLORER';
    if (itemType === 'Recaps') return 'STUDY_RECAP';

    // 4. Fallback for generic simulations
    if (itemType === 'Interactive_questions') {
        if (sub === 'english') return 'THREE_D_STUDY';
        if (sub === 'science') return '3D_SKELETON';
        return 'NOTE_EXPLORER';
    }
    
    return 'MCQ_STANDALONE';
}

// ─── Extract MCQ Options and Correct Answer ─────────────
function extractMCQData(payload, rowOptionA, rowOptionB, rowOptionC, rowOptionD, rowCorrectAnswer) {
    let option_a = rowOptionA || null;
    let option_b = rowOptionB || null;
    let option_c = rowOptionC || null;
    let option_d = rowOptionD || null;
    let correct_answer = rowCorrectAnswer || null;

    if (payload) {
        const q = payload.questions?.[0] || payload;
        const options = q.options || q.choices || [];
        if (options.length > 0) {
            option_a = options[0] || null;
            option_b = options[1] || null;
            option_c = options[2] || null;
            option_d = options[3] || null;
        } else {
            option_a = q.option_a || q.optionA || option_a;
            option_b = q.option_b || q.optionB || option_b;
            option_c = q.option_c || q.optionC || option_c;
            option_d = q.option_d || q.optionD || option_d;
        }
        correct_answer = q.correct_answer || q.correctAnswer || q.answer || q.expected || correct_answer;
    }

    return { option_a, option_b, option_c, option_d, correct_answer };
}

// ─── Wipe ───────────────────────────────────────────────
async function wipeDatabase() {
    console.log(`\n==========================================`);
    console.log(`🧹 WIPING MANYA_VAULT DATABASE...`);
    console.log(`==========================================\n`);
    for (const sub of ['ENGLISH', 'MATH', 'SCIENCE', 'SST']) {
        console.log(`  Deleting ${sub} records...`);
        const { error, count } = await supabase
            .from(TABLE_NAME).delete({ count: 'exact' }).eq('subject', sub);
        if (error) console.error(`  ❌ Failed to delete ${sub}:`, error.message);
        else console.log(`  ✅ Cleared ${sub} (${count || 0} rows)`);
    }
    console.log(`\n✨ Wipe complete!\n`);
}

// Build a master lookup mapping from clean human-readable subtopic/quest labels to quest folders
let LABEL_TO_FOLDER_MAP = {};

function initNomenclatureMap() {
    if (!fs.existsSync(LOCAL_CURRICULUM_PATH)) {
        console.warn(`⚠️ Local curriculum master not found at ${LOCAL_CURRICULUM_PATH} for nomenclature mapping`);
        return;
    }
    try {
        const curriculum = JSON.parse(fs.readFileSync(LOCAL_CURRICULUM_PATH, 'utf8'));
        for (const sub of Object.keys(curriculum)) {
            const uppercaseSubject = sub.toUpperCase();
            LABEL_TO_FOLDER_MAP[uppercaseSubject] = LABEL_TO_FOLDER_MAP[uppercaseSubject] || {};
            
            for (const unit of (curriculum[sub].units || [])) {
                for (const quest of (unit.quests || [])) {
                    if (quest.label && quest.folder) {
                        const cleanLabel = quest.label.trim().toLowerCase().replace(/[-_ ]/g, '');
                        LABEL_TO_FOLDER_MAP[uppercaseSubject][cleanLabel] = quest.folder;
                    }
                }
            }
        }
        
        // Explicit mappings to guarantee 100% precision across all subjects
        LABEL_TO_FOLDER_MAP['SST'] = {
            ...LABEL_TO_FOLDER_MAP['SST'],
            'theworldstage': 'quest_1_world_stage',
            'worldstage': 'quest_1_world_stage',
            'gridmath': 'quest_2_grid_master',
            'gridmaster': 'quest_2_grid_master',
            'calculatingtime': 'quest_3_calculating_time',
            'waterbodies': 'quest_4_water_bodies',
            'coastalfeatures': 'quest_5_coastal_features',
            'regionsandcapitals': 'quest_6_regional_division_capital_cities',
            'regionaldivisioncapitalcities': 'quest_6_regional_division_capital_cities',
            'landlockedcountries': 'quest_7_landlocked_countries'
        };

        LABEL_TO_FOLDER_MAP['MATH'] = {
            ...LABEL_TO_FOLDER_MAP['MATH'],
            'finitevsinfinitesets': 'quest_01_finite_infinite_sets',
            'setnotationregions': 'quest_02_set_notation_regions',
            'calculatingsubsets': 'quest_03_calculating_subsets',
            'calculatingpropersubsets': 'quest_04_calculating_proper_subsets',
            'workingbackwards': 'quest_05_working_backwards',
            'placinginfoonvenndiagrams': 'quest_06_placing_info_on_venn_diagrams',
            'venndiagramplacement': 'quest_06_placing_info_on_venn_diagrams',
            'solvingforunknowns': 'quest_07_solving_for_unknowns',
            'applicationofsets': 'quest_08_application_of_sets',
            'differenceofsetscomplements': 'quest_09_difference_of_sets_complements',
            'differencecomplements': 'quest_09_difference_of_sets_complements',
            'probabilityusingvenndiagrams': 'quest_10_probability_using_venn_diagrams',
            'probabilityvenndiagrams': 'quest_10_probability_using_venn_diagrams'
        };

        LABEL_TO_FOLDER_MAP['SCIENCE'] = {
            ...LABEL_TO_FOLDER_MAP['SCIENCE'],
            'typesofskeleton': 'quest_1_types_of_skeletons',
            'humanskeleton': 'quest_2_human_skeleton',
            'axialskullspine': 'quest_3_axial_skull_spine',
            'axialribcage': 'quest_4_axial_rib_cage',
            'appendicularlimbs': 'quest_5_appendicular_limbs',
            'bonestructure': 'quest_6_bone_structure',
            'jointsstructure': 'quest_7_joints_structure',
            'hingeballandsocket': 'quest_8_hinge_ball-and-socket',
            'pivotandgliding': 'quest_9_pivot_and_gliding',
            'muscularsystemtypes': 'quest_10_muscular_system_types',
            'muscleactionantagonisticpairs': 'quest_11_muscle_action_antagonistic_pairs',
            'postureandteeth': 'quest_12_posture_and_teeth',
            'disordersandfirstaid': 'quest_13_disorders_and_first_aid',
            'bonediseases': 'quest_14_bone_diseases'
        };

        LABEL_TO_FOLDER_MAP['ENGLISH'] = {
            ...LABEL_TO_FOLDER_MAP['ENGLISH'],
            'vault': 'quest_10_vault',
            'holidaykickoff': 'quest_01_holiday_kickoff',
            'goingtomastery': 'quest_02_going_to_mastery',
            'questiontagsmastery': 'quest_03_question_tags_mastery',
            'reportedspeechmastery': 'quest_04_reported_speech_mastery',
            'villagearrival': 'quest_05_village_arrival',
            'feelingandfacts': 'quest_06_feeling_and_facts',
            'pastregrets': 'quest_07_past_regrets',
            'voicemastery': 'quest_08_voice_mastery',
            'finalreview': 'quest_09_final_review'
        };
        
        console.log(`📋 Nomenclature map initialized successfully for subjects:`, Object.keys(LABEL_TO_FOLDER_MAP));
    } catch (e) {
        console.error(`⚠️ Failed to build nomenclature map:`, e.message);
    }
}

function getBestQuestFolder(subject, subtopic) {
    if (!subtopic) return null;
    const subjUpper = String(subject).toUpperCase();
    const cleanSub = subtopic.trim().toLowerCase().replace(/[-_ ]/g, '');
    
    // Direct lookup in our dynamic label-to-folder map
    if (LABEL_TO_FOLDER_MAP[subjUpper]?.[cleanSub]) {
        return LABEL_TO_FOLDER_MAP[subjUpper][cleanSub];
    }
    
    // Fallback fuzzy search if it contains parts of the folder name
    if (LABEL_TO_FOLDER_MAP[subjUpper]) {
        for (const cleanLabel of Object.keys(LABEL_TO_FOLDER_MAP[subjUpper])) {
            const folder = LABEL_TO_FOLDER_MAP[subjUpper][cleanLabel];
            const cleanFolder = folder.toLowerCase().replace(/[-_ ]/g, '');
            if (cleanFolder.includes(cleanSub) || cleanSub.includes(cleanFolder) || cleanFolder.replace(/^quest\d+/, '').includes(cleanSub)) {
                return folder;
            }
        }
    }
    
    return subtopic;
}

// ─── Excel Processing ───────────────────────────────────
function processExcelFile(fileName, subject) {
    const filePath = path.join(EXCEL_DIR, fileName);
    console.log(`📥 Reading Excel for ${subject} from ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`  ❌ File not found: ${filePath}`);
        return [];
    }

    let workbook;
    try { workbook = xlsx.readFile(filePath); }
    catch (err) { console.error(`  ❌ Error reading: ${err.message}`); return []; }

    let allRawData = [];
    workbook.SheetNames.forEach(sheetName => {
        allRawData = allRawData.concat(xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }));
    });

    const seenQids = new Set();
    const formattedData = allRawData.map((row) => {
        const cleanRow = {};
        for (const key in row) {
            if (!row.hasOwnProperty(key)) continue;
            const newKey = key.trim().toLowerCase().replace(/[-_ ]/g, '');
            let val = row[key];
            if (typeof val === 'string') {
                val = val.trim();
                if (val === 'NaN' || val === 'null' || val === '') val = null;
            }
            cleanRow[newKey] = val;
        }

        const qid = cleanRow.qid || cleanRow.id || null;
        if (!qid || seenQids.has(qid)) return null;
        seenQids.add(qid);

        let tags = [];
        if (cleanRow.tags) {
            try {
                const raw = String(cleanRow.tags);
                tags = raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map(s => s.trim());
            } catch { tags = [String(cleanRow.tags)]; }
        }

        const item_type = "MCQ's";
        const engine_type = resolveEngineType(null, qid, subject, item_type);

        let cdn_url = cleanRow.filepathsim || cleanRow.jsonreferencepath || null;
        if (cdn_url) {
            if (cdn_url.includes('manyaug/manya-react-assets')) {
                const match = cdn_url.match(/content\/.+$/i);
                if (match) {
                    cdn_url = '/' + match[0];
                }
            } else if (!cdn_url.startsWith('/')) {
                cdn_url = '/' + cdn_url;
            }
        }

        const rawSubtopic = cleanRow.subtopic || null;
        const resolvedSubtopic = getBestQuestFolder(subject, rawSubtopic);

        return {
            qid, subject,
            grade_level:    GRADE_LEVEL,
            topic:          cleanRow.topic || null,
            subtopic:       resolvedSubtopic,
            difficulty:     cleanRow.difficulty || 'E',
            item_type,
            question_text:  cleanRow.questiontext || null,
            option_a:       cleanRow.optiona || null,
            option_b:       cleanRow.optionb || null,
            option_c:       cleanRow.optionc || null,
            option_d:       cleanRow.optiond || null,
            correct_answer: cleanRow.correctanswer || null,
            hint:           cleanRow.hint || null,
            explanation:    cleanRow.detailedsolution || cleanRow.explanation || null,
            engine_type,
            cdn_url,
            passage:        cleanRow.passage || null,
            metadata:       { tags, term: cleanRow.term || null }
        };
    }).filter(Boolean);

    console.log(`  ✅ ${formattedData.length} records (${allRawData.length - formattedData.length} skipped)\n`);
    return formattedData;
}

// ─── Phase 2A: Curriculum Master → Interactive records ──
function buildCurriculumRecords() {
    console.log(`🌐 Phase 2A: Building records from curriculum-master.json...`);

    if (!fs.existsSync(LOCAL_CURRICULUM_PATH)) {
        console.error(`  ❌ curriculum-master.json not found`);
        return [];
    }

    const curriculum = JSON.parse(fs.readFileSync(LOCAL_CURRICULUM_PATH, 'utf8'));
    const records = [];
    let found = 0, missing = 0;

    for (const subject of Object.keys(curriculum)) {
        const uppercaseSubject = subject.toUpperCase();
        for (const unit of (curriculum[subject].units || [])) {
            const unitId = unit.id;
            for (const quest of (unit.quests || [])) {
                const questFolder = quest.folder;
                for (const res of (quest.resources || [])) {
                    if (!res.file) continue;
                    const fileName = res.file;
                    const localPath = path.join(ASSETS_ROOT, 'content', subject, unitId, questFolder, `${fileName}.json`);

                    let payload = null;
                    if (fs.existsSync(localPath)) {
                        try {
                            payload = readJsonFile(localPath);
                        } catch { /* skip */ }
                        found++;
                    } else { missing++; }

                    const item_type = classifyItemType(payload, fileName);
                    const engine_type = resolveEngineType(payload, fileName, uppercaseSubject, item_type);
                    const cdn_url = `/content/${subject}/${unitId}/${questFolder}/${fileName}.json`;

                    let option_a = null, option_b = null, option_c = null, option_d = null, correct_answer = null;
                    if (item_type === "MCQ's") {
                        const mcq = extractMCQData(payload);
                        option_a = mcq.option_a;
                        option_b = mcq.option_b;
                        option_c = mcq.option_c;
                        option_d = mcq.option_d;
                        correct_answer = mcq.correct_answer;
                    }

                    records.push({
                        qid: fileName, subject: uppercaseSubject, grade_level: GRADE_LEVEL,
                        topic: unitId, subtopic: questFolder,
                        item_type, engine_type, cdn_url,
                        question_text: payload?.variantTitle || payload?.title || payload?.topic || `Explore ${res.label || fileName}`,
                        option_a, option_b, option_c, option_d, correct_answer,
                        metadata: { is_interactive: true, label: res.label || null, source: 'curriculum-master' }
                    });
                }
            }
        }
    }
    console.log(`  ✅ ${records.length} records (${found} read, ${missing} missing)\n`);
    return records;
}

// ─── Phase 2B: Full Filesystem Scan → SIM-* files ───────
function buildSIMRecords() {
    console.log(`📂 Phase 2B: Scanning filesystem for SIM-* files...`);

    const contentRoot = path.join(ASSETS_ROOT, 'content');
    const simFiles = walkDir(contentRoot, name => name.startsWith('SIM-') && name.endsWith('.json'));
    const records = [];
    let parsed = 0, errors = 0;

    for (const filePath of simFiles) {
        const fileName = path.basename(filePath, '.json');
        const relPath = path.relative(contentRoot, filePath).split(path.sep);

        if (relPath.length < 4) continue; // malformed path

        const subjectDir = relPath[0];    // e.g. 'science'
        const unitId = relPath[1];        // e.g. 'musklo-skeletal-system'
        const questFolder = relPath[2];   // e.g. 'quest_4_axial_rib_cage'
        const subject = SUBJECT_MAP[subjectDir] || subjectDir.toUpperCase();

        let payload = null;
        try {
            payload = readJsonFile(filePath);
            parsed++;
        } catch (e) {
            errors++;
        }

        const item_type = classifyItemType(payload, fileName);
        const engine_type = resolveEngineType(payload, fileName, subject, item_type);
        const cdn_url = `/content/${subjectDir}/${unitId}/${questFolder}/${fileName}.json`;

        let option_a = null, option_b = null, option_c = null, option_d = null, correct_answer = null;
        if (item_type === "MCQ's") {
            const mcq = extractMCQData(payload);
            option_a = mcq.option_a;
            option_b = mcq.option_b;
            option_c = mcq.option_c;
            option_d = mcq.option_d;
            correct_answer = mcq.correct_answer;
        }

        records.push({
            qid: fileName, subject, grade_level: GRADE_LEVEL,
            topic: unitId, subtopic: questFolder,
            item_type, engine_type, cdn_url,
            question_text: payload?.variantTitle || payload?.title || payload?.topic || `Interactive ${fileName}`,
            option_a, option_b, option_c, option_d, correct_answer,
            metadata: { is_interactive: true, source: 'filesystem-scan' }
        });
    }

    console.log(`  ✅ ${records.length} SIM-* records (${parsed} parsed, ${errors} encoding errors)\n`);
    return records;
}

// ─── Phase 2C: Filesystem Scan → pq-* files ────────────
function buildPQRecords() {
    console.log(`📂 Phase 2C: Scanning filesystem for pq-* files...`);

    const contentRoot = path.join(ASSETS_ROOT, 'content');
    const pqFiles = walkDir(contentRoot, name => name.startsWith('pq-') && name.endsWith('.json'));
    const records = [];
    let parsed = 0, errors = 0;

    for (const filePath of pqFiles) {
        const fileName = path.basename(filePath, '.json');
        const relPath = path.relative(contentRoot, filePath).split(path.sep);
        if (relPath.length < 4) continue;

        const subjectDir = relPath[0];
        const unitId = relPath[1];
        const questFolder = relPath[2];
        const subject = SUBJECT_MAP[subjectDir] || subjectDir.toUpperCase();

        let payload = null;
        try {
            payload = readJsonFile(filePath);
            parsed++;
        } catch { errors++; }

        const item_type = classifyItemType(payload, fileName);
        const engine_type = resolveEngineType(payload, fileName, subject, item_type);
        const cdn_url = `/content/${subjectDir}/${unitId}/${questFolder}/${fileName}.json`;

        let option_a = null, option_b = null, option_c = null, option_d = null, correct_answer = null;
        if (item_type === "MCQ's") {
            const mcq = extractMCQData(payload);
            option_a = mcq.option_a;
            option_b = mcq.option_b;
            option_c = mcq.option_c;
            option_d = mcq.option_d;
            correct_answer = mcq.correct_answer;
        }

        records.push({
            qid: fileName, subject, grade_level: GRADE_LEVEL,
            topic: unitId, subtopic: questFolder,
            item_type, engine_type, cdn_url,
            question_text: payload?.variantTitle || payload?.title || payload?.topic || `Practice ${fileName}`,
            option_a, option_b, option_c, option_d, correct_answer,
            metadata: { is_interactive: true, source: 'filesystem-scan' }
        });
    }

    console.log(`  ✅ ${records.length} pq-* records (${parsed} parsed, ${errors} encoding errors)\n`);
    return records;
}

// ─── Bulk Insert with Retry ─────────────────────────────
async function bulkInsert(data) {
    console.log(`🚀 Uploading ${data.length} records to ${TABLE_NAME} (chunk size: ${CHUNK_SIZE})...\n`);
    let totalUploaded = 0, totalFailed = 0;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        let success = false;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const { error } = await supabase.from(TABLE_NAME).insert(chunk);
            if (!error) {
                totalUploaded += chunk.length;
                process.stdout.write(`\r  ✅ Uploaded [${totalUploaded}/${data.length}]`);
                success = true;
                break;
            }
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            } else {
                console.error(`\n  ❌ Chunk ${i} failed: ${error.message}`);
                if (error.details) console.error(`     Details: ${error.details}`);
                totalFailed += chunk.length;
            }
        }
    }

    console.log(`\n\n  📊 Results: ${totalUploaded} uploaded, ${totalFailed} failed out of ${data.length} total`);
    if (totalFailed === 0) console.log(`  ⭐ Perfect sync — all records inserted!\n`);
    else console.warn(`  ⚠️  Some records failed. Check errors above.\n`);
}

// ─── Main ───────────────────────────────────────────────
async function run() {
    console.log(`\n⚡ MANYA_VAULT UNIVERSAL SYNC (v3.0.8) ⚡\n`);
    initNomenclatureMap();

    if (isReset) {
        await wipeDatabase();
    } else {
        console.log(`⚠️  Running without --reset. Inserts will fail if QIDs already exist.\n`);
    }

    let allData = [];

    // Copy curriculum-master.json to local public/ directory
    if (fs.existsSync(LOCAL_CURRICULUM_PATH)) {
        const destPath = path.join(__dirname, '..', 'public', 'curriculum-master.json');
        fs.copyFileSync(LOCAL_CURRICULUM_PATH, destPath);
        console.log(`📋 Copied fresh curriculum-master.json to public/ directory!`);
    } else {
        console.warn(`⚠️  Could not find local curriculum-master.json at ${LOCAL_CURRICULUM_PATH}`);
    }

    // Phase 1: Excel MCQs
    for (const f of FILE_MAP) {
        allData = allData.concat(processExcelFile(f.file, f.subject));
    }

    // Phase 2A: Curriculum master interactive JSONs
    allData = allData.concat(buildCurriculumRecords());

    // Phase 2B: SIM-* files from filesystem (new naming scheme)
    allData = allData.concat(buildSIMRecords());

    // Phase 2C: pq-* files from filesystem (English practice questions)
    allData = allData.concat(buildPQRecords());

    // Phase 3: De-duplicate by QID (first occurrence wins)
    const uniqueMap = new Map();
    for (const row of allData) {
        if (!uniqueMap.has(row.qid)) {
            uniqueMap.set(row.qid, row);
        }
    }
    const uniqueData = [...uniqueMap.values()];

    console.log(`📋 Total unique records to sync: ${uniqueData.length}\n`);

    // Phase 4: Upload
    if (uniqueData.length > 0) {
        await bulkInsert(uniqueData);
    } else {
        console.log("No data found to sync.");
    }
}

run();

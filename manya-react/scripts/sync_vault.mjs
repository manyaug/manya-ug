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
    { file: 'english-p7-question-bank.xlsx', subject: 'ENGLISH' },
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

// ─── Classify item_type from JSON mode field ────────────
function classifyItemType(mode, fileName) {
    if (mode === 'quiz' || mode === 'puzzle') return 'INTERACTIVE_QUESTION';
    if (mode === 'study' || mode === 'note_explorer') return 'INTERACTIVE_STUDY';
    if (mode === 'recap') return 'RECAP';
    // Fallback: use filename heuristics when mode is missing
    if (fileName.includes('recap')) return 'RECAP';
    if (fileName.includes('study') || fileName.includes('note') || fileName.includes('rule') || fileName.includes('dict')) return 'INTERACTIVE_STUDY';
    return 'INTERACTIVE_QUESTION';
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

        return {
            qid, subject,
            grade_level:    GRADE_LEVEL,
            topic:          cleanRow.topic || null,
            subtopic:       cleanRow.subtopic || null,
            difficulty:     cleanRow.difficulty || 'E',
            item_type:      cleanRow.questiontype || 'MCQ',
            question_text:  cleanRow.questiontext || null,
            option_a:       cleanRow.optiona || null,
            option_b:       cleanRow.optionb || null,
            option_c:       cleanRow.optionc || null,
            option_d:       cleanRow.optiond || null,
            correct_answer: cleanRow.correctanswer || null,
            hint:           cleanRow.hint || null,
            explanation:    cleanRow.detailedsolution || cleanRow.explanation || null,
            engine_type:    cleanRow.enginetypesim || cleanRow.enginetype || null,
            cdn_url:        cleanRow.filepathsim || cleanRow.jsonreferencepath || null,
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

                    let engine_type = null, jsonMode = null;
                    if (fs.existsSync(localPath)) {
                        try {
                            const payload = readJsonFile(localPath);
                            engine_type = payload.engineType || payload.engine_type || null;
                            jsonMode = payload.mode || null;
                        } catch { /* skip */ }
                        found++;
                    } else { missing++; }

                    const item_type = classifyItemType(jsonMode, fileName);
                    const cdn_url = `${CDN_BASE}content/${subject}/${unitId}/${questFolder}/${fileName}.json`;

                    records.push({
                        qid: fileName, subject: uppercaseSubject, grade_level: GRADE_LEVEL,
                        topic: unitId, subtopic: questFolder,
                        item_type, engine_type, cdn_url,
                        question_text: `Explore ${res.label || fileName}`,
                        option_a: 'Ready!', correct_answer: 'Ready!',
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
        // Derive subject/unit/quest from directory structure
        // e.g. .../content/science/musklo-skeletal-system/quest_4_axial_rib_cage/SIM-SC7-T1-4-0004.json
        const relPath = path.relative(contentRoot, filePath).split(path.sep);
        // relPath = ['science', 'musklo-skeletal-system', 'quest_4_axial_rib_cage', 'SIM-SC7-T1-4-0004.json']

        if (relPath.length < 4) continue; // malformed path

        const subjectDir = relPath[0];    // e.g. 'science'
        const unitId = relPath[1];        // e.g. 'musklo-skeletal-system'
        const questFolder = relPath[2];   // e.g. 'quest_4_axial_rib_cage'
        const subject = SUBJECT_MAP[subjectDir] || subjectDir.toUpperCase();

        let engine_type = null, jsonMode = null, variantTitle = null;
        try {
            const payload = readJsonFile(filePath);
            engine_type = payload.engineType || payload.engine_type || null;
            jsonMode = payload.mode || null;
            variantTitle = payload.variantTitle || payload.topic || null;
            parsed++;
        } catch (e) {
            errors++;
        }

        const item_type = classifyItemType(jsonMode, fileName);
        const cdn_url = `${CDN_BASE}content/${subjectDir}/${unitId}/${questFolder}/${fileName}.json`;

        records.push({
            qid: fileName, subject, grade_level: GRADE_LEVEL,
            topic: unitId, subtopic: questFolder,
            item_type, engine_type, cdn_url,
            question_text: variantTitle || `Interactive ${fileName}`,
            option_a: 'Ready!', correct_answer: 'Ready!',
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

        let engine_type = null, jsonMode = null, variantTitle = null;
        try {
            const payload = readJsonFile(filePath);
            engine_type = payload.engineType || payload.engine_type || null;
            jsonMode = payload.mode || null;
            variantTitle = payload.variantTitle || payload.topic || null;
            parsed++;
        } catch { errors++; }

        const item_type = classifyItemType(jsonMode, fileName);
        const cdn_url = `${CDN_BASE}content/${subjectDir}/${unitId}/${questFolder}/${fileName}.json`;

        records.push({
            qid: fileName, subject, grade_level: GRADE_LEVEL,
            topic: unitId, subtopic: questFolder,
            item_type, engine_type, cdn_url,
            question_text: variantTitle || `Practice ${fileName}`,
            option_a: 'Ready!', correct_answer: 'Ready!',
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

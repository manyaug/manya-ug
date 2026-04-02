const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeKey(k) {
  return k.trim().toLowerCase().replace(/[^a-z0-string]/g, '');
}

async function processFile(filePath, subject) {
  const tableName = `questions_${subject}`;
  console.log(`Processing ${subject} from ${filePath} into ${tableName}`);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });
  
  const formattedData = rawData.map(row => {
    let cleanRow = {};
    for (let key in row) {
      if (row.hasOwnProperty(key)) {
        // e.g. " q_id " -> "qid"
        let newKey = key.trim().toLowerCase().replace(/[-_]/g, '');
        // Exceptions
        if (newKey === 'parentid') newKey = 'parentid';
        if (newKey === 'subtopic' || newKey === 'subtopic') newKey = 'subtopic';
        
        // value cleanup
        let val = row[key];
        if (typeof val === 'string') {
          val = val.trim();
          if (val === 'NaN' || val === 'null' || val === '') val = null;
        }
        
        // special JSON parse for tags or detailed solution?
        // tags usually come in as string "[...]"
        
        cleanRow[newKey] = val;
      }
    }
    
    // required cleanup mappings
    return {
      qid: cleanRow.qid || cleanRow.id || null, // ensure qid exists
      term: cleanRow.term || null,
      topic: cleanRow.topic || null,
      subtopic: cleanRow.subtopic || null,
      difficulty: cleanRow.difficulty || null,
      questiontype: cleanRow.questiontype || null,
      questiontext: cleanRow.questiontext || null,
      optiona: cleanRow.optiona || null,
      optionb: cleanRow.optionb || null,
      optionc: cleanRow.optionc || null,
      optiond: cleanRow.optiond || null,
      correctanswer: cleanRow.correctanswer || null,
      hint: cleanRow.hint || null,
      detailedsolution: cleanRow.detailedsolution || null,
      imagelocation: cleanRow.imagelocation || null,
      tags: cleanRow.tags || null,
      // mapping simulation fields if any
      engine_type: cleanRow.enginetypesim || cleanRow.enginetype || null,
      mode: cleanRow.modesim || cleanRow.mode || null,
      json_reference_path: cleanRow.filepathsim || cleanRow.jsonreferencepath || null,
      filename: cleanRow.filenamesim || cleanRow.filename || null
    };
  }).filter(row => row.qid); // must have qid

  console.log(`Found ${formattedData.length} valid records for ${subject}. Attempting to upload...`);

  // Upload in chunks
  const chunkSize = 100;
  for (let i = 0; i < formattedData.length; i += chunkSize) {
    const chunk = formattedData.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'qid' });
    if (error) {
      console.error(`Error uploading chunk ${i} - ${i + chunkSize}:`, error);
    } else {
      console.log(`Uploaded chunk ${i} - ${i + chunkSize}.`);
    }
  }
}

async function run() {
  await processFile('D:/garage/archived data/_archive/content_backup/math_p7_question_bank.xlsx', 'math');
  await processFile('D:/garage/archived data/_archive/content_backup/science-p7-question-bank.xlsx', 'science');
  console.log("Sync complete!");
}

run();

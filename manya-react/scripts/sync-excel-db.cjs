const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in .env (make sure SUPABASE_SERVICE_ROLE_KEY is set)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processFile(filePath, subject) {
  const tableName = `questions_${subject}`;
  console.log(`\n==========================================`);
  console.log(`Processing ${subject.toUpperCase()} from ${filePath}`);
  console.log(`Destination Table: ${tableName}`);
  console.log(`==========================================\n`);
  
  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch (err) {
    console.error(`❌ Error reading ${filePath}:`, err.message);
    return;
  }

  let allRawData = [];
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(worksheet, { defval: null });
    allRawData = allRawData.concat(sheetData);
    console.log(`  - Read ${sheetData.length} records from sheet: ${sheetName}`);
  });
  
  const qidRegistry = new Set();
  const errors = [];

  const formattedData = allRawData.map((row, index) => {
    let cleanRow = {};
    for (let key in row) {
      if (row.hasOwnProperty(key)) {
        let newKey = key.trim().toLowerCase().replace(/[-_]/g, '');
        let val = row[key];
        if (typeof val === 'string') {
          val = val.trim();
          if (val === 'NaN' || val === 'null' || val === '') val = null;
        }
        cleanRow[newKey] = val;
      }
    }

    const qid = cleanRow.qid || cleanRow.id || null;
    
    // VALIDATION BLOCK (Shield Phase)
    if (!qid) {
        errors.push(`Row ${index + 2}: Missing QID`);
        return null;
    }
    if (qidRegistry.has(qid)) {
        errors.push(`Row ${index + 2}: Duplicate QID "${qid}" detected in same file`);
        return null;
    }
    qidRegistry.add(qid);

    // Required Field check
    if (!cleanRow.topic || !cleanRow.subtopic) {
        console.warn(`⚠️ Row ${index + 2} [${qid}]: Missing topic/subtopic metadata.`);
    }

    if (!cleanRow.correctanswer && !cleanRow.filepathsim) {
        console.warn(`⚠️ Row ${index + 2} [${qid}]: No correct answer or JSON path provided.`);
    }

    return {
      qid,
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
      tags: cleanRow.tags ? (cleanRow.tags.startsWith('[') ? JSON.parse(cleanRow.tags) : cleanRow.tags.split(',').map(s => s.trim())) : null,
      engine_type: cleanRow.enginetypesim || cleanRow.enginetype || null,
      mode: cleanRow.modesim || cleanRow.mode || null,
      json_reference_path: cleanRow.filepathsim || cleanRow.jsonreferencepath || null,
      filename: cleanRow.filenamesim || cleanRow.filename || null
    };
  }).filter(row => row !== null);

  if (errors.length > 0) {
    console.error(`\n❌ Validation Failed for ${subject}:`);
    errors.slice(0, 10).forEach(e => console.error(`  - ${e}`));
    if (errors.length > 10) console.error(`  - ...and ${errors.length - 10} more errors.`);
    console.error(`\nAborting sync for ${subject} to prevent database corruption.\n`);
    return;
  }

  console.log(`✅ Validation Passed. Found ${formattedData.length} valid records. Uploading to DB...`);

  // Upload in chunks
  const chunkSize = 100;
  let totalUploaded = 0;
  let hasErrors = false;

  for (let i = 0; i < formattedData.length; i += chunkSize) {
    const chunk = formattedData.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'qid' });
    if (error) {
      console.error(`❌ Error uploading chunk ${i}:`, error.message);
      hasErrors = true;
    } else {
      totalUploaded += chunk.length;
      console.log(`✅ Uploaded [${totalUploaded}/${formattedData.length}]`);
    }
  }

  if (!hasErrors) {
    console.log(`⭐️ Successfully synchronized ${totalUploaded} ${subject} rows.\n`);
  } else {
    console.warn(`⚠️ Sync finished with errors for ${subject}.\n`);
  }
}

async function run() {
  await processFile('D:/garage/archived data/_archive/content_backup/math_p7_question_bank.xlsx', 'math');
  await processFile('D:/garage/archived data/_archive/content_backup/science-p7-question-bank.xlsx', 'science');
}

run();

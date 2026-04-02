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
  
  const formattedData = allRawData.map(row => {
    let cleanRow = {};
    for (let key in row) {
      if (row.hasOwnProperty(key)) {
        let newKey = key.trim().toLowerCase().replace(/[-_]/g, '');
        // handle known aliases
        if (newKey === 'subtopic') newKey = 'subtopic';
        
        let val = row[key];
        if (typeof val === 'string') {
          val = val.trim();
          if (val === 'NaN' || val === 'null' || val === '') val = null;
          // some files have literal string '"..."' we can clean it up but let's keep it safe
        }
        cleanRow[newKey] = val;
      }
    }

    // tags parsing
    let parsedTags = null;
    if (cleanRow.tags) {
      if (cleanRow.tags.startsWith('[')) {
        try { parsedTags = JSON.parse(cleanRow.tags); }
        catch (e) { parsedTags = [cleanRow.tags]; }
      } else {
        parsedTags = cleanRow.tags.split(',').map(s => s.trim());
      }
    }

    return {
      qid: cleanRow.qid || cleanRow.id || null,
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
      tags: parsedTags,
      engine_type: cleanRow.enginetypesim || cleanRow.enginetype || null,
      mode: cleanRow.modesim || cleanRow.mode || null,
      json_reference_path: cleanRow.filepathsim || cleanRow.jsonreferencepath || null,
      filename: cleanRow.filenamesim || cleanRow.filename || null
    };
  }).filter(row => row.qid); // only rows with valid qid

  console.log(`Found ${formattedData.length} valid records. Uploading to DB...`);

  // Upload in chunks
  const chunkSize = 100;
  let totalUploaded = 0;
  let hasErrors = false;

  for (let i = 0; i < formattedData.length; i += chunkSize) {
    const chunk = formattedData.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'qid' });
    if (error) {
      console.error(`❌ Error uploading chunk ${i} - ${i + chunkSize}:`, error.message);
      hasErrors = true;
    } else {
      totalUploaded += chunk.length;
      console.log(`✅ Uploaded chunk ${i} - ${i + chunk.length - 1}`);
    }
  }

  if (!hasErrors) {
    console.log(`✅ Completed ${subject} sync. Successfully upserted ${totalUploaded} rows.\n`);
  } else {
    console.warn(`⚠️ Completed ${subject} sync with some errors.\n`);
  }
}

async function run() {
  await processFile('D:/garage/archived data/_archive/content_backup/math_p7_question_bank.xlsx', 'math');
  await processFile('D:/garage/archived data/_archive/content_backup/science-p7-question-bank.xlsx', 'science');
}

run();

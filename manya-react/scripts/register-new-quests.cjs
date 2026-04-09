const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const QUESTS = [
  { folder: 'quest_04_calculating_proper_subsets', subtopic: 'calculating_proper_subsets' },
  { folder: 'quest_05_working_backwards', subtopic: 'working_backwards' }
];

async function run() {
  const allQuestions = [];

  for (const q of QUESTS) {
    const dirPath = path.join(__dirname, '../public/content/math/set_theory', q.folder);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.match(/^0(4|5)-\d{3}\.json$/));
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const qid = file.replace('.json', '');
      
      const firstQ = json.questions ? json.questions[0] : {};
      
      allQuestions.push({
        qid: qid,
        topic: json.topic || 'Set Theory',
        subtopic: q.subtopic,
        difficulty: 'M',
        questiontype: 'SIMULATION',
        questiontext: firstQ.prompt || json.variantTitle || 'Math Simulation',
        detailedsolution: firstQ.hint || 'Refer to the interactive diagram for instructions.',
        engine_type: json.engineType || 'SET_THEORY',
        mode: json.mode || 'quiz',
        json_reference_path: `math/set_theory/${q.folder}/${file}`,
        filename: file,
        folder: q.folder
      });
    }
  }

  console.log(`🚀 Registering ${allQuestions.length} simulations in Supabase...`);

  const { error } = await supabase
    .from('questions_math')
    .upsert(allQuestions, { onConflict: 'qid' });

  if (error) {
    console.error("❌ Registration error:", error.message);
  } else {
    console.log(`✅ Successfully registered ${allQuestions.length} new quest simulations!`);
  }
}

run();

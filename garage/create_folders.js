const fs = require('fs');
const path = require('path');

const baseDir = 'D:\\manya_app\\content\\english\\holidays';

const folderNames = [
    "01_holiday_kickoff",
    "02_going_to_mastery",
    "03_question_tags_mastery",
    "04_reported_speech_mastery",
    "05_village_arrival",
    "06_feeling_and_facts",
    "07_past_regrets",
    "08_voice_mastery",
    "09_final_review"
];

folderNames.forEach(name => {
    // Adds the 'quest_' prefix as requested
    const folderPath = path.join(baseDir, `quest_${name}`);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Created: ${folderPath}`);
    } else {
        console.log(`⚠️ Exists: ${folderPath}`);
    }
});
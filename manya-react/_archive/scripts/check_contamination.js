import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(excelPath);

const rawSheet = workbook.Sheets['Raw'];
const rawData = XLSX.utils.sheet_to_json(rawSheet);

const worldStageQuestions = rawData.filter(q => q.subtopic === 'world_stage');
console.log(`Total questions in 'world_stage': ${worldStageQuestions.length}`);

// Sample some questions to see if they look right
console.log("Samples from 'world_stage':");
worldStageQuestions.slice(30, 40).forEach(q => {
    console.log(`- [${q.qid}] ${q.questiontext} (Subtopic: ${q.subtopic})`);
});

// Check if any mention GMT
const gmtInWorldStage = worldStageQuestions.filter(q => 
    (q.questiontext && q.questiontext.includes('GMT')) || 
    (q.correctanswer && q.correctanswer.toString().includes('GMT'))
);
console.log(`GMT questions found in 'world_stage': ${gmtInWorldStage.length}`);
if (gmtInWorldStage.length > 0) {
    console.log("Sample GMT questions in 'world_stage':");
    gmtInWorldStage.slice(0, 5).forEach(q => {
        console.log(`- [${q.qid}] ${q.questiontext}`);
    });
}

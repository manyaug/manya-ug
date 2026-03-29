const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'd:/manya_app/manya-react/public/content/sst/sst_p7_question_bank.xlsx';
const workbook = XLSX.readFile(excelPath);
const subtopics = new Set();

workbook.SheetNames.forEach(s => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[s]);
    data.forEach(r => {
        if (r.subtopic) subtopics.add(r.subtopic);
    });
});

fs.writeFileSync('scripts/subtopics.json', JSON.stringify(Array.from(subtopics), null, 2));
console.log('Unique subtopics saved to scripts/subtopics.json');

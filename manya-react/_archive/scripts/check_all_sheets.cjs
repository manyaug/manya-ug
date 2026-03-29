
const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Sheet: ${name}, Count: ${data.length}`);
    if (data.length > 0) {
        const found = data.filter(r => r.qid && r.qid.toLowerCase().includes('genesis'));
        if (found.length > 0) {
            console.log(`✅ FOUND ${found.length} GENESIS rows in [${name}]`);
            console.log(JSON.stringify(found[0], null, 2));
        }
    }
});

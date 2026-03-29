
const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE);
const sheetNames = workbook.SheetNames;

sheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet);
    const genesis = data.find(row => row.qid && row.qid.includes('GENESIS'));
    if (genesis) {
        console.log(`\nFound in [${name}]:`);
        console.log(JSON.stringify(genesis, null, 2));
    }
});

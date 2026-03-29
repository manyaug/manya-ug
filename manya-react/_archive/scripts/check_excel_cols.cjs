
const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE);
const sheetNames = workbook.SheetNames;

console.log('📊 Excel Sheet Names:', sheetNames);

sheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length > 0) {
        console.log(`\n📄 Columns in [${name}]:`);
        console.log(data[0].filter(c => c).join(', '));
    }
});

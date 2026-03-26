const XLSX = require('xlsx');

const excelPath = 'd:/manya_app/manya-react/public/content/sst/sst_p7_question_bank.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length > 0) {
        console.log('Headers:', Object.keys(data[0]));
        console.log('Sample Row (First 10 keys):');
        const firstRow = data[0];
        const sampledRow = {};
        Object.keys(firstRow).slice(0, 15).forEach(k => sampledRow[k] = firstRow[k]);
        console.log(JSON.stringify(sampledRow, null, 2));
    } else {
        console.log('No data in sheet.');
    }
});

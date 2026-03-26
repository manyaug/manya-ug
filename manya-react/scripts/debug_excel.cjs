const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/manya_app/manya-react/public/content/sst/sst_p7_question_bank.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    console.log("📂 Sheet names:", workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n📄 Sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Count: ${data.length} rows`);
        if (data.length > 0) {
            console.log("First 3 rows sample:");
            console.log(JSON.stringify(data.slice(0, 3), null, 2));
        }
    });
} catch (error) {
    console.error("❌ Error reading Excel:", error.message);
}

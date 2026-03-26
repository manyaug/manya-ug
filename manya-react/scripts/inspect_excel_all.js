import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log("Sheet Names:", workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`\n--- Sheet: ${name} ---`);
    if (data.length > 0) {
        console.log("Headers:", Object.keys(data[0]));
        console.log("Sample Row:", JSON.stringify(data[0], null, 2));
        console.log("Total Rows:", data.length);
    } else {
        console.log("Sheet is empty.");
    }
});

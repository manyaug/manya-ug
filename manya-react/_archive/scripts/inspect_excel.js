import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Sheet Name:", sheetName);
console.log("Headers:", Object.keys(data[0]));
console.log("Sample Row:", JSON.stringify(data[0], null, 2));
console.log("Total Rows:", data.length);

import xlsx from 'xlsx';

const file = 'D:\\manya_garage\\archived data\\_archive\\content_backup\\main_bank\\english-p7-question-bank.xlsx';
const workbook = xlsx.readFile(file);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(data[0]);

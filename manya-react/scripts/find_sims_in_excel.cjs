
const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet);
    const sims = data.filter(r => (r.json_reference_path && r.json_reference_path !== 'null') || (r.engine_type && r.engine_type !== 'null'));
    if (sims.length > 0) {
        console.log(`✅ FOUND ${sims.length} SIMULATION/JSON rows in [${name}]`);
        console.log('Sample IDs:', sims.slice(0, 5).map(s => s.qid));
        console.log('Sample Row:', JSON.stringify(sims[0], null, 2));
    } else {
        console.log(`❌ No simulation rows found in [${name}]`);
    }
});

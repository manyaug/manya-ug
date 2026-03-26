const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'd:/manya_app/manya-react/public/content/sst/sst_p7_question_bank.xlsx';
const outputBaseDir = 'd:/manya_app/manya-react/public/content/sst/questions';

function slugify(text) {
    if (!text) return 'default';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '_')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function processExcel() {
    const workbook = XLSX.readFile(excelPath);
    const questions = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        data.forEach(row => {
            if (!row.questiontext) return;

            const options = [
                row.optiona,
                row.optionb,
                row.optionc,
                row.optiond
            ].filter(Boolean);

            // Extract variant from qid if possible
            let variant = 'V0';
            const variantMatch = row.qid?.match(/-V(\d+)$/);
            if (variantMatch) {
                variant = 'V' + variantMatch[1];
            } else if (sheetName === 'Rephrased') {
                variant = 'V1'; // Default for rephrased if not specified
            }

            questions.push({
                id: row.qid,
                topic: row.topic || 'General',
                subtopic: row.subtopic || 'General',
                question: row.questiontext,
                options: options,
                answer: row.correctanswer,
                explanation: row.hint || row.detailedsolution || '',
                variant: variant,
                difficulty: row.difficulty || 'E',
                isPLE: row.marked_ple === 'yes',
                type: row.questiontype || 'MCQ'
            });
        });
    });

    // Group by Topic and Subtopic
    const grouped = {};
    questions.forEach(q => {
        const topicKey = slugify(q.topic);
        const subtopicKey = slugify(q.subtopic);
        
        if (!grouped[topicKey]) grouped[topicKey] = {};
        if (!grouped[topicKey][subtopicKey]) grouped[topicKey][subtopicKey] = [];
        
        grouped[topicKey][subtopicKey].push(q);
    });

    // Write to files
    if (!fs.existsSync(outputBaseDir)) {
        fs.mkdirSync(outputBaseDir, { recursive: true });
    }

    Object.keys(grouped).forEach(topic => {
        const topicDir = path.join(outputBaseDir, topic);
        if (!fs.existsSync(topicDir)) {
            fs.mkdirSync(topicDir, { recursive: true });
        }

        Object.keys(grouped[topic]).forEach(subtopic => {
            const outputPath = path.join(topicDir, `${subtopic}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(grouped[topic][subtopic], null, 2));
            console.log(`Generated: ${outputPath} (${grouped[topic][subtopic].length} questions)`);
        });
    });
}

processExcel();

import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const MASTER_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json');

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    fs.readdirSync(dir).forEach((f) => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            results = results.concat(walkDir(full));
        } else if (f.endsWith('.json')) {
            results.push(full);
        }
    });
    return results;
}

const allFiles = walkDir(path.join(ASSETS_ROOT, 'content'));
const actualFilesMap = new Map();
allFiles.forEach(f => {
    const rel = path.relative(path.join(ASSETS_ROOT, 'content'), f).replace(/\\/g, '/');
    actualFilesMap.set(rel.toLowerCase(), rel);
});

console.log("--- MISMATCHES FOUND (Expected in master but NOT on disk) ---");
let totalResources = 0;
let missingCount = 0;
const missingList = [];

for (const subject of Object.keys(master)) {
    const units = master[subject].units || [];
    for (const unit of units) {
        for (const quest of (unit.quests || [])) {
            const folder = quest.folder;
            for (const res of (quest.resources || [])) {
                if (!res.file) continue;
                totalResources++;
                const expectedRelPath = `${subject}/${unit.id}/${folder}/${res.file}.json`.toLowerCase();
                if (!actualFilesMap.has(expectedRelPath)) {
                    missingCount++;
                    missingList.push({
                        subject,
                        unit: unit.id,
                        quest: folder,
                        expectedFile: `${res.file}.json`,
                        expectedPath: `${subject}/${unit.id}/${folder}/${res.file}.json`
                    });
                }
            }
        }
    }
}

console.log(`Total missing/mismatched resources: ${missingCount} / ${totalResources}`);
missingList.slice(0, 50).forEach(m => {
    console.log(`❌ Missing [${m.subject}] ${m.unit}/${m.quest} -> "${m.expectedFile}"`);
});
if (missingList.length > 50) {
    console.log(`... and ${missingList.length - 50} more.`);
}

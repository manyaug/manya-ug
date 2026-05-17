import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const MASTER_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json');
const BACKUP_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json.backup');

if (!fs.existsSync(MASTER_PATH)) {
    console.error("❌ Master curriculum file not found at:", MASTER_PATH);
    process.exit(1);
}

// 1. Create a secure backup
fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
console.log(`💾 Created secure backup of curriculum-master.json at: ${BACKUP_PATH}`);

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

// Subjects to process
const subjects = ['math', 'science', 'sst', 'english'];

let updatedQuests = 0;
let totalReplaced = 0;
let totalAppended = 0;

for (const sub of subjects) {
    const subData = master[sub] || master[sub.toUpperCase()];
    if (!subData) continue;

    const units = subData.units || [];
    for (const unit of units) {
        const unitId = unit.id;
        const quests = unit.quests || [];

        for (const quest of quests) {
            const folder = quest.folder;
            const questDir = path.join(ASSETS_ROOT, 'content', sub, unitId, folder);

            if (!fs.existsSync(questDir)) {
                console.warn(`⚠️ Quest directory not found: ${questDir}`);
                continue;
            }

            // A. List all files on disk
            const filesOnDisk = fs.readdirSync(questDir).filter(f => f.endsWith('.json'));

            // Sort SIM files alphabetically
            const simFilesOnDisk = filesOnDisk
                .filter(f => f.startsWith('SIM-'))
                .map(f => f.replace('.json', ''))
                .sort();

            const nonSimFilesOnDisk = filesOnDisk
                .filter(f => !f.startsWith('SIM-'))
                .map(f => f.replace('.json', ''));

            // B. Categorize existing resources in master
            const resources = quest.resources || [];
            const newResources = [];
            
            // Track which SIM files are already explicitly and correctly referenced
            const referencedSims = new Set();
            resources.forEach(res => {
                if (res.file && res.file.startsWith('SIM-') && simFilesOnDisk.includes(res.file)) {
                    referencedSims.add(res.file);
                }
            });

            // Find all unreferenced SIM files on disk
            const unreferencedSims = simFilesOnDisk.filter(sim => !referencedSims.has(sim));

            let simIdx = 0;
            let questChanged = false;

            for (const res of resources) {
                if (!res.file) {
                    newResources.push(res);
                    continue;
                }

                const fileLower = res.file.toLowerCase();
                const isNoteOrRecap = fileLower.includes('note') || 
                                      fileLower.includes('recap') || 
                                      fileLower.includes('study') ||
                                      fileLower.includes('guide') ||
                                      fileLower.includes('rule');

                // Check if file exists exactly as-is on disk
                const existsAsIs = filesOnDisk.some(f => f.replace('.json', '').toLowerCase() === fileLower);

                if (existsAsIs) {
                    // Perfect! File exists, keep it as-is
                    newResources.push(res);
                } else if (!isNoteOrRecap && simIdx < unreferencedSims.length) {
                    // This is a missing interactive question! Map it to the next available unreferenced SIM file
                    const nextSim = unreferencedSims[simIdx++];
                    const simPath = path.join(questDir, `${nextSim}.json`);

                    // Try to read the label from the JSON file itself
                    let label = `Practice ${nextSim}`;
                    try {
                        const content = JSON.parse(fs.readFileSync(simPath, 'utf8'));
                        label = content.title || content.topic || content.intro || label;
                        if (label.length > 50) label = label.substring(0, 47) + '...';
                    } catch (e) {
                        // Keep fallback
                    }

                    console.log(`🔄 Mapping stale resource "${res.file}" ➔ "${nextSim}" (${label})`);
                    newResources.push({
                        label: label,
                        file: nextSim
                    });
                    totalReplaced++;
                    questChanged = true;
                } else {
                    // Keep it anyway (could be a missing note or recap that we will log)
                    console.warn(`⚠️ Keeping missing non-question resource reference: "${res.file}"`);
                    newResources.push(res);
                }
            }

            // C. Append any remaining unreferenced SIM files on disk!
            while (simIdx < unreferencedSims.length) {
                const extraSim = unreferencedSims[simIdx++];
                const simPath = path.join(questDir, `${extraSim}.json`);

                let label = `Practice ${extraSim}`;
                try {
                    const content = JSON.parse(fs.readFileSync(simPath, 'utf8'));
                    label = content.title || content.topic || content.intro || label;
                    if (label.length > 50) label = label.substring(0, 47) + '...';
                } catch (e) {
                    // Keep fallback
                }

                console.log(`➕ Appending new asset "${extraSim}" (${label})`);
                newResources.push({
                    label: label,
                    file: extraSim
                });
                totalAppended++;
                questChanged = true;
            }

            // Update quest resources
            quest.resources = newResources;
            if (questChanged) updatedQuests++;
        }
    }
}

// 3. Write updated JSON back to curriculum-master.json
fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2), 'utf8');

console.log(`\n🎉 Curriculum master rebuilt successfully!`);
console.log(`📊 Statistics:`);
console.log(`   - Quests updated: ${updatedQuests}`);
console.log(`   - Stale files mapped to SIMs: ${totalReplaced}`);
console.log(`   - New SIMs appended: ${totalAppended}`);

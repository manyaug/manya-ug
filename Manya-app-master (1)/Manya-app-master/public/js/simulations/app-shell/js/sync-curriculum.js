const fs = require('fs');
const path = require('path');

// CONFIGURATION, so when new content is added we just rerun this script and library updates
// node app-shell/js/sync-curriculum.js
const CONTENT_DIR = path.join(__dirname, '../../content');
const OUTPUT_FILE = path.join(__dirname, '../../curriculum-master.json');

const subjects = ['math', 'science', 'sst', 'english'];

const generateCurriculum = () => {
    const curriculum = {};

    subjects.forEach(sub => {
        const subPath = path.join(CONTENT_DIR, sub);
        if (!fs.existsSync(subPath)) return;

        curriculum[sub] = {
            theme: getTheme(sub),
            units: []
        };

        // 1. Scan Units (e.g., set_theory)
        const units = fs.readdirSync(subPath).filter(f => fs.statSync(path.join(subPath, f)).isDirectory());

        units.forEach(unit => {
            const unitPath = path.join(subPath, unit);
            const unitObj = { id: unit, title: formatTitle(unit), quests: [] };

            // 2. Scan Quests (e.g., quest_01_finite_sets)
            const quests = fs.readdirSync(unitPath).filter(f => fs.statSync(path.join(unitPath, f)).isDirectory());

            quests.forEach(quest => {
                const questPath = path.join(unitPath, quest);
                const questFiles = fs.readdirSync(questPath).filter(f => f.endsWith('.json'));

                const questObj = {
                    folder: quest,
                    title: formatTitle(quest.replace('quest_', '')),
                    prefix: "",
                    resources: [],
                    practiceCount: 0
                };

                // 3. Categorize Files
                questFiles.forEach(file => {
                    const fileName = file.replace('.json', '');
                    
                    // Logic: Is it a numbered practice file (e.g., 04-001)?
                    const practiceMatch = fileName.match(/^(\d+)-(\d+)$/);
                    
                    if (practiceMatch) {
                        questObj.prefix = practiceMatch[1];
                        questObj.practiceCount++;
                    } else {
                        // It's a Study/Recap/Sim file
                        questObj.resources.push({
                            label: formatTitle(fileName),
                            file: fileName
                        });
                    }
                });

                unitObj.quests.push(questObj);
            });
            curriculum[sub].units.push(unitObj);
        });
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(curriculum, null, 2));
    console.log("✅ Manya Curriculum Sync Complete! Created curriculum.json");
};

// Helper to turn quest_01_finite_sets into "Quest 01 Finite Sets"
function formatTitle(str) {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getTheme(sub) {
    const themes = { math: '#db2777', science: '#16a34a', sst: '#0ea5e9', english: '#7c3aed' };
    return themes[sub] || '#7c3aed';
}

generateCurriculum();
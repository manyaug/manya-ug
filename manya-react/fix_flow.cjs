const fs = require('fs');
const path = require('path');

const curriculumPath = path.join(__dirname, 'public', 'curriculum-master.json');
const mathBasePath = path.join(__dirname, 'public', 'content', 'math');

const data = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));

data.math.units.forEach(unit => {
    unit.quests.forEach(quest => {
        const questDir = path.join(mathBasePath, unit.id, quest.folder);
        if (!fs.existsSync(questDir)) return;
        
        // Find all practice json files matching \d\d-\d\d\d\.json
        let files = fs.readdirSync(questDir).filter(f => f.match(/^\d{2}-\d{3}\.json$/));
        
        // Sorting string naturally might be risky, but format is strict
        files.sort();

        let count = 0;
        files.forEach((file, index) => {
            const expectedNumber = (index + 1).toString().padStart(3, '0');
            const expectedName = `${quest.prefix}-${expectedNumber}.json`;
            
            if (file !== expectedName) {
                const oldPath = path.join(questDir, file);
                const newPath = path.join(questDir, expectedName);
                fs.renameSync(oldPath, newPath);
                console.log(`Renamed ${file} -> ${expectedName} in ${quest.folder}`);
            }
            count++;
        });

        if (quest.practiceCount !== count) {
            console.log(`Updated ${quest.folder} practiceCount: ${quest.practiceCount} -> ${count}`);
            quest.practiceCount = count;
        }
    });
});

fs.writeFileSync(curriculumPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Curriculum fixed and files sequenced!');

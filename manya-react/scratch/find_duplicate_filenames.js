import fs from 'fs';
import path from 'path';

const CONTENT_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets\\content';

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (entry.endsWith('.json')) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = walkDir(CONTENT_ROOT);
const nameMap = new Map();

files.forEach(filePath => {
    const baseName = path.basename(filePath);
    if (!nameMap.has(baseName)) {
        nameMap.set(baseName, []);
    }
    nameMap.get(baseName).push(filePath);
});

console.log("🔍 Scanning for duplicate filenames in content directory...");
let duplicatesFound = false;

for (const [name, paths] of nameMap.entries()) {
    if (paths.length > 1) {
        duplicatesFound = true;
        console.log(`\n❌ Collision detected for "${name}":`);
        paths.forEach(p => {
            console.log(`   - ${path.relative(CONTENT_ROOT, p)}`);
        });
    }
}

if (!duplicatesFound) {
    console.log("✅ Perfect! No duplicate filenames found across the entire repository.");
}

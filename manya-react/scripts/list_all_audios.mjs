import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    fs.readdirSync(dir).forEach((f) => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            results = results.concat(walk(full));
        } else if (f.endsWith('.mp3') || f.endsWith('.wav')) {
            results.push(full);
        }
    });
    return results;
}

const audioFiles = walk(ASSETS_ROOT);
audioFiles.forEach(a => {
    console.log(path.relative(ASSETS_ROOT, a).replace(/\\/g, '/'));
});

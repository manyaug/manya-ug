import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const folder = path.join(ASSETS_ROOT, 'content', 'sst', 'locating_africa', 'quest_2_grid_master');

if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder);
    console.log(`--- FILES IN ${folder} ---`);
    files.forEach(f => {
        if (f.endsWith('.json')) {
            const p = path.join(folder, f);
            const content = JSON.parse(fs.readFileSync(p, 'utf8'));
            console.log(`- File: ${f} | title/topic: ${content.title || content.topic || 'none'} | type/engine: ${content.item_type || content.engineType || 'none'}`);
        }
    });
} else {
    console.log("Folder does not exist.");
}

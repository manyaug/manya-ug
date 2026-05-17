import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const MASTER_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json');

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

// science/musklo-skeletal-system/quest_4_axial_rib_cage
const science = master.science || master.SCIENCE;
const unit = science.units.find(u => u.id === 'musklo-skeletal-system');
const quest = unit.quests.find(q => q.folder === 'quest_4_axial_rib_cage');

console.log("--- resources in curriculum-master.json for quest_4_axial_rib_cage ---");
quest.resources.forEach(r => console.log(`- ${r.file} (${r.label})`));

const folderPath = path.join(ASSETS_ROOT, 'content', 'science', 'musklo-skeletal-system', 'quest_4_axial_rib_cage');
if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
    console.log(`\n--- files on disk in ${folderPath} ---`);
    files.forEach(f => console.log(`- ${f}`));
} else {
    console.log("Folder does not exist.");
}

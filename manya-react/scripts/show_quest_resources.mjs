import fs from 'fs';
import path from 'path';

const ASSETS_ROOT = 'D:\\manya_garage\\MANYA-ASSETS\\manya-react-assets';
const MASTER_PATH = path.join(ASSETS_ROOT, 'content', 'curriculum-master.json');

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

// Find locating_africa -> quest_2_grid_master
const sst = master.sst || master.SST;
const unit = sst.units.find(u => u.id === 'locating_africa');
const quest = unit.quests.find(q => q.folder === 'quest_2_grid_master');

console.log(JSON.stringify(quest, null, 2));

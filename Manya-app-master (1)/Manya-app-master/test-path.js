// test-path.js
const path = require('path');

// Simulate what we're trying to do
const simFilePath = '/content/science/musklo-skeletal-system/quest_5_appendicular_limbs/labeling_arm_v1.json';
const glbValue = 'assets/science/musklo-skeletal-system/quest_5_appendicular_limbs/skeleton_arm.glb';

console.log('Original GLB value:', glbValue);

// Extract just filename
const filename = glbValue.split('/').pop();
console.log('Filename:', filename);

// Extract quest folder
const questMatch = simFilePath.match(/\/quest_\d+_[^/]+/);
if (questMatch) {
    const questFolder = questMatch[0];
    console.log('Quest folder:', questFolder);
    
    const newPath = `/js/simulations/assets/science/musklo-skeletal-system${questFolder}/${filename}`;
    console.log('New path:', newPath);
}
// const { findQuestData } = require('../src/services/curriculumService');
// Wait, curriculumService is an ES module! We can use import or dynamic import, or we can just require the JSON directly to see what it has.
const fs = require('fs');
const curriculum = JSON.parse(fs.readFileSync('public/curriculum-master.json', 'utf8'));

console.log('ENGLISH UNIT IN STATIC CURRICULUM:');
const engUnit = curriculum.english || curriculum.ENGLISH;
console.log('Unit ID:', engUnit.units[0].id);
console.log('Quest 6 folder:', engUnit.units[0].quests[5].folder);
console.log('Quest 6 unitId:', engUnit.units[0].id);

// server/config/challengeLoader.js
const fs = require('fs');
const path = require('path');

class ChallengeLoader {
    constructor() {
        this.structure = null;
        this.loadStructure();
    }
    
    loadStructure() {
        try {
            // Try multiple possible paths
            const possiblePaths = [
                path.join(__dirname, '../../scripts/quest-structure.json'),
                path.join(__dirname, '../scripts/quest-structure.json'),
                path.join(process.cwd(), 'scripts/quest-structure.json')
            ];
            
            let loaded = false;
            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    const rawData = fs.readFileSync(filePath, 'utf8');
                    this.structure = JSON.parse(rawData);
                    console.log(`✅ Loaded quest structure from ${filePath}`);
                    console.log(`   Found ${Object.keys(this.structure).length} topics`);
                    loaded = true;
                    break;
                }
            }
            
            if (!loaded) {
                console.error('❌ Could not find quest-structure.json in any location');
                this.structure = {};
            }
        } catch (err) {
            console.error('❌ Failed to load quest-structure.json:', err);
            this.structure = {};
        }
    }
    
    getAllTopics() {
        return Object.keys(this.structure);
    }
    
    getTopic(topicName) {
        return this.structure[topicName];
    }
    
    getSubtopics(topicName) {
        const topic = this.structure[topicName];
        return topic ? topic.subtopics : [];
    }
    
  getChallenge(topicName, subtopicId) {
    const topic = this.structure[topicName];
    if (!topic) return null;
    return topic.subtopics.find(s => s.id === subtopicId) || null;
}
    
    getChallengeByName(topicName, subtopicName) {
        const topic = this.structure[topicName];
        if (!topic) return null;
        return topic.subtopics.find(s => s.name === subtopicName) || null;
    }
    
    getTopicId(topicName) {
        const topic = this.structure[topicName];
        return topic ? topic.topicId : null;
    }
    
    validateStructure() {
        const report = {
            totalTopics: 0,
            totalSubtopics: 0,
            topics: []
        };
        
        for (const [topicName, topicData] of Object.entries(this.structure)) {
            const subtopicCount = topicData.subtopics?.length || 0;
            report.totalTopics++;
            report.totalSubtopics += subtopicCount;
            report.topics.push({
                name: topicName,
                id: topicData.topicId,
                subtopics: subtopicCount
            });
        }
        
        return report;
    }
}

module.exports = new ChallengeLoader();
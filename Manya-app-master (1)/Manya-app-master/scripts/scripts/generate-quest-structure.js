// scripts/generate-quest-structure.js
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'manya_db',
    user: 'postgres',
    password: 'root'
});

async function generateQuestStructure() {
    console.log('🏗️  Generating quest structure from database...\n');
    
    try {
        // Get all topics with their subtopics
        const topicsResult = await pool.query(`
            SELECT DISTINCT "Topic"
            FROM qbrss 
            WHERE "Topic" IS NOT NULL
            ORDER BY "Topic"
        `);
        
        const topics = topicsResult.rows;
        const questStructure = {};
        let topicId = 1;
        
        for (const topic of topics) {
            const topicName = topic.Topic;
            
            // Get subtopics for this topic
            const subtopicsResult = await pool.query(`
                SELECT DISTINCT "Sub_Topic"
                FROM qbrss 
                WHERE "Topic" = $1 AND "Sub_Topic" IS NOT NULL
                ORDER BY "Sub_Topic"
            `, [topicName]);
            
            const subtopics = subtopicsResult.rows.map(row => row.Sub_Topic);
            
            // Build quest structure for this topic
            questStructure[topicName] = {
                topicId: topicId++,
                subtopics: subtopics.map((sub, index) => ({
                    id: index + 1,
                    name: sub,
                    quests: 5, // We'll use 5 quests per subtopic as discussed
                    icon: getIconForSubtopic(sub),
                    description: `Master ${sub.toLowerCase()}`
                }))
            };
            
            console.log(`📘 ${topicName}: ${subtopics.length} subtopics`);
        }
        
        // Save to file for reference
        fs.writeFileSync(
            'quest-structure.json', 
            JSON.stringify(questStructure, null, 2)
        );
        
        console.log('\n✅ Quest structure saved to quest-structure.json');
        
        // Print summary
        console.log('\n📊 QUEST STRUCTURE SUMMARY');
        console.log('=========================');
        
        let totalQuests = 0;
        Object.entries(questStructure).forEach(([topic, data]) => {
            const topicQuests = data.subtopics.length * 5;
            totalQuests += topicQuests;
            console.log(`${topic}: ${data.subtopics.length} subtopics × 5 quests = ${topicQuests} quests`);
        });
        
        console.log(`\n🎯 TOTAL QUESTS: ${totalQuests}`);
        console.log(`📝 Using ${totalQuests * 10} questions (avg 10 per quest)`);
        
    } catch (err) {
        console.error('❌ Error generating quest structure:', err);
    } finally {
        await pool.end();
    }
}

// Helper function to assign icons based on subtopic name
function getIconForSubtopic(subtopic) {
    const icons = {
        'bone': '🦴',
        'joint': '🔄',
        'muscle': '💪',
        'ligament': '🔗',
        'tendon': '⚡',
        'cartilage': '🧊',
        'spine': '📏',
        'skull': '💀',
        'pelvis': '🦴',
        'heart': '❤️',
        'lung': '🫁',
        'brain': '🧠',
        'stomach': '🥘',
        'intestine': '🌀',
        'liver': '🩸',
        'kidney': '🫘',
        'skin': '🧴',
        'eye': '👁️',
        'ear': '👂',
        'nose': '👃',
        'mouth': '👄',
        'tooth': '🦷',
        'tongue': '👅',
        'nerve': '⚡',
        'blood': '🩸',
        'cell': '🔬',
        'tissue': '🧫'
    };
    
    // Find matching icon
    for (const [key, icon] of Object.entries(icons)) {
        if (subtopic.toLowerCase().includes(key)) {
            return icon;
        }
    }
    
    return '📘'; // Default icon
}

// Run the generator
generateQuestStructure();
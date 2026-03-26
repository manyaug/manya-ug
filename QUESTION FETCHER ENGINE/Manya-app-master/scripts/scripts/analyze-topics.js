// scripts/analyze-topics.js
const { Pool } = require('pg');

// Connect to your database
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'manya_db',
    user: 'postgres',
    password: 'root'
});

async function analyzeTopics() {
    console.log('🔍 Scanning database for topics and subtopics...\n');
    
    try {
        // Get all unique topics with their counts
        const topicsResult = await pool.query(`
            SELECT 
                "Topic", 
                COUNT(*) as total_questions,
                COUNT(DISTINCT "Sub_Topic") as subtopic_count
            FROM qbrss 
            WHERE "Topic" IS NOT NULL 
            GROUP BY "Topic"
            ORDER BY "Topic"
        `);
        
        const topics = topicsResult.rows;
        
        console.log(`📚 Found ${topics.length} topics\n`);
        
        // For each topic, get its unique subtopics
        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            
            const subtopicsResult = await pool.query(`
                SELECT DISTINCT "Sub_Topic"
                FROM qbrss 
                WHERE "Topic" = $1 AND "Sub_Topic" IS NOT NULL
                ORDER BY "Sub_Topic"
            `, [topic.Topic]);
            
            const subtopics = subtopicsResult.rows.map(row => row.Sub_Topic);
            
            console.log(`${i + 1}. 📘 ${topic.Topic}`);
            console.log(`   📊 Total questions: ${topic.total_questions}`);
            console.log(`   📑 Subtopics (${subtopics.length}):`);
            
            subtopics.forEach((sub, idx) => {
                console.log(`      ${idx + 1}. ${sub}`);
            });
            console.log(''); // Empty line for spacing
        }
        
        // Generate summary statistics
        console.log('\n📊 SUMMARY STATISTICS');
        console.log('=====================');
        
        const statsResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT "Topic") as total_topics,
                COUNT(DISTINCT "Sub_Topic") as total_subtopics,
                COUNT(*) as total_questions
            FROM qbrss
        `);
        
        const stats = statsResult.rows[0];
        
        console.log(`Total Topics: ${stats.total_topics}`);
        console.log(`Total Subtopics: ${stats.total_subtopics}`);
        console.log(`Total Questions: ${stats.total_questions}`);
        
        // Calculate average questions per subtopic
        const avgPerSubtopic = Math.round(stats.total_questions / stats.total_subtopics);
        console.log(`Average questions per subtopic: ${avgPerSubtopic}`);
        
        // Find topics with most/least subtopics
        const mostSubtopics = topics.sort((a, b) => b.subtopic_count - a.subtopic_count)[0];
        const leastSubtopics = topics.sort((a, b) => a.subtopic_count - b.subtopic_count)[0];
        
        console.log(`\n📈 Topic with most subtopics: ${mostSubtopics.Topic} (${mostSubtopics.subtopic_count} subtopics)`);
        console.log(`📉 Topic with least subtopics: ${leastSubtopics.Topic} (${leastSubtopics.subtopic_count} subtopics)`);
        
    } catch (err) {
        console.error('❌ Error analyzing topics:', err);
    } finally {
        await pool.end();
    }
}

// Run the analysis
analyzeTopics();
// test.js
console.log('Starting test...');

try {
    const Database = require('./database');
    console.log('✅ Database loaded');
    
    const QuestionParser = require('./question-parser');
    console.log('✅ QuestionParser loaded');
    
    const MasteryCalculator = require('./mastery-calculator');
    console.log('✅ MasteryCalculator loaded');
    
    const PriorityScorer = require('./priority-scorer');
    console.log('✅ PriorityScorer loaded');
    
    const QuestManager = require('./quest-manager');
    console.log('✅ QuestManager loaded');
    
    const SessionManager = require('./session-manager');
    console.log('✅ SessionManager loaded');
    
    const QuestionFetcher = require('./question-fetcher');
    console.log('✅ QuestionFetcher loaded');
    
    console.log('All files loaded successfully!');
} catch (error) {
    console.error('Error loading:', error);
}
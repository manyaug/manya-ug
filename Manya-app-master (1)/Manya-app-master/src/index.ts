import { AppDataSource } from './data-source';
import { QuestionFetcher } from './question-fetcher';

async function main() {
    try {
        // Connect to database
        await AppDataSource.initialize();
        console.log('✅ Connected to manya.db');

        const fetcher = new QuestionFetcher();
        const userId = 'test-student-1';

        // Test 1: Get random question
        console.log('\n📝 Testing random question...');
        const randomQuestion = await fetcher.getRandomQuestion();
        
        if (randomQuestion) {
            console.log('Question:', randomQuestion.Question_Text);
            console.log('Topic:', randomQuestion.Topic);
            console.log('Difficulty:', randomQuestion.Difficulty);
        }

        // Test 2: Record some answers to build history
        console.log('\n📝 Recording test answers...');
        
        // Record 3 wrong answers in Rivers topic (to simulate weak topic)
        await fetcher.recordAnswer(userId, 'SS-T1-147', 'A', false, 30, false, false);
        await fetcher.recordAnswer(userId, 'SS-T1-147', 'B', false, 25, false, true);
        await fetcher.recordAnswer(userId, 'SS-T1-148', 'C', false, 40, true, false);
        
        // Record 2 correct answers in different topic
        await fetcher.recordAnswer(userId, 'SS-T1-149', 'A', true, 15, false, false);
        await fetcher.recordAnswer(userId, 'SS-T1-149', 'A', true, 12, false, false);

        console.log('✅ Test answers recorded');

        // Test 3: Get personalized question
        console.log('\n🎯 Testing personalized question...');
        const personalizedQuestion = await fetcher.getNextQuestion(userId);
        
        if (personalizedQuestion) {
            console.log('📌 Personalized recommendation:');
            console.log('Question:', personalizedQuestion.Question_Text);
            console.log('Topic:', personalizedQuestion.Topic);
            console.log('Difficulty:', personalizedQuestion.Difficulty);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await AppDataSource.destroy();
        console.log('\n✨ Done');
    }
}

main();
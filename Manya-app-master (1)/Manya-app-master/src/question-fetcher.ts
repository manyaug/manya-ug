import { AppDataSource } from './data-source';
import { Question } from './entity/Question';
import { UserAnswer } from './entity/UserAnswer';
import { MoreThan } from 'typeorm';

export class QuestionFetcher {
    /**
     * Get a random question (simple version to test)
     */
    async getRandomQuestion(): Promise<Question | null> {
        const questionRepo = AppDataSource.getRepository(Question);
        
        const question = await questionRepo
            .createQueryBuilder('question')
            .orderBy('RANDOM()')
            .limit(1)
            .getOne();
            
        return question;
    }

    /**
     * Get next personalized question
     */
    async getNextQuestion(userId: string): Promise<Question | null> {
        const questionRepo = AppDataSource.getRepository(Question);
        const answerRepo = AppDataSource.getRepository(UserAnswer);

        // Get user's performance by topic
        const topicPerformance = await answerRepo
            .createQueryBuilder('answer')
            .select('question.Topic', 'topic')
            .addSelect('COUNT(*)', 'attempts')
            .addSelect('SUM(CASE WHEN answer.isCorrect = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)', 'accuracy')
            .innerJoin('answer.question', 'question')
            .where('answer.userId = :userId', { userId })
            .groupBy('question.Topic')
            .having('attempts >= 3')
            .orderBy('accuracy', 'ASC')
            .getRawMany();

        console.log('Topic performance:', topicPerformance);

        // Find weak topics (accuracy < 60%)
        const weakTopics = topicPerformance
            .filter(t => t.accuracy < 0.6)
            .map(t => t.topic);

        // Get questions answered in last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recentAnswers = await answerRepo.find({
            where: {
                userId: userId,
                answeredAt: MoreThan(oneDayAgo)
            },
            relations: ['question']
        });

        const recentQuestionIds = recentAnswers.map(a => a.question.Q_ID);

        // Build query
        let queryBuilder = questionRepo.createQueryBuilder('question');

        if (weakTopics.length > 0) {
            queryBuilder = queryBuilder.where('question.Topic IN (:...topics)', { topics: weakTopics });
        }

        if (recentQuestionIds.length > 0) {
            queryBuilder = queryBuilder.andWhere('question.Q_ID NOT IN (:...recentIds)', {
                recentIds: recentQuestionIds
            });
        }

        const question = await queryBuilder
            .orderBy('RANDOM()')
            .limit(1)
            .getOne();

        return question;
    }

    /**
     * Record a user's answer
     */
    async recordAnswer(
        userId: string,
        questionId: string,
        selectedAnswer: string,
        isCorrect: boolean,
        timeSpent?: number,
        hintUsed?: boolean,
        answerChanged?: boolean
    ) {
        const questionRepo = AppDataSource.getRepository(Question);
        const answerRepo = AppDataSource.getRepository(UserAnswer);

        const question = await questionRepo.findOneBy({ Q_ID: questionId });
        if (!question) {
            throw new Error(`Question ${questionId} not found`);
        }

        const answer = new UserAnswer();
        answer.userId = userId;
        answer.question = question;
        answer.isCorrect = isCorrect;
        answer.timeSpent = timeSpent;
        answer.hintUsed = hintUsed;
        answer.answerChanged = answerChanged;
        answer.selectedAnswer = selectedAnswer;
        answer.answeredAt = new Date();

        await answerRepo.save(answer);

        // Simple points calculation
        const pointsEarned = isCorrect ? 10 : 0;

        return {
            success: true,
            isCorrect,
            pointsEarned,
            message: isCorrect ? '✅ Correct!' : '❌ Not quite right'
        };
    }
}
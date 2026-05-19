import { QuestStep, QuestMeta } from '../domain/types/quest.types';
import { EngineResult } from '../domain/types/engine.types';
import { calculateUSP } from '../domain/scoring/scoringUtility';
import { calculateFrustration } from '../domain/psych/psychTracker';
import { syncService } from '../infrastructure/sync/syncService';
import { masteryService } from '../domain/mastery/masteryService';
import { generateRescueStep } from '../services/adaptiveEngine';
import { saveNodeCompletion } from '../domain/progress/questProgressService';
import { evaluateRewards } from '../domain/gamification/chestService';
import { rewardService } from '../infrastructure/services/rewardService';

// Extract the 'deriveMetadata' from QuestRunner
function deriveMetadata(step: QuestStep | any) {
    const identifier = step?.file || step?.id || step?.data?.qid || step?.data?.id || step?.data?.file || 'unknown';
    const { conceptId, variant } = masteryService.parseId(identifier);
    
    let pool = 'no';
    const isQuiz = step?.mode === 'quiz' || (step?.data?.mode === 'quiz') || step?.engineType?.includes('FETCHER');
    const isPuzzle = step?.mode === 'puzzle' || (step?.data?.mode === 'puzzle');
    
    if (isQuiz || isPuzzle) pool = 'yes';
    if (identifier.includes('recap') || identifier.includes('study')) pool = 'recap';
    
    return { conceptId, variant, pool };
}

export class QuestSession {
    private _steps: QuestStep[];
    private _meta: QuestMeta;
    private _currentIndex: number = 0;
    private _wrongStreak: number = 0;
    private _correctCount: number = 0;
    private _currentStreak: number = 0;
    private _lastMasteryScore: number = 0;
    private _lastFrustrationScore: number = 0;
    private _sessionStartTime: number = Date.now();
    private _simPool: any[] = [];
    private _notePool: any[] = [];
    private _recapPool: any[] = [];
    private _mcqPool: any[] = [];
    private _rawQuestions: any[] = [];
    // Removed dependency on direct React dispatch. We return outcomes.

    constructor(steps: QuestStep[], meta: QuestMeta) {
        this._steps = steps;
        this._meta = meta;
    }

    get currentStep(): QuestStep | undefined {
        return this._steps[this._currentIndex];
    }

    get rawQuestions(): any[] {
        return this._rawQuestions;
    }

    setRawQuestions(questions: any[]) {
        this._rawQuestions = questions;
    }

    get mcqPool(): any[] {
        return this._mcqPool;
    }

    get simPool(): any[] {
        return this._simPool;
    }

    get notePool(): any[] {
        return this._notePool;
    }

    get recapPool(): any[] {
        return this._recapPool;
    }

    set steps(newSteps: QuestStep[]) {
        this._steps = newSteps;
    }

    get stepIndex(): number {
        return this._currentIndex;
    }

    get totalSteps(): number {
        return this._steps.length;
    }

    get isFinished(): boolean {
        // [Manya Worldclass V8.5] ONLY finish when physical steps are exhausted.
        // We no longer exit early on 100% mastery to ensure the pedagogical flow is complete.
        return this._currentIndex >= this._steps.length;
    }

    get meta(): QuestMeta {
        return this._meta;
    }

    get correctCount(): number {
        return this._correctCount;
    }

    get currentStreak(): number {
        return this._currentStreak;
    }

    get lastMasteryScore(): number {
        return this._lastMasteryScore;
    }

    setPools(pools: { MCQ?: any[], SIMULATION?: any[], NOTE?: any[], RECAP?: any[] }) {
        this._mcqPool = pools.MCQ || [];
        this._simPool = pools.SIMULATION || [];
        this._notePool = pools.NOTE || [];
        this._recapPool = pools.RECAP || [];
    }

    /**
     * PEEK RESULT
     * Used for live granular progress (pulses) from simulation engines.
     * Updates scores without closing the step or triggering completion logic.
     */
    peekResult(engineResult: any) {
        if (!this.currentStep) return;
        // Denominator should be the total questions in the pool or the total steps in the quest
        // v8.5: Use a stable denominator to prevent score spikes
        const totalQuestions = Math.max(10, this._steps.length);
        
        // Use the absolute score (correct + fractional) if provided by the fetcher
        const absoluteScore = engineResult.score !== undefined ? engineResult.score : (this._correctCount + (engineResult.pulseScore || 0));
        this._lastMasteryScore = Math.min(100, Math.round((absoluteScore / totalQuestions) * 100));
    }

    async processResult(engineResult: EngineResult) {
        if (!this.currentStep) return { isCorrect: false, shouldInjectRecap: false, buttonEnabled: false, conceptId: 'unknown' };

        const engineType = this.currentStep.engineType || engineResult.engineType || 'unknown';
        const isSimulation = engineResult.type === 'simulation' || engineResult.type === 'legacy_capture';

        let usp = null;
        if (isSimulation) {
            usp = calculateUSP({
                accuracy: engineResult.accuracy ?? (engineResult.score && engineResult.total ? (engineResult.score / engineResult.total) : (engineResult.isCorrect ? 1.0 : 0.0)),
                mistakes: engineResult.mistakes || 0,
                timeSpentMs: engineResult.timeSpentMs || (Date.now() - this._sessionStartTime),
                engineType: engineType
            }, this._meta.subject);
            this._lastMasteryScore = usp.masteryScore;
        } else {
            // v8.5: Use stable denominator (at least 10) to ensure smooth progression
            const totalQuestions = Math.max(10, this._steps.length);
            const currentCorrect = this._correctCount + (engineResult.isCorrect ? 1 : 0);
            
            this._lastMasteryScore = Math.min(100, Math.round((currentCorrect / totalQuestions) * 100));
        }
        
        console.log(`📊 [QuestSession] USP Mastery Score: ${this._lastMasteryScore}% | Steps: ${this._currentIndex + 1}/${this._steps.length}`);

        const isCorrect = usp ? usp.isPassing : engineResult.isCorrect;

        const { conceptId, variant, pool } = deriveMetadata(this.currentStep);

        const frustration = calculateFrustration({
            consecutiveWrong: this._wrongStreak + (isCorrect ? 0 : 1),
            hintCount: engineResult.hintUsed ? 1 : 0,
            questionsAnswered: this._currentIndex + 1,
            answerChangeCount: engineResult.changeCount || 0
        });

        // Async Push to Sync Service
        if (!engineResult.type?.includes('adaptive_')) {
            syncService.pushAnswer(this._meta.subject, {
                ...engineResult, // Spread all new high-fidelity metrics (idleTimeMs, hesitationCount, etc.)
                questionId: this.currentStep.file || this.currentStep.id || this.currentStep.data?.qid || this.currentStep.data?.id || this.currentStep.data?.file || this.currentStep.topic || 'unknown_step',
                concept_id: conceptId,
                variant: variant,
                isCorrect: isCorrect,
                selectedAnswer: engineResult.selectedAnswer || 'SIM_COMPLETE',
                correctAnswer: engineResult.correctAnswer || 'SIM_COMPLETE',
                timeSpentMs: engineResult.timeSpentMs || (usp ? usp.timeSpentMs : 10000),
                hintUsed: engineResult.hintUsed || false,
                frustrationLevel: frustration.score,
                pool: pool,
                engine_type: engineType,
                usp_data: usp,
                questId: this._meta.questKey,
                questQuestionNumber: this._currentIndex + 1,
                streakAtTime: this._currentStreak
            });
        }

        this._lastFrustrationScore = frustration.score;

        let shouldInjectRecap = false;
        const isAdaptive = engineResult.type?.includes('adaptive_');

        if (!isCorrect && !isAdaptive) {
            this._wrongStreak++;
            this._currentStreak = 0;
            const threshold = 3; // Increased from 1 to prevent aggressive interruptions
            if (this._wrongStreak >= threshold && this._meta.nodeType !== 'WARMUP') {
                shouldInjectRecap = true;
                this._wrongStreak = 0;
            }
        } else {
            this._wrongStreak = 0;
            this._correctCount++;
            this._currentStreak++;
        }

        return {
            isCorrect,
            shouldInjectRecap,
            conceptId,
            buttonEnabled: isCorrect, 
            usp,
            frustration: frustration.score
        };
    }

    async injectRecap(conceptId: string, subject: string) {
        // --- 🧠 BRAIN PHASE 3: ADAPTIVE RESCUE ---
        // Fetch original grammar/sim pools from the first step if available
        // (In a real scenario, we might want to store these in the session)
        const rescueStep = await generateRescueStep(
            subject, 
            this._lastFrustrationScore, 
            conceptId,
            this._simPool,
            this._notePool,
            this._recapPool
        );
        
        // Mutate array and return it
        this._steps.splice(this._currentIndex + 1, 0, rescueStep);
        return [...this._steps];
    }

    async finalize(performance: any, user: any, locationState: any) {
        const rawSubject = locationState?.subject || 'overall';
        const subject = rawSubject.toLowerCase();
        const { questKey, nodeType } = locationState || {};
        const safeNodeType = (nodeType || 'WARMUP').toUpperCase();
        
        let baseCoins = 0; let scale = 0;
        if (safeNodeType === 'WARMUP') { baseCoins = 20; scale = 5; }
        else if (safeNodeType === 'EXPLORE') { baseCoins = 30; scale = 10; }
        else if (safeNodeType === 'PRACTICE') { baseCoins = 40; scale = 15; }
        else if (safeNodeType === 'REINFORCE') { baseCoins = 50; scale = 20; }
        else if (safeNodeType === 'MASTERY') { baseCoins = 100; scale = 25; }
        
        const completionBonus = baseCoins + (this._correctCount * scale);
        const earnedCoins = completionBonus + (performance.totalCoins || 0);

        let completionResult = null;
        let masteryScore = 0;

        // --- MASTERY FINALIZATION (v8.2) ---
        // We now always calculate mastery against the processed session results
        if (safeNodeType === 'EXPLORE') {
            masteryScore = 100;
        } else {
            masteryScore = this._lastMasteryScore || Math.round((this._correctCount / Math.max(1, this._steps.length)) * 100);
        }

        // --- PERSISTENCE (Universal) ---
        if (questKey && safeNodeType) {
            console.log(`💾 [QuestSession] Saving node completion: ${subject} | ${questKey} | ${safeNodeType} | Mastery: ${masteryScore}%`);
            // @ts-ignore
            completionResult = saveNodeCompletion(subject, questKey, safeNodeType, masteryScore);
        }

        const sessionDurationMinutes = (Date.now() - performance.startTime) / 60000;
        const isFirstTry = completionResult ? completionResult.isFirstCompletion : true;

        const stars = masteryScore >= 85 ? 3 : masteryScore >= 70 ? 2 : masteryScore >= 60 ? 1 : 0;

        // @ts-ignore
        const earnedRewards = evaluateRewards({
            mastery: masteryScore,
            streak: user.current_streak || 0,
            sessionTime: sessionDurationMinutes,
            nodeType: safeNodeType,
            subject: subject || 'overall',
            isFirstQuest: isFirstTry,
            hintCount: performance.hintCount || 0,
            modeAchievements: {
                speedrunPerfect: performance.speedrunEngaged && performance.speedrunPerfect && this._correctCount > 2,
                reversePerfect: performance.reverseEngaged && performance.reversePerfect && this._correctCount > 2
            }
        });

        const grantedChests = await Promise.all(earnedRewards.map(async (drop: any) => {
            try {
                const chest = await rewardService.grantChest(user.id, drop.chestType, drop.reason);
                return { ...drop, id: chest.id };
            } catch (e) {
                console.warn('🎁 [QuestSession] Chest grant failed:', e.message);
                return null;
            }
        }));

        const sessionData = {
            startedAt: performance.startTime,
            questId: questKey,
            frustrationLevel: this._lastFrustrationScore || 0,
            engagementLevel: Math.round((this._correctCount / this._steps.length) * 100) || 0,
            cognitiveLoad: performance.reverseEngaged ? 80 : 40,
            masteryLevel: masteryScore >= 85 ? 'mastered' : masteryScore >= 60 ? 'learning' : 'struggling',
            results: {
                score: this._correctCount,
                total: this._steps.length,
                coins: earnedCoins,
                gems: performance.totalGems,
                stars: stars
            }
        };

        syncService.pushSession(sessionData);
        syncService.pushEmotionalMetrics(performance.startTime, sessionData);

        if (completionResult?.unlocked && completionResult?.nextNode) {
            syncService.recordContentUnlock(`${questKey}/${completionResult.nextNode}`, `Study: ${this._meta.title || completionResult.nextNode}`, subject);
        }

        const hasFetcher = this._steps.some(s => s.engineType?.includes('FETCHER'));
        if (hasFetcher) {
            syncService.recordSimulationUnlock(questKey, subject, `Sim: ${this._meta.title || 'Interactive Lesson'}`);
        }

        return {
            earnedCoins,
            masteryScore,
            stars,
            earnedRewards: grantedChests.filter(Boolean),
            completionResult
        };
    }

    advance() {
        this._currentIndex++;
        return this.currentStep;
    }
}

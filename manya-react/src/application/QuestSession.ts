import { QuestStep, QuestMeta } from '../domain/types/quest.types';
import { EngineResult } from '../domain/types/engine.types';
import { calculateUSP } from '../domain/scoring/scoringUtility';
import { calculateFrustration } from '../domain/psych/psychTracker';
import { syncService } from '../infrastructure/sync/syncService';
import { masteryService } from '../domain/mastery/masteryService';
import { generateRescueStep } from '../services/adaptiveEngine';

// Extract the 'deriveMetadata' from QuestRunner
function deriveMetadata(step: QuestStep | any) {
    const identifier = step?.file || step?.id || 'unknown';
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
    // Removed dependency on direct React dispatch. We return outcomes.

    constructor(steps: QuestStep[], meta: QuestMeta) {
        this._steps = steps;
        this._meta = meta;
    }

    get currentStep(): QuestStep | undefined {
        return this._steps[this._currentIndex];
    }

    get stepIndex(): number {
        return this._currentIndex;
    }

    get totalSteps(): number {
        return this._steps.length;
    }

    get isFinished(): boolean {
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

    /**
     * PEEK RESULT
     * Used for live granular progress (pulses) from simulation engines.
     * Updates scores without closing the step or triggering completion logic.
     */
    peekResult(engineResult: any) {
        if (!this.currentStep) return;
        const totalQuestions = engineResult.total || this._steps.length;
        
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
            // Updated: Calculate accuracy against the TOTAL quest questions
            // Fetcher engines provide 'total' in the result.
            const totalQuestions = engineResult.total || this._steps.length;
            const currentCorrect = this._correctCount + (engineResult.isCorrect ? 1 : 0);
            
            this._lastMasteryScore = Math.round((currentCorrect / totalQuestions) * 100);
        }
        
        console.log(`📊 [QuestSession] USP Mastery Score: ${this._lastMasteryScore}%`);

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
                questionId: this.currentStep.file || this.currentStep.id || this.currentStep.topic || 'unknown_step',
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
            const threshold = this._meta.nodeType === 'PRACTICE' ? 1 : 3;
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
            conceptId
        );
        
        // Mutate array and return it
        this._steps.splice(this._currentIndex + 1, 0, rescueStep);
        return [...this._steps];
    }

    advance() {
        this._currentIndex++;
        return this.currentStep;
    }
}

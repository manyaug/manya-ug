import { QuestStep, QuestMeta } from '../domain/types/quest.types';
import { EngineResult } from '../domain/types/engine.types';
import { calculateUSP } from '../domain/scoring/scoringUtility';
import { calculateFrustration } from '../domain/psych/psychTracker';
import { syncService } from '../infrastructure/sync/syncService';
import { masteryService } from '../domain/mastery/masteryService';

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

    async processResult(engineResult: EngineResult) {
        if (!this.currentStep) return { isCorrect: false, shouldInjectRecap: false, xpEarned: 0, buttonEnabled: false, conceptId: 'unknown' };

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
            console.log(`📊 [QuestSession] USP Mastery Score: ${usp.masteryScore}%`);
        }

        const isCorrect = usp ? usp.isPassing : engineResult.isCorrect;
        const xpAmount = isCorrect ? (usp ? Math.floor(usp.masteryScore * 0.5) : (engineResult.score ? engineResult.score * 10 : 10)) : 0;

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
                usp_data: usp
            });
        }

        let shouldInjectRecap = false;
        if (!isCorrect) {
            this._wrongStreak++;
            const threshold = this._meta.nodeType === 'PRACTICE' ? 1 : 3;
            if (this._wrongStreak >= threshold && this._meta.nodeType !== 'WARMUP') {
                shouldInjectRecap = true;
                this._wrongStreak = 0;
            }
        } else {
            this._wrongStreak = 0;
        }

        return {
            isCorrect,
            xpEarned: xpAmount,
            shouldInjectRecap,
            conceptId,
            buttonEnabled: isCorrect, // Only enable if correct logic applies
            usp
        };
    }

    injectRecap(conceptId: string) {
        const recapStep: QuestStep = {
            id: `injected-recap-${Date.now()}`,
            engineType: 'GALLERY_STUDY',
            file: `study_${conceptId}.json`,
            mode: 'study',
            data: { isRecap: true, conceptId }
        };
        
        // Mutate array and return it
        this._steps.splice(this._currentIndex + 1, 0, recapStep);
        return [...this._steps];
    }

    advance() {
        this._currentIndex++;
        return this.currentStep;
    }
}

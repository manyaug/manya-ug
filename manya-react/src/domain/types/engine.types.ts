import React from 'react';

export type EngineType = 'react' | 'legacy';

export interface EngineResult {
    isCorrect: boolean;
    score?: number;
    total?: number;
    accuracy?: number;
    mistakes?: number;
    timeSpentMs?: number;
    type?: string;
    engineType?: string;
    selectedAnswer?: string | number;
    correctAnswer?: string | number | string[];
    hintUsed?: boolean;
    answerChanged?: boolean;
    changeCount?: number;
}

export interface EngineProps {
    /** 
     * Raw data from the quest step JSON.
     * Engine is responsible for validating its own data shape.
     */
    data?: any;
    /** 
     * Called when the student completes all internal steps.
     * Triggers QuestRunner to advance to next step.
     */
    onComplete: () => void;
    /**
     * Called for each scoreable event (answer submission).
     * Engine should NOT advance the quest — only report results.
     */
    onResult: (result: EngineResult) => void;
}

export interface EngineRegistryEntry {
    /** Required: determines render path in QuestRunner */
    type: EngineType;
    /** React.lazy component — required if type === 'react' */
    component: React.LazyExoticComponent<React.ComponentType<EngineProps>>;
    /** If true, the global footer is hidden and engine takes full screen. */
    isImmersive?: boolean;
    /** If true, CONTINUE button is disabled until engine explicitly fires onComplete or enables it. */
    isWait?: boolean;
    /** If true, footer renders with absolute positioning over content. */
    floatingFooter?: boolean;
    /** If true, the global footer div is never rendered. */
    hideGlobalFooter?: boolean;
}

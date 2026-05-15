import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface QuestBusState {
    advanceStep: () => void;
    enableButton: (label?: string) => void;
    disableButton: () => void;
    setIsTyping: (val: boolean) => void;
    onEngineResult: (result: any) => void;
    setPools: (pools: { MCQ?: any[], SIMULATION?: any[], NOTE?: any[], RECAP?: any[] }) => void;
    replaceCurrentStepWith: (steps: any[]) => void;
}

const QuestBusContext = createContext<QuestBusState | null>(null);

export const useQuestBus = () => {
    const context = useContext(QuestBusContext);
    if (!context) {
        console.warn("[QuestBus] useQuestBus called outside QuestBusProvider! Returning no-ops.");
        return {
            advanceStep: () => {},
            enableButton: () => {},
            disableButton: () => {},
            setIsTyping: () => {},
            onEngineResult: () => {},
            setPools: () => {},
            replaceCurrentStepWith: () => {}
        };
    }
    return context;
};

interface QuestBusProviderProps {
    children: ReactNode;
    state: QuestBusState;
}

export const QuestBusProvider: React.FC<QuestBusProviderProps> = ({ children, state }) => {
    return (
        <QuestBusContext.Provider value={state}>
            {children}
        </QuestBusContext.Provider>
    );
};

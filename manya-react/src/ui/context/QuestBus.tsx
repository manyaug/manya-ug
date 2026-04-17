import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface QuestBusState {
    advanceStep: () => void;
    enableButton: (label?: string) => void;
    disableButton: () => void;
    setIsTyping: (val: boolean) => void;
    onEngineResult: (result: any) => void;
}

const QuestBusContext = createContext<QuestBusState | null>(null);

export const useQuestBus = () => {
    const context = useContext(QuestBusContext);
    if (!context) {
        // We log instead of throw here to not crash legacy engines missing the context tree, 
        // but ideally this throws an error.
        console.warn("[QuestBus] useQuestBus called outside QuestBusProvider! Returning no-ops.");
        return {
            advanceStep: () => {},
            enableButton: () => {},
            disableButton: () => {},
            setIsTyping: () => {},
            onEngineResult: () => {}
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

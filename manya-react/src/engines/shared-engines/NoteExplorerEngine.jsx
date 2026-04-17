import React, { useState, useRef, useMemo, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Atomic Resources
import { THEMES, CHEERS, initializeNoteData } from './NoteExplorer/NoteLogic';
import NoteRenderer from './NoteExplorer/NoteRenderer';
import '../../styles/note-explorer.css';

/**
 * NOTE EXPLORER ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates layout logic from visual cards and data transformation.
 */
const NoteExplorerEngine = ({ data, onComplete }) => {
    const [idx, setIdx] = useState(0);
    const [dir, setDir] = useState(1);
    const touchRef = useRef(null);

    // Initialize display-ready cards using domain logic
    const { cards: allCards } = useMemo(() => initializeNoteData(data), [data]);

    const theme = THEMES[idx % THEMES.length];
    const card = allCards[idx];
    const isLast = idx >= allCards.length - 1;

    // Encouragement logic (Manya mascot speech)
    const cheerText = (idx > 0 && idx % 3 === 0) ? CHEERS[idx % CHEERS.length] : null;

    const goNext = useCallback(() => {
        if (isLast) {
            onComplete?.({ success: true, score: 100, isCorrect: true, type: 'study' });
            return;
        }
        setDir(1);
        setIdx(i => i + 1);
        audioService.click?.();
    }, [isLast, onComplete]);

    const goPrev = useCallback(() => {
        if (idx <= 0) return;
        setDir(-1);
        setIdx(i => i - 1);
        audioService.whoosh?.();
    }, [idx]);

    const onTouchStart = (e) => { touchRef.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (!touchRef.current) return;
        const diff = touchRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
        touchRef.current = null;
    };

    if (allCards.length === 0) {
        return <div className="ne-empty">No study notes found.</div>;
    }

    return (
        <NoteRenderer 
            idx={idx}
            dir={dir}
            allCards={allCards}
            theme={theme}
            card={card}
            isLast={isLast}
            goNext={goNext}
            goPrev={goPrev}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            cheerText={cheerText}
        />
    );
};

NoteExplorerEngine.hideGlobalFooter = true;
export default NoteExplorerEngine;

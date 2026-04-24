import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import { audioService } from '../../infrastructure/audio/audioService.js';

import { CHEERS, initializeNoteData } from './NoteExplorer/NoteLogic';
import NoteRenderer from './NoteExplorer/NoteRenderer';
import '../../styles/note-explorer.css';

/**
 * NOTE EXPLORER ENGINE v6.0 (Clean Rewrite)
 * ------------------------------------------
 * Simple, no-mascot, pink-accent note reader.
 */
const NoteExplorerEngine = ({ data, onComplete, skipDiscovery = false }) => {
  const dispatch = useDispatch();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const touchRef = useRef(null);

  const { cards: allCards } = useMemo(() => initializeNoteData(data), [data]);

  const card = allCards[idx];
  const isLast = idx >= allCards.length - 1;
  const cheerText = idx > 0 && idx % 3 === 0 ? CHEERS[idx % CHEERS.length] : null;

  const goNext = useCallback(() => {
    if (isLast) {
      if (!skipDiscovery) {
        dispatch(
          discoverArtifact({
            id: data.id || `note_${Date.now()}`,
            type: data.type === 'DICTIONARY' ? 'dictionary' : 'note',
            title: data.title || 'Knowledge Note',
            subject: data.subject || 'General',
            data: data,
          })
        );
        dispatch(
          addToast({
            message: 'Knowledge Artifact Archived to Vault! 🏺✨',
            type: 'success',
          })
        );
      }
      onComplete?.({ success: true, score: 100, isCorrect: true, type: 'study' });
      return;
    }
    setDir(1);
    setIdx((i) => i + 1);
    audioService.click?.();
  }, [isLast, onComplete, data, dispatch, skipDiscovery]);

  const goPrev = useCallback(() => {
    if (idx <= 0) return;
    setDir(-1);
    setIdx((i) => i - 1);
    audioService.whoosh?.();
  }, [idx]);

  const onTouchStart = (e) => {
    touchRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const diff = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
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

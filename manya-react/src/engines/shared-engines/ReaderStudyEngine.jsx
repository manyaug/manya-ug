import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import ReaderRenderer from './Reader/ReaderRenderer';
import { 
    getAccentColor, 
    calculateScrollProgress 
} from './Reader/ReaderLogic';

/**
 * READER STUDY ENGINE v4.0 (Atomic)
 * ───────────────────────────────────────────────────
 * - DECOUPLED: Logic (ReaderLogic), Renderer (ReaderRenderer), Controller (Engine)
 */
export function ReaderStudyEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const [isVisible, setIsVisible] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);

    const accent = useMemo(() => getAccentColor(data || {}), [data]);

    useEffect(() => {
        setIsVisible(true);
        // Initial check if content is small
        if (containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight <= clientHeight) setScrollProgress(100);
        }
    }, [data]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setScrollProgress(calculateScrollProgress(scrollTop, scrollHeight, clientHeight));
    };

    const handleFinish = () => {
        // DISCOVER Artifact for Vault
        const artifactTitle = data.topic || data.title || 'Study Recap';
        dispatch(discoverArtifact({
            id: data.id || `recap_${Date.now()}`,
            type: 'recap',
            title: artifactTitle,
            subject: data.subject || 'General',
            data: data 
        }));

        // ARCHIVE Notification
        dispatch(addToast({
            message: `"${artifactTitle}" saved to your Library! 🏺`,
            type: 'success'
        }));

        if (onResult) {
            onResult({ isCorrect: true, score: 1, total: 1, type: 'study' });
        }
        onComplete();
    };

    if (!data) return <div className="p-8 text-center opacity-50">No content available.</div>;

    return (
        <ReaderRenderer 
            refContainer={containerRef}
            data={data}
            accent={accent}
            isVisible={isVisible}
            onScroll={handleScroll}
            onComplete={handleFinish}
        />
    );
}

export default ReaderStudyEngine;

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import * as d3 from 'd3';
import { assetUrl } from '../../config/assetUrls';

// Atomic Resources
import { validateQuizAnswer } from './UniversalGlobe/GlobeLogic';
import GlobeRenderer from './UniversalGlobe/GlobeRenderer';
import GlobeCanvas from './UniversalGlobe/GlobeCanvas';

/**
 * UNIVERSAL GLOBE ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Logic (GlobeLogic), Renderer (GlobeRenderer), Canvas (GlobeCanvas), Controller (Engine)
 */
const UniversalGlobeEngine = ({ data, onComplete, onResult, onAttempt }) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState(0);
    const [worldData, setWorldData] = useState(null);
    const [placedPieces, setPlacedPieces] = useState([]);
    const [quizFeedback, setQuizFeedback] = useState(null);
    const [selectedQuizOpt, setSelectedQuizOpt] = useState(null);
    const [isDark, setIsDark] = useState(false);
    const [isD3Ready, setIsD3Ready] = useState(false);
    
    // Performance Refs (Shared with Canvas via Props)
    const startTimeRef = useRef(Date.now());
    const globalStartTimeRef = useRef(Date.now());
    const mistakesRef = useRef(0);
    const rotationRef = useRef(data?.initialRotation || [0, -10]);
    const scaleRef = useRef(1);
    const isDraggingRef = useRef(false);
    const projectionRef = useRef(null);
    const pathRef = useRef(null);

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // --- 📡 DATA LOAD ---
    useEffect(() => {
        fetch(assetUrl('data/world-atlas.json'))
            .then(res => res.json())
            .then(json => {
                setWorldData(json);
                setIsD3Ready(true);
            })
            .catch(err => console.error("Failed to load map data", err));
    }, []);

    // --- 🧠 QUIZ LOGIC ---
    const handleQuizAnswer = (opt) => {
        if (quizFeedback?.type === 'success') return;
        setSelectedQuizOpt(opt);
        setQuizFeedback(null);
    };

    const submitQuizAnswer = () => {
        if (!selectedQuizOpt || quizFeedback?.type === 'success') return;
        const q = data.questions[activeTab];
        const isCorrect = validateQuizAnswer(selectedQuizOpt, q.correctAnswer);
        const duration = Date.now() - startTimeRef.current;

        if (onAttempt) onAttempt({ isCorrect, label: `Globe Quiz: ${activeTab + 1}`, duration, mistakes: isCorrect ? 0 : 1 });

        if (isCorrect) {
            if (onResult) onResult({ isCorrect: true, score: 1, total: 1, type: 'quiz', selectedAnswer: selectedQuizOpt, correctAnswer: q.correctAnswer });
            setQuizFeedback({ type: 'success', text: "Correct!" });
            setTimeout(() => {
                if (activeTab < data.questions.length - 1) {
                    setActiveTab(prev => prev + 1);
                    setQuizFeedback(null);
                    setSelectedQuizOpt(null);
                    startTimeRef.current = Date.now();
                } else {
                    if (onComplete) onComplete({
                        isCorrect: mistakesRef.current === 0,
                        accuracy: Math.max(0, (data.questions.length - mistakesRef.current) / data.questions.length),
                        score: data.questions.length - mistakesRef.current,
                        total: data.questions.length,
                        mistakes: mistakesRef.current,
                        duration: Date.now() - globalStartTimeRef.current,
                        type: 'simulation',
                        engineType: 'GLOBE_QUIZ'
                    });
                }
            }, 1200);
        } else {
            if (onResult) onResult({ isCorrect: false, score: 0, total: 1, type: 'quiz', selectedAnswer: selectedQuizOpt, correctAnswer: q.correctAnswer, duration, mistakes: 1 });
            mistakesRef.current += 1;
            setQuizFeedback({ type: 'error', text: q.explanation || "Try again!", selectedOpt: selectedQuizOpt });
        }
    };

    // --- 🧩 PUZZLE LOGIC ---
    const handleDragStart = (e, piece) => {
        const uv = e.touches ? e.touches[0] : e;
        const ghost = document.createElement('div');
        ghost.className = 'fixed pointer-events-none z-[9999] px-4 py-2 bg-amber-500 text-white rounded-xl font-bold shadow-lg';
        ghost.style.left = `${uv.clientX}px`; ghost.style.top = `${uv.clientY}px`;
        ghost.innerText = piece.label; document.body.appendChild(ghost);

        const move = (m) => {
            const mv = m.touches ? m.touches[0] : m;
            ghost.style.left = `${mv.clientX}px`; ghost.style.top = `${mv.clientY}px`;
        };

        const up = (u) => {
            const uv_up = u.changedTouches ? u.changedTouches[0] : u;
            document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
            document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
            ghost.remove();

            // Simple hit-test fallback since Canvas lives in child GlobeCanvas
            // In a better design, we'd use a shared event bus, but for now we query the canvas directly if needed
            const canvas = document.querySelector('.globe-engine-root canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (uv_up.clientX >= rect.left && uv_up.clientX <= rect.right && uv_up.clientY >= rect.top && uv_up.clientY <= rect.bottom) {
                    const coords = projectionRef.current.invert([uv_up.clientX - rect.left, uv_up.clientY - rect.top]);
                    const isCorrect = d3.geoDistance(coords, piece.target) < 0.45;
                    const duration = Date.now() - startTimeRef.current;

                    if (isCorrect) {
                        if (onAttempt) onAttempt({ isCorrect: true, label: `Globe Puzzle Piece: ${piece.label}`, duration, mistakes: 0 });
                        setPlacedPieces(p => {
                            const n = [...p, piece.id];
                            if (n.length === data.pieces.length) {
                                if (onResult) onResult({ isCorrect: true, score: n.length, total: data.pieces.length, type: 'puzzle' });
                                if (onComplete) setTimeout(() => onComplete({ isCorrect: true, score: data.pieces.length, total: data.pieces.length, type: 'puzzle' }), 1200);
                            }
                            return n;
                        });
                        startTimeRef.current = Date.now();
                    } else {
                        mistakesRef.current += 1;
                        if (onAttempt) onAttempt({ isCorrect: false, label: `Globe Puzzle Piece: ${piece.label}`, duration, mistakes: 1 });
                    }
                }
            }
        };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up);
    };

    // --- 🎢 TRANSITIONS ---
    const focusOn = useCallback((rot, zoom = 1) => {
        if (!projectionRef.current) return;
        const startRotate = projectionRef.current.rotate();
        const startScale = projectionRef.current.scale();

        d3.transition()
            .duration(1200)
            .ease(d3.easeCubicOut)
            .tween("move", () => {
                const r = d3.interpolate(startRotate, rot);
                const s = d3.interpolate(startScale, scaleRef.current * zoom * (data.zoomFactor || 1));
                return (t) => {
                    projectionRef.current.rotate(r(t));
                    projectionRef.current.scale(s(t));
                    rotationRef.current = r(t);
                    // Force a re-render/re-draw handled by child effects
                };
            });
    }, [data.zoomFactor]);

    const handleFinishActivity = () => {
        // DISCOVER Artifact for Vault
        dispatch(discoverArtifact({
            id: data.id || `globe_${Date.now()}`,
            type: 'map',
            title: data.title || 'Globe Discovery',
            subject: data.subject || 'SST',
            data: data 
        }));

        // ARCHIVE Notification
        dispatch(addToast({
            message: "Global Discovery Archived to Vault! 🏺✨",
            type: "success"
        }));

        if (onComplete) onComplete({ isCorrect: true, score: data.cases?.length || 1, total: data.cases?.length || 1, type: 'study' });
    };

    return (
        <GlobeRenderer 
            isDark={isDark}
            data={data}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            placedPieces={placedPieces}
            quizFeedback={quizFeedback}
            selectedQuizOpt={selectedQuizOpt}
            handleQuizAnswer={handleQuizAnswer}
            submitQuizAnswer={submitQuizAnswer}
            handleDragStart={handleDragStart}
            focusOn={focusOn}
            onFinishActivity={handleFinishActivity}
            isD3Ready={isD3Ready}
            GlobeCanvas={<GlobeCanvas 
                worldData={worldData} data={data} activeTab={activeTab} placedPieces={placedPieces}
                isDark={isDark} rotationRef={rotationRef} scaleRef={scaleRef} isDraggingRef={isDraggingRef}
                projectionRef={projectionRef} pathRef={pathRef} isD3Ready={isD3Ready}
                onPinClick={(idx) => {
                    const curCase = (data?.mode === 'study') ? data.cases[activeTab] : 
                                   (data?.mode === 'quiz')  ? data.questions[activeTab] : {};
                    const pins = curCase?.markers || curCase?.points || [];
                    const p = pins[idx];
                    if (p) {
                        if (data.mode === 'study') setActiveTab(idx);
                        focusOn([-p.lon || -p.lng || 0, -p.lat || 0], 1.5);
                    }
                }}
            />}
        />
    );
};

export default UniversalGlobeEngine;

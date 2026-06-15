import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import * as d3 from 'd3';
import { assetUrl } from '../../config/assetUrls';
import { storageFacade } from '../../infrastructure/storage/storageFacade.js';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Atomic Resources
import { validateQuizAnswer } from './UniversalGlobe/GlobeLogic';
import GlobeRenderer from './UniversalGlobe/GlobeRenderer';
import GlobeCanvas from './UniversalGlobe/GlobeCanvas';

/**
 * UNIVERSAL GLOBE ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Logic (GlobeLogic), Renderer (GlobeRenderer), Canvas (GlobeCanvas), Controller (Engine)
 */
const UniversalGlobeEngine = ({ data: rawData, onComplete, onResult, onAttempt, onSimSuccess, onSimWrong, skipDiscovery = false }) => {
    // 🛡️ [Manya v5.9] Payload Normalization (v8.2) + Decoy Generation
    const data = useMemo(() => {
        let baseData = (rawData.question || rawData.lat || rawData.lon) && !rawData.questions && !rawData.cases && !rawData.pieces
            ? { 
                ...rawData, 
                id: rawData.id || rawData.qid, 
                questions: rawData.question ? [{ 
                    ...rawData,
                    id: rawData.id || rawData.qid,
                    question: rawData.question, 
                    options: rawData.options || [], 
                    correctAnswer: rawData.answer || rawData.correctAnswer,
                    explanation: rawData.explanation 
                }] : [],
                cases: (rawData.lat || rawData.lon) ? [{
                    id: 'spotlight',
                    title: rawData.question || 'Geographic Focus',
                    markers: [{ lat: rawData.lat, lon: rawData.lon, label: rawData.subtopic || 'Location' }]
                }] : [],
                mode: rawData.question ? 'quiz' : 'study'
              }
            : { ...rawData, id: rawData.id || rawData.qid };

        const tempMode = baseData.mode?.toLowerCase() || 
                         (baseData.questions?.length > 0 ? 'quiz' : 
                          (baseData.pieces?.length > 0 ? 'puzzle' : 
                           (baseData.cases?.length > 0 || baseData.points?.length > 0) ? 'study' : 'study'));

        // Shuffled decoy generation for single-piece puzzle mode questions
        if (tempMode === 'puzzle' && baseData.pieces?.length === 1) {
            const correctPiece = baseData.pieces[0];
            const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|A\.M\.|P\.M\.)/i;
            const match = correctPiece.label.match(timeRegex);
            const decoyTimes = new Set();
            const correctNormalized = correctPiece.label.replace(/\s+/g, ' ').toUpperCase();

            if (match) {
                const hour = parseInt(match[1], 10);
                const minute = match[2];
                const meridiem = match[3];
                const isDotFormat = meridiem.includes('.');
                const cleanMeridiem = meridiem.toUpperCase().replace(/\./g, '');

                const formatDecoyTime = (h, m, mer) => {
                    let normH = h % 12;
                    if (normH === 0) normH = 12;
                    let formattedMer = mer;
                    if (isDotFormat) {
                        formattedMer = mer === 'AM' ? 'A.M.' : 'P.M.';
                    } else {
                        formattedMer = mer;
                    }
                    return `${normH}:${m} ${formattedMer}`;
                };

                const offsets = [3, 6, 9, 2, 4, 5, 7, 8];
                for (const offset of offsets) {
                    const decoyH = (hour + offset - 1) % 12 + 1;
                    const decoyLabel = correctPiece.label.replace(timeRegex, formatDecoyTime(decoyH, minute, cleanMeridiem));
                    if (decoyLabel.replace(/\s+/g, ' ').toUpperCase() !== correctNormalized) {
                        decoyTimes.add(decoyLabel);
                    }
                    if (decoyTimes.size >= 2) break;
                }

                const oppositeMer = cleanMeridiem === 'AM' ? 'PM' : 'AM';
                const oppositeLabel = correctPiece.label.replace(timeRegex, formatDecoyTime(hour, minute, oppositeMer));
                if (oppositeLabel.replace(/\s+/g, ' ').toUpperCase() !== correctNormalized) {
                    decoyTimes.add(oppositeLabel);
                }

                if (decoyTimes.size < 3) {
                    for (const offset of offsets) {
                        const decoyH = (hour + offset - 1) % 12 + 1;
                        const decoyLabel = correctPiece.label.replace(timeRegex, formatDecoyTime(decoyH, minute, oppositeMer));
                        if (decoyLabel.replace(/\s+/g, ' ').toUpperCase() !== correctNormalized) {
                            decoyTimes.add(decoyLabel);
                        }
                        if (decoyTimes.size >= 3) break;
                    }
                }
            } else {
                decoyTimes.add(`${correctPiece.label} B`);
                decoyTimes.add(`${correctPiece.label} C`);
                decoyTimes.add(`${correctPiece.label} D`);
            }

            const decoys = Array.from(decoyTimes).map((label, idx) => ({
                id: `decoy_${idx}`,
                label,
                icon: correctPiece.icon || "🕐",
                target: null,
                color: correctPiece.color || "#94a3b8"
            }));

            const combined = [correctPiece, ...decoys];
            for (let i = combined.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [combined[i], combined[j]] = [combined[j], combined[i]];
            }

            baseData = {
                ...baseData,
                pieces: combined
            };
        }

        return baseData;
    }, [rawData]);

    const mode = data.mode?.toLowerCase() || 
                 (data.questions?.length > 0 ? 'quiz' : 
                  (data.pieces?.length > 0 ? 'puzzle' : 
                   (data.cases?.length > 0 || data.points?.length > 0) ? 'study' : 'study'));
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState(0);
    const [worldData, setWorldData] = useState(null);
    const [placedPieces, setPlacedPieces] = useState([]);
    const [quizFeedback, setQuizFeedback] = useState(null);
    const [selectedQuizOpt, setSelectedQuizOpt] = useState(null);
    const [puzzleFeedback, setPuzzleFeedback] = useState(null);
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
        const nodeId = data.id || data.qid || data.topic || 'simulation';
        console.log(`%c 🌍 [UniversalGlobeEngine] Active Node: ${nodeId}`, 'color: #8b5cf6; font-weight: bold;');
    }, [data.id, data.qid, data.topic]);
    
    useEffect(() => {
        storageFacade.get(`file:${assetUrl('data/world-atlas.json')}`)
            .then(json => {
                setWorldData(json);
                setIsD3Ready(true);
            })
            .catch(err => console.error("Failed to load map data", err));
    }, []);

    const lastReportedScore = useRef(0);

    // --- REPORT PARTIAL PROGRESS ---
    useEffect(() => {
        if (onResult && mode === 'quiz' && data?.questions?.length > 0 && activeTab !== lastReportedScore.current) {
            lastReportedScore.current = activeTab;
            onResult({
                isCorrect: false,
                score: activeTab,
                total: data.questions.length,
                type: 'pulse'
            });
        }
    }, [activeTab, data?.questions?.length, onResult, mode]);

    // --- 🧠 QUIZ LOGIC ---
    const handleQuizAnswer = (opt) => {
        if (quizFeedback !== null) return;
        setSelectedQuizOpt(opt);
        setQuizFeedback(null);
    };

    const submitQuizAnswer = () => {
        if (!selectedQuizOpt || quizFeedback !== null) return;
        const q = data.questions[activeTab];
        const isCorrect = validateQuizAnswer(selectedQuizOpt, q.correctAnswer);
        const duration = Date.now() - startTimeRef.current;

        if (onAttempt) onAttempt({ isCorrect, label: `Globe Quiz: ${activeTab + 1}`, duration, mistakes: isCorrect ? 0 : 1 });

        if (isCorrect) {
            audioService.success?.();
            onSimSuccess?.(); // Cinematic Dim + Badge
            
            // 🚀 Coin Flight Burst
            window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                detail: {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                    type: 'coin',
                    amount: 5
                }
            }));

            setQuizFeedback({ type: 'success', text: "Correct!" });
            setTimeout(() => {
                if (activeTab < data.questions.length - 1) {
                    // Send a pulse update to let the orchestrator know of intermediate tab success
                    if (onResult) {
                        onResult({ 
                            type: 'pulse', 
                            isCorrect: true, 
                            score: activeTab + 1, 
                            total: data.questions?.length || 1 
                        });
                    }
                    setActiveTab(prev => prev + 1);
                    setQuizFeedback(null);
                    setSelectedQuizOpt(null);
                    startTimeRef.current = Date.now();
                } else {
                    // Final completed step outcome: report comprehensive stats so session completes
                    if (onResult) {
                        onResult({
                            isCorrect: mistakesRef.current === 0,
                            accuracy: Math.max(0, (data.questions.length - mistakesRef.current) / data.questions.length),
                            score: data.questions.length - mistakesRef.current,
                            total: data.questions.length,
                            type: 'simulation',
                            engineType: 'GLOBE_QUIZ',
                            selectedAnswer: selectedQuizOpt,
                            correctAnswer: q.correctAnswer,
                            mistakes: mistakesRef.current,
                            duration: Date.now() - globalStartTimeRef.current
                        });
                    }
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
            // intermediate wrong click: report as a pulse result so the orchestrator
            // registers the mistake/frustration but does NOT finalize the step or re-adapt yet
            if (onResult) {
                onResult({ 
                    type: 'pulse', 
                    isCorrect: false, 
                    score: activeTab, 
                    total: data.questions?.length || 1, 
                    selectedAnswer: selectedQuizOpt, 
                    correctAnswer: q.correctAnswer, 
                    duration, 
                    mistakes: 1 
                });
            }
            mistakesRef.current += 1;
            onSimWrong?.(); // Snappy "Try Again" Overlay
            setQuizFeedback({ type: 'error', text: '' }); // Clear text to avoid distraction, just show overlay
        }
    };

    const handleNext = () => {
        const q = data.questions[activeTab];
        if (activeTab < data.questions.length - 1) {
            setActiveTab(prev => prev + 1);
            setQuizFeedback(null);
            setSelectedQuizOpt(null);
            startTimeRef.current = Date.now();
        } else {
            // Final completed step outcome: report comprehensive stats so session completes
            if (onResult) {
                onResult({
                    isCorrect: mistakesRef.current === 0,
                    accuracy: Math.max(0, (data.questions.length - mistakesRef.current) / data.questions.length),
                    score: data.questions.length - mistakesRef.current,
                    total: data.questions.length,
                    type: 'simulation',
                    engineType: 'GLOBE_QUIZ',
                    selectedAnswer: selectedQuizOpt,
                    correctAnswer: q.correctAnswer,
                    mistakes: mistakesRef.current,
                    duration: Date.now() - globalStartTimeRef.current
                });
            }
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
    };

    // --- 🧩 PUZZLE LOGIC ---
    const handleDragStart = (e, piece) => {
        if (puzzleFeedback !== null) return;
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

            const canvas = document.querySelector('.globe-engine-root canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (uv_up.clientX >= rect.left && uv_up.clientX <= rect.right && uv_up.clientY >= rect.top && uv_up.clientY <= rect.bottom) {
                    const coords = projectionRef.current.invert([uv_up.clientX - rect.left, uv_up.clientY - rect.top]);
                    const isCorrect = piece.target && d3.geoDistance(coords, piece.target) < 0.45;
                    const duration = Date.now() - startTimeRef.current;
                    const targetCount = data.pieces.filter(x => x.target).length;

                    if (isCorrect) {
                        audioService.success?.();
                        onSimSuccess?.(); // Cinematic Dim + Badge

                        window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                            detail: {
                                x: uv_up.clientX,
                                y: uv_up.clientY,
                                type: 'coin',
                                amount: 5
                            }
                        }));

                        if (onAttempt) onAttempt({ isCorrect: true, label: `Globe Puzzle Piece: ${piece.label}`, duration, mistakes: 0 });
                        setPlacedPieces(p => {
                            const n = [...p, piece.id];
                            if (onResult) onResult({ isCorrect: true, score: n.length, total: targetCount, type: 'puzzle' });
                            if (n.length === targetCount) {
                                if (onComplete) setTimeout(() => onComplete({ isCorrect: true, score: targetCount, total: targetCount, type: 'puzzle' }), 1200);
                            }
                            return n;
                        });
                        startTimeRef.current = Date.now();
                    } else {
                        mistakesRef.current += 1;
                        onSimWrong?.(); // Snappy "Try Again" Overlay
                        if (onAttempt) onAttempt({ isCorrect: false, label: `Globe Puzzle Piece: ${piece.label}`, duration, mistakes: 1 });
                        
                        // For single-target puzzles, enter failure state on first mistake
                        if (targetCount === 1) {
                            setPuzzleFeedback('error');
                            if (onResult) {
                                onResult({
                                    isCorrect: false,
                                    score: 0,
                                    total: 1,
                                    type: 'puzzle',
                                    mistakes: mistakesRef.current,
                                    duration: Date.now() - globalStartTimeRef.current
                                });
                            }
                        }
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
        if (!skipDiscovery) {
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
        }

        if (onResult) onResult({ isCorrect: true, score: data.cases?.length || 1, total: data.cases?.length || 1, type: 'study' });
        if (onComplete) onComplete({ isCorrect: true, score: data.cases?.length || 1, total: data.cases?.length || 1, type: 'study' });
    };

    return (
        <GlobeRenderer 
            isDark={isDark}
            data={data}
            mode={mode}
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
            onNext={handleNext}
            isD3Ready={isD3Ready}
            puzzleFeedback={puzzleFeedback}
            GlobeCanvas={<GlobeCanvas 
                worldData={worldData} data={data} activeTab={activeTab} placedPieces={placedPieces}
                isDark={isDark} rotationRef={rotationRef} scaleRef={scaleRef} isDraggingRef={isDraggingRef}
                projectionRef={projectionRef} pathRef={pathRef} isD3Ready={isD3Ready}
                puzzleFeedback={puzzleFeedback}
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

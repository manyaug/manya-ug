import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { Lightbulb, AlertCircle, Compass, Zap, Check, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerRewardFlight } from '../../utils/fxUtils';

// Decoupled Resources
import { REGION_MAP, normalize, evaluateExpr, validateInteraction } from './SetTheory/SetTheoryLogic';
import VennCanvas from './SetTheory/VennCanvas';
import ManyaKeyboard from '../../components/engine/ManyaKeyboard';

/**
 * MANYA SET THEORY ENGINE v8.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED ARCHITECTURE: Separates Logic (JS), Renderer (Canvas), and UI (React).
 */

const SetTheoryEngine = ({ data, onComplete, onResult, onSimSuccess, onSimWrong }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [selectedRegions, setSelectedRegions] = useState(new Set());
  const [chips, setChips] = useState([]);
  const [activeSets, setActiveSets] = useState({ a: null, b: null });
  const [successfulAnswers, setSuccessfulAnswers] = useState({});
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [isResolved, setIsResolved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [kbOpen, setKbOpen] = useState(false);
  const [activeKbId, setActiveKbId] = useState(null);

  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const feedbackBtnRef = useRef(null);
  
  const currentStep = data?.questions?.[stepIdx];
  const isTwoSet = !!(data?.sets?.B && data?.sets?.B?.label !== "");

  // --- 🪄 THEME SYNC ---
  useLayoutEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // --- 📏 LAYOUT ENGINE ---
  const computeLayout = useCallback(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return null;
    const { width, height } = canvasSize;
    const isMobile = width <= 480;
    const isDisjoint = (data.topic || "").toLowerCase().includes("disjoint");

    const r = Math.min(isMobile ? 85 : 120, width * 0.28);
    const offset = !isTwoSet ? 0 : (isDisjoint ? r * 1.05 : r * 0.55); 
    const cy = height * 0.5;

    return {
      c1: { x: width/2 - offset, y: cy, color: data.sets?.A?.color || "#16a34a" },
      c2: { x: width/2 + offset, y: cy, color: data.sets?.B?.color || "#ea580c" },
      r, cx: width/2, cy, width, height, s: window.devicePixelRatio || 2, isMobile, isDisjoint, offset
    };
  }, [canvasSize, data, isTwoSet]);

  // --- 🧠 INTERACTION HANDLER ---
  const handleInteraction = useCallback(() => {
    if (isResolved) {
        if (stepIdx < data.questions?.length - 1) { 
            setStepIdx(p => p+1); 
            setUserAnswers({}); 
            setSelectedRegions(new Set());
            setKbOpen(false);
            setActiveKbId(null);
            setIsResolved(false); 
            setFeedback({text:'', type:''}); 
            return; 
        }
        else { onComplete(); return; }
    }
    
    const { isCorrect, corrected } = validateInteraction({
        currentStep, userAnswers, chips, activeSets, l: computeLayout(), data, isTwoSet, selectedRegions
    });

    if (onResult) onResult({ isCorrect, selectedAnswer: Object.values(userAnswers).join('|'), correctAnswer: corrected, type: 'simulation' });
    
    if (isCorrect) { 
        setIsResolved(true); 
        setFeedback({ text: 'CORRECT!', type: 'success' }); 
        
        // Premium Feedback & Global Events
        // onSimSuccess handles high-fidelity audio (success.mp3) and coin bursts
        if (onSimSuccess) onSimSuccess();
        else {
            audioService.correct();
            setTimeout(() => triggerRewardFlight({ x: window.innerWidth/2, y: window.innerHeight - 80 }, 'coin', 5), 200);
        }
        
        window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: data.subject || 'math' } }));

        // [Manya v4 Pulse] Notify parent HUD of step completion
        onResult?.({
            score: stepIdx + 1,
            total: data.questions.length,
            isCorrect: true,
            type: 'step_complete'
        });

        // Persist answers for retain_visuals
        if (Object.keys(userAnswers).length > 0) {
            setSuccessfulAnswers(prev => ({ ...prev, ...userAnswers }));
        }
    } else { 
        setFeedback({ text: 'NOT QUITE RIGHT', type: 'error' }); 
        audioService.wrong(); 
        if (onSimWrong) onSimWrong();
        window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: data.subject || 'math' } }));
    }
  }, [isResolved, stepIdx, data, userAnswers, chips, activeSets, computeLayout, isTwoSet, selectedRegions, onComplete, onResult, onSimSuccess, onSimWrong]);

  const onMouseDown = (e) => {
    if (e.cancelable) e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (cx - rect.left) * (canvasSize.width / rect.width), py = (cy - rect.top) * (canvasSize.height / rect.height);
    
    if (currentStep.interaction === 'DRAG_SETS') {
        const hit = [activeSets.b, activeSets.a].find(s => s && Math.hypot(px - s.x, py - s.y) < s.r + 20);
        if (hit) { draggingRef.current = hit; dragOffsetRef.current = { x: px - hit.x, y: py - hit.y }; }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const chip = [...chips].reverse().find(c => Math.hypot(c.x - px, c.y - py) < 35);
        if (chip) { draggingRef.current = chip; dragOffsetRef.current = { x: px - chip.x, y: py - chip.y }; }
    } else if (currentStep.interaction === 'CLICK_SUM' || currentStep.interaction === 'SHADE_REGION') {
        const l = computeLayout(); if (!l) return;
        const d1 = Math.hypot(px - l.c1.x, py - l.cy), d2 = Math.hypot(px - l.c2.x, py - l.cy);
        let zone = "outside";
        if (!l.isDisjoint && isTwoSet && d1 < l.r && d2 < l.r) zone = "center";
        else if (d1 < l.r) zone = "left"; else if (d2 < l.r && isTwoSet) zone = "right";

        setSelectedRegions(prev => {
            const next = new Set(prev);
            if (next.has(zone)) next.delete(zone); else next.add(zone);
            return next;
        });
    }
  };

  const onMouseMove = (e) => {
    const activeDrag = draggingRef.current;
    const dragOffset = dragOffsetRef.current;
    if (!activeDrag) return;

    if (e.cancelable) e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (cx - rect.left) * (canvasSize.width / rect.width), py = (cy - rect.top) * (canvasSize.height / rect.height);
    
    if (currentStep?.interaction === 'DRAG_SETS') {
        setActiveSets(prev => {
            if (!prev || !activeDrag.id || !prev[activeDrag.id]) return prev;
            return { ...prev, [activeDrag.id]: { ...prev[activeDrag.id], x: px - dragOffset.x, y: py - dragOffset.y } };
        });
    } else {
        setChips(prev => {
            if (!prev) return prev;
            return prev.map(c => (c && c.id === activeDrag.id) ? { ...c, x: px - dragOffset.x, y: py - dragOffset.y } : c);
        });
    }
  };

  // --- 🔄 LIFECYCLE: CLEANUP ON QUESTION CHANGE ---
  useEffect(() => {
    draggingRef.current = null; // Clear physical drag state
    setKbOpen(false); // Close keyboard when moving to a new question
    setActiveKbId(null);
    setIsResolved(false); 
    setFeedback({text:'', type:''}); 
    setIsHintVisible(false);
  }, [stepIdx]);

  // --- 🔄 LIFECYCLE: SETUP STEPS (Layout Dependent) ---
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.interaction === 'DRAG_SETS' && currentStep.items) {
        const items = currentStep.items;
        setActiveSets({
            a: { id: 'a', ...items[0], x: items[0].x || 100, y: items[0].y || 200, r: items[0].radius || items[0].r || 80, label: items[0].val || items[0].label || "A" },
            b: items[1] ? { id: 'b', ...items[1], x: items[1].x || 300, y: items[1].y || 200, r: items[1].radius || items[1].r || 80, label: items[1].val || items[1].label || "B" } : null
        });
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const raw = currentStep.chips || currentStep.items || [];
        setChips(raw.map((v, i) => ({ id: i, val: v.val || v, target: v.target || 'outside', x: 50 + (i * 60), y: (canvasSize.height || 400) - 50 })));
    }
  }, [stepIdx, data, canvasSize.height]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => { 
        if (entries[0] && entries[0].contentRect.width > 0) {
            setCanvasSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); 
        }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const openKeyboard = (id) => {
    setActiveKbId(id);
    setKbOpen(true);
  };

  const handleKbInput = (char) => {
    if (!activeKbId) return;
    setUserAnswers(prev => ({ ...prev, [activeKbId]: (prev[activeKbId] || '') + char }));
    audioService.tap();
  };

  const handleKbDelete = () => {
    if (!activeKbId) return;
    setUserAnswers(prev => ({ ...prev, [activeKbId]: (prev[activeKbId] || '').slice(0, -1) }));
    audioService.pop();
  };

  // --- 🎨 FINAL RENDER ZONES (Always merge history for worksheets) ---
  const mergedZones = { ...(data.zones || {}), ...successfulAnswers };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-y-auto no-scrollbar select-none font-['Plus_Jakarta_Sans'] antialiased">
        {/* 1. FIXED HEADER (Bulletproof Manya) */}
        <div className="p-4 flex-shrink-0 z-20">
            <div className={`rounded-3xl p-5 border-2 shadow-xl relative overflow-hidden transition-all ${isDark ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                            <Compass size={14} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {typeof data.topic === 'object' ? data.topic.label : (data.topic || "Set Theory")} · {stepIdx + 1}/{data.questions.length}
                        </span>
                    </div>
                    {/* Progress & Hint */}
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            {data.questions.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === stepIdx ? 'bg-indigo-500 w-4' : (i < stepIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800')}`} />
                            ))}
                        </div>
                        <button 
                            onClick={() => {
                                setIsHintVisible(!isHintVisible);
                                if (!isHintVisible) audioService.click();
                            }}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                                isHintVisible 
                                ? 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-500/20' 
                                : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400')
                            }`}
                        >
                            <Lightbulb size={20} />
                        </button>
                    </div>
                </div>
                <h2 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`} dangerouslySetInnerHTML={{ __html: currentStep.prompt || currentStep.question || currentStep.text || "Apply logic to the diagram below:" }} />
            </div>
        </div>

        <div ref={containerRef} className="flex-1 relative min-h-[280px]">
            <VennCanvas 
                l={computeLayout()}
                data={data}
                isDark={isDark}
                isTwoSet={isTwoSet}
                isResolved={isResolved}
                selectedRegions={selectedRegions}
                activeSets={activeSets}
                chips={chips}
                frozenZones={mergedZones}
                isHintVisible={isHintVisible}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={() => draggingRef.current = null}
                currentStep={currentStep}
                REGION_MAP={REGION_MAP}
                evaluateExpr={evaluateExpr}
                canvasSize={canvasSize}
            />

            {/* 📝 IN-CANVAS INPUT OVERLAY (DIAGRAM_FILL) */}
            {currentStep.interaction === 'DIAGRAM_FILL' && (
                <div className="absolute inset-0 pointer-events-none">
                    {(() => {
                        const l = computeLayout();
                        if (!l) return null;
                        const regions = [
                            { id: 'left', x: l.c1.x - (l.isDisjoint ? 0 : l.offset * 0.85), y: l.cy },
                            { id: 'center', x: l.width/2, y: l.cy },
                            { id: 'right', x: l.c2.x + (l.isDisjoint ? 0 : l.offset * 0.85), y: l.cy },
                            { id: 'outside', x: l.width - 60, y: l.height - 60 }
                        ];
                        
                        // Filtering regions based on whether it's two-set or one-set
                        const activeRegions = regions.filter(r => {
                            if (r.id === 'center' || r.id === 'right') return isTwoSet;
                            return true;
                        });

                        return activeRegions.map(loc => {
                            const regionColor = loc.id === 'left' ? l.c1.color : (loc.id === 'right' ? l.c2.color : (loc.id === 'center' ? '#6366f1' : '#94a3b8'));
                            const isActive = activeKbId === loc.id;
                            
                            return (
                                <div 
                                    key={loc.id}
                                    className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: loc.x, top: loc.y }}
                                >
                                    <button 
                                        onClick={() => openKeyboard(loc.id)}
                                        className={`w-14 h-14 rounded-2xl border-2 font-black text-xl flex items-center justify-center transition-all backdrop-blur-md shadow-2xl relative overflow-hidden ${
                                            isActive 
                                            ? 'scale-110 ring-4' 
                                            : 'hover:scale-105'
                                        }`}
                                        style={{ 
                                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                                            borderColor: regionColor,
                                            color: regionColor,
                                            boxShadow: isActive ? `0 0 20px ${regionColor}40` : 'none',
                                            '--ring-color': `${regionColor}30`
                                        }}
                                    >
                                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundColor: regionColor }}></div>
                                        {userAnswers[loc.id] || (
                                            <span className="opacity-40 text-sm font-bold uppercase tracking-widest">
                                                {loc.id === 'center' ? 'Both' : (loc.id === 'outside' ? 'Out' : '?')}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* Legacy float feedback removed in favor of Unified Footer Feedback */}
        </div>

        {/* 3. PREMIUM UNIFIED HUD (Manya Elite Style) */}
        <div className={`p-6 bg-[#0f172a] border-t-2 border-white/5 z-20 transition-all ${kbOpen ? 'pb-8' : 'pb-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]'}`}>
            <AnimatePresence mode="wait">
                {feedback.type ? (
                    /* ELITE FEEDBACK LAYER */
                    <motion.div 
                        key="feedback-bar"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col gap-5"
                    >
                        <div className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-black text-[13px] tracking-[0.2em] uppercase border-2 ${
                            feedback.type === 'success' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                            {feedback.type === 'success' ? (
                                <><Check size={20} strokeWidth={4} /> Magnificent!</>
                            ) : (
                                <><AlertCircle size={20} strokeWidth={4} /> Solution Pending...</>
                            )}
                        </div>

                        <button 
                            onClick={() => {
                                if (feedback.type === 'success') handleInteraction();
                                else setFeedback({ text: '', type: '' });
                            }}
                            className={`w-full h-16 rounded-2xl font-black text-xs tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-xl active:translate-y-1 ${
                                feedback.type === 'success' 
                                ? 'bg-[#58cc02] border-b-[6px] border-[#46a302] text-white hover:bg-[#46a302]' 
                                : 'bg-rose-500 border-b-[6px] border-rose-700 text-white hover:bg-rose-600'
                            }`}
                        >
                            <div className="btn-toy-gloss" />
                            <span className="relative z-10">
                                {feedback.type === 'success' 
                                    ? (stepIdx < data.questions.length - 1 ? 'Next Challenge' : 'Complete Quest') 
                                    : 'Try Again'}
                            </span>
                            <ArrowRight size={18} className="relative z-10" />
                        </button>
                    </motion.div>
                ) : (
                    /* ELITE INTERACTION LAYER */
                    <motion.div 
                        key="interaction-bar"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col gap-4"
                    >
                        {/* 1. SELECTION ROW (for BINARY/CHOICE) */}
                        {(currentStep.interaction === 'BINARY' || currentStep.interaction === 'CHOICE') && (
                            <div className="flex flex-wrap gap-2">
                                {(currentStep.interaction === 'BINARY' ? ['YES', 'NO'] : (currentStep.options || [])).map(opt => {
                                    const isSelected = Object.values(userAnswers).includes(opt);
                                    return (
                                        <button 
                                            key={opt} onClick={() => { setUserAnswers({ main: opt }); audioService.tap(); }}
                                            className={`flex-1 min-w-[120px] h-14 rounded-2xl border-2 font-black text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                                                isSelected 
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-lg' 
                                                : 'bg-white/5 border-white/10 text-slate-400'
                                            }`}
                                        >
                                            <div className="toy-card-gloss" />
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 w-full">
                            {/* 2. INPUT ROW (for Keyboards) */}
                            {(currentStep.interaction !== 'DIAGRAM_FILL' && (['ALGEBRA_SOLVE', 'ALGEBRA_SUBSTITUTE', 'ALGEBRA_EVAL', 'COUNT', 'COUNT_SUM', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET', 'PROBABILITY', 'PROB', 'FRACTION'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType))) && (
                                <div className="flex-1 flex gap-2">
                                    {(currentStep.inputs || [{ region: 'main', label: 'Answer' }]).map(inp => (
                                        <button 
                                            key={inp.region} onClick={() => openKeyboard(inp.region)}
                                            className={`flex-1 h-16 rounded-2xl border-2 font-black text-xl flex items-center justify-center transition-all ${
                                                activeKbId === inp.region ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white shadow-sm'
                                            }`}
                                        >
                                            {userAnswers[inp.region] || <span className="opacity-20 text-sm font-bold uppercase tracking-widest">{inp.label || 'Enter...'}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {(() => {
                                const hasInteraction = selectedRegions.size > 0 || Object.keys(userAnswers).some(k => userAnswers[k]) || (currentStep.interaction === 'DRAG_SORT' && chips.some(c => c.region !== 'storage')) || (currentStep.interaction === 'DRAG_SETS' && Object.keys(activeSets).some(k => activeSets[k] && (activeSets[k].x !== (k === 'a' ? 100 : 300))));
                                return (
                                    <button 
                                        onClick={handleInteraction}
                                        disabled={!hasInteraction}
                                        className={`flex-1 h-16 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden border-b-[6px] ${
                                            hasInteraction 
                                            ? 'bg-indigo-600 text-white border-indigo-900 hover:bg-link active:translate-y-1 active:shadow-none shadow-[0_10px_30px_rgba(79,70,229,0.3)]' 
                                            : 'bg-slate-800 text-slate-500 border-slate-900 pointer-events-none'
                                        }`}
                                    >
                                        <div className="btn-toy-gloss" />
                                        <span className="relative z-10 flex items-center gap-2">Check Progress <Zap size={14} fill="currentColor" /></span>
                                    </button>
                                );
                            })()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Custom Manya Keyboard */}
        <ManyaKeyboard 
          isOpen={kbOpen}
          onInput={handleKbInput}
          onDelete={handleKbDelete}
          onClose={() => setKbOpen(false)}
          onDone={() => setKbOpen(false)}
          value={activeKbId ? userAnswers[activeKbId] : ''}
        />
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default SetTheoryEngine;

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { Lightbulb, AlertCircle, Compass, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Decoupled Resources
import { REGION_MAP, normalize, evaluateExpr, validateInteraction } from './SetTheory/SetTheoryLogic';
import VennCanvas from './SetTheory/VennCanvas';
import ManyaKeyboard from '../../components/engine/ManyaKeyboard';

/**
 * MANYA SET THEORY ENGINE v8.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED ARCHITECTURE: Separates Logic (JS), Renderer (Canvas), and UI (React).
 */

const SetTheoryEngine = ({ data, onComplete, onResult }) => {
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
        if (stepIdx < data.questions.length - 1) { 
            setStepIdx(p => p+1); setUserAnswers({}); setSelectedRegions(new Set());
            setIsResolved(false); setFeedback({text:'', type:''}); return; 
        }
        else { onComplete(); return; }
    }
    
    const { isCorrect, corrected } = validateInteraction({
        currentStep, userAnswers, chips, activeSets, l: computeLayout(), data, isTwoSet, selectedRegions
    });

    if (onResult) onResult({ isCorrect, selectedAnswer: Object.values(userAnswers).join('|'), correctAnswer: corrected, type: 'simulation' });
    
    if (isCorrect) { 
        setIsResolved(true); 
        setFeedback({ text: '🌟 EXCELLENT!', type: 'success' }); 
        audioService.correct(); 
        
        // Persist answers for retain_visuals
        if (Object.keys(userAnswers).length > 0) {
            setSuccessfulAnswers(prev => ({ ...prev, ...userAnswers }));
        }
    } else { 
        setFeedback({ text: 'TRY AGAIN!', type: 'error' }); 
        audioService.wrong(); 
        setTimeout(() => setFeedback(prev => prev.type === 'error' ? {text:'', type:''} : prev), 2000);
    }
  }, [isResolved, stepIdx, data, userAnswers, chips, activeSets, computeLayout, isTwoSet, selectedRegions, onComplete, onResult]);

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
    if (!draggingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (cx - rect.left) * (canvasSize.width / rect.width), py = (cy - rect.top) * (canvasSize.height / rect.height);
    
    if (currentStep.interaction === 'DRAG_SETS') {
        setActiveSets(prev => ({ ...prev, [draggingRef.current.id]: { ...prev[draggingRef.current.id], x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } }));
    } else {
        setChips(prev => prev.map(c => c.id === draggingRef.current.id ? { ...c, x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } : c));
    }
  };

  // --- 🔄 LIFECYCLE: SETUP STEPS ---
  useEffect(() => {
    if (!currentStep) return;
    setIsResolved(false); setFeedback({text:'', type:''}); setIsHintVisible(false);

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
                            {data.topic || "Set Theory"} · {stepIdx + 1}/{data.questions.length}
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

            {/* Float Feedback */}
            <AnimatePresence>
                {feedback.text && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-3 border-2 ${
                            feedback.type === 'success' ? 'bg-[#58cc02] border-[#46a302] text-white' : 'bg-rose-500 border-rose-400 text-white'
                        }`}
                    >
                        {feedback.type === 'success' ? <Zap className="fill-white" /> : <AlertCircle />}
                        <span className="text-xl font-black italic tracking-tight">{feedback.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* HUD Footbar */}
        <div className={`p-4 flex items-center justify-between gap-4 bg-transparent z-20 transition-all ${kbOpen ? 'pb-8' : ''}`}>
            {(currentStep.interaction !== 'DIAGRAM_FILL' && (['ALGEBRA_SOLVE', 'ALGEBRA_SUBSTITUTE', 'ALGEBRA_EVAL', 'COUNT', 'COUNT_SUM', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET', 'PROBABILITY', 'PROB', 'FRACTION'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType))) && (
                <div className="flex-1 flex gap-2">
                    {/* If multiple inputs, show them. If single algebra/count, show one. */}
                    {(currentStep.inputs || [{ region: 'main', label: 'Answer' }]).map(inp => (
                        <button 
                            key={inp.region}
                            onClick={() => openKeyboard(inp.region)}
                            className={`flex-1 h-16 rounded-2xl border-2 font-black text-xl flex items-center justify-center transition-all ${
                                activeKbId === inp.region ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-lg' :
                                (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm')
                            }`}
                        >
                            {userAnswers[inp.region] || <span className="opacity-20 text-sm font-bold uppercase tracking-widest">{inp.label || 'Enter...'}</span>}
                        </button>
                    ))}
                </div>
            )}

            <button 
                onClick={handleInteraction}
                className={`flex-1 h-16 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                    isResolved 
                    ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[6px] border-[#46a302] active:translate-y-1 shadow-lg' 
                    : (isDark ? 'bg-indigo-600 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 shadow-sm') + ' text-slate-500 border-b-[6px] border-slate-200'
                }`}
            >
                {isResolved ? (stepIdx < data.questions.length - 1 ? 'NEXT STEP' : 'COMPLETE') : 'CHECK ANSWER'}
                <Zap size={14} fill="currentColor" />
            </button>
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

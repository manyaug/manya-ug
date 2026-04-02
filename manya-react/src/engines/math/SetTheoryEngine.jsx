import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Lightbulb, CheckCircle2, AlertCircle, Compass, Zap, ArrowRight, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MANYA SET THEORY ENGINE v6.3 (Absolute Zero Stability)
 * -------------------------------------------------------------
 * - FIX: Correctly grades '0' as a valid result (v6.3).
 * - FIX: Universal Geometry for order-independent dragging (v6.2).
 * - TRUTH-FIRST: Derives mathematical reality from data.zones.
 */

const SetTheoryEngine = ({ data, onComplete, onResult }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [userText, setUserText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState(new Set());
  const [chips, setChips] = useState([]);
  const [activeSets, setActiveSets] = useState({ a: null, b: null });
  const [frozenZones, setFrozenZones] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [isResolved, setIsResolved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pulseAlpha, setPulseAlpha] = useState(1.0);

  const canvasRef = useRef(null);
  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  const currentStep = data?.questions?.[stepIdx];
  const isTwoSet = !!(data?.sets?.B && data?.sets?.B?.label !== "");

  // --- 🪄 THEME SYNC ---
  useLayoutEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark');
    };
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // --- 🛠️ HELPERS ---
  const hexAlpha = (hex, alpha) => {
    if (!hex || hex === 'transparent' || !hex.startsWith('#')) return `rgba(0,0,0,0)`;
    return `${hex.substring(0, 7)}${alpha}`; 
  };

  const computeLayout = useCallback(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return null;
    const { width, height } = canvasSize;
    const isMobile = width <= 480;
    
    // DISJOINT DETECTION (v5.8)
    const isDisjoint = (data.topic || "").toLowerCase().includes("disjoint") || 
                      (data.variantTitle || "").toLowerCase().includes("disjoint") ||
                      (data.zones && data.zones.center && data.zones.center.length === 0 && currentStep.interaction === 'DRAG_SORT');

    const r = Math.min(isMobile ? 85 : 120, width * 0.28);
    const offset = isDisjoint ? r * 1.05 : r * 0.55; 
    const cy = currentStep.interaction === 'DRAG_SORT' ? height * 0.42 : height * 0.5;

    return {
      c1: { x: width/2 - offset, y: cy, color: data.sets.A.color || "#16a34a" },
      c2: { x: width/2 + offset, y: cy, color: data.sets.B.color || "#ea580c" },
      r, cx: width/2, cy, width, height, s: window.devicePixelRatio || 2, isMobile, pad: isMobile ? 12 : 20, isDisjoint
    };
  }, [canvasSize, currentStep, data]);

  const normX = (val) => (val / 400) * canvasSize.width;
  const normY = (val) => (val / 400) * canvasSize.height;

  // --- 🎨 RENDER ENGINE ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d'); const l = computeLayout(); if (!l) return;
    const { s, width, height, pad, isMobile, isDisjoint } = l;

    if (canvas.width !== width * s) canvas.width = width * s;
    if (canvas.height !== height * s) canvas.height = height * s;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.scale(s, s);

    const colors = { text: isDark ? "#FFFFFF" : "#1E293B", border: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9" };

    if (currentStep.interaction === 'DRAG_SETS' && activeSets.a) {
        const drawMovable = (obj, label, col) => {
            if (!obj) return;
            ctx.save(); ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI*2);
            const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.r);
            g.addColorStop(0, hexAlpha(col, '00')); g.addColorStop(1, hexAlpha(col, '20')); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = isMobile ? 6 : 8; ctx.shadowBlur = isResolved ? 30 : 15; ctx.shadowColor = isResolved ? "#22c55e" : col;
            ctx.strokeStyle = isResolved ? "#22c55e" : col; ctx.stroke();
            ctx.fillStyle = col; ctx.font = "900 24px sans-serif"; ctx.textAlign="center"; 
            ctx.fillText(label, obj.x, obj.y - obj.r - 20); ctx.restore();
        };
        drawMovable(activeSets.a, activeSets.a.label, activeSets.a.color);
        if (activeSets.b) drawMovable(activeSets.b, activeSets.b.label, activeSets.b.color);
    } else {
        const { c1, c2, r, cy } = l;
        const activeShades = new Set(selectedRegions);
        if (currentStep.targetRegion && currentStep.interaction === 'SHADE_REGION') {
           const map = { 'intersection': ['center'], 'union': ['left','center', 'right'] };
           (map[currentStep.targetRegion] || [currentStep.targetRegion]).forEach(z => activeShades.add(z));
        }
        const drawRegion = (type, col) => {
            ctx.save(); ctx.fillStyle = col; 
            if (type === 'center' && !isDisjoint) {
                ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.clip();
                ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
            } else if (type === 'left') {
                ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.fill();
                if (!isDisjoint) { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill(); }
            } else if (type === 'right') {
                ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
                if (!isDisjoint) { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.fill(); }
            }
            ctx.restore();
        };
        activeShades.forEach(reg => drawRegion(reg, "rgba(251, 191, 36, 0.4)"));
        const drawStatic = (x, y, rad, col) => {
            ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2);
            const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
            g.addColorStop(0, hexAlpha(col, '00')); g.addColorStop(1, hexAlpha(col, '15')); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = isMobile ? 5 : 7; ctx.shadowBlur = 15; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
        };
        drawStatic(c1.x, cy, r, c1.color);
        if (isTwoSet) drawStatic(c2.x, cy, r, c2.color);
        const drawLabel = (x, y, txt, col) => {
            ctx.save(); ctx.font = "900 24px sans-serif"; ctx.fillStyle = col; ctx.textAlign="center"; ctx.fillText(txt, x, y-r-25); ctx.restore();
        };
        drawLabel(c1.x, cy, data.sets.A.label, c1.color);
        if (isTwoSet) drawLabel(c2.x, cy, data.sets.B.label, c2.color);
        const renderMembers = (src) => {
            if (!src) return;
            ['left','center','right','outside'].forEach(reg => {
                const arr = src[reg]; if (!arr) return;
                arr.forEach((v, i) => {
                    let lx = width - 50, ly = height - 50; 
                    if (reg === 'left') { lx = c1.x; ly = cy + (i - (arr.length-1)/2)*40; }
                    else if (reg === 'right') { lx = c2.x; ly = cy + (i - (arr.length-1)/2)*40; }
                    else if (reg === 'center' && !isDisjoint) { lx = width/2; ly = cy + (i - (arr.length-1)/2)*40; }
                    ctx.save(); ctx.beginPath(); ctx.arc(lx, ly-8, 20, 0, Math.PI*2);
                    ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"; ctx.fill();
                    ctx.fillStyle = colors.text; ctx.font = "900 24px sans-serif"; ctx.textAlign="center"; ctx.fillText(v, lx, ly); ctx.restore();
                });
            });
        };
        if (currentStep.retain_visuals && frozenZones) renderMembers(frozenZones);
        else if (currentStep.interaction !== 'DRAG_SORT') renderMembers(data.zones);
    }
    ctx.strokeStyle = colors.border; ctx.lineWidth = 2; ctx.strokeRect(pad, pad, width-pad*2, height-pad*2);
    ctx.fillStyle = colors.text; ctx.font = "900 18px sans-serif"; ctx.fillText("\u03BE", pad+12, pad+28);
    chips.forEach(c => {
        ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"; ctx.shadowBlur=10; ctx.shadowColor="rgba(0,0,0,0.2)"; ctx.fill();
        ctx.strokeStyle = isResolved ? "#16a34a" : (isDark?"#4b5563":"#cbd5e1"); ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=colors.text; ctx.font="900 22px sans-serif"; ctx.textAlign="center"; ctx.fillText(c.val, c.x, c.y + 8); ctx.restore();
    });
    ctx.restore();
  }, [computeLayout, canvasSize, isDark, selectedRegions, currentStep, chips, frozenZones, isTwoSet, pulseAlpha, activeSets, isResolved]);

  // --- 🧠 LOGIC ENGINE (v6.3 Absolute Zero Stability) ---
  const validate = useCallback(() => {
    let isCorrect = false; let corrected = "";
    const normalize = (t) => {
        // v6.3: Strictly handle '0' (prevents stripping zero as falsy empty)
        const clean = String(t !== undefined && t !== null ? t : "").toLowerCase().trim().replace(/[\{\}\s]/g, '');
        return clean.split(',').filter(x => x !== "").sort().join(',');
    };

    if (currentStep.interaction === 'DRAG_SETS' && activeSets.a && activeSets.b) {
        const d = Math.hypot(activeSets.a.x - activeSets.b.x, activeSets.a.y - activeSets.b.y);
        const subIdx = currentStep.items.findIndex(it => it.target);
        const subject = subIdx === 0 ? activeSets.a : activeSets.b;
        const other = subIdx === 0 ? activeSets.b : activeSets.a;
        const target = currentStep.items[subIdx]?.target || "";
        const tol = 12; // Radius tolerance

        if (target === 'inside_F' || target === 'subset') {
            isCorrect = d + subject.r <= other.r + tol;
        } else if (target === 'disjoint') {
            isCorrect = d > (subject.r + other.r) - tol;
        } else if (target === 'overlap') {
            isCorrect = d < (subject.r + other.r) - tol && d > Math.abs(subject.r - other.r) + tol;
        }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const l = computeLayout(); if (!l) return { isCorrect: false };
        isCorrect = chips.every(c => {
            let actual = "outside";
            const dist1 = Math.hypot(c.x - l.c1.x, c.y - l.cy), dist2 = Math.hypot(c.x - l.c2.x, c.y - l.cy);
            if (!l.isDisjoint && dist1 < l.r && dist2 < l.r) actual = "center";
            else if (dist1 < l.r) actual = "left";
            else if (dist2 < l.r) actual = "right";
            return actual === c.target;
        });
    } else {
        const region = currentStep.targetRegion || 'outside';
        const mapped = { 
            'intersection': ['center'], 'union': ['left','center', 'right'], 
            'left_only': ['left'], 'right_only': ['right'], 
            'x_exclusive': ['left','right'], 'complement_left': ['right', 'outside'],
            'complement_right': ['left', 'outside'], 'universal': ['left','center','right','outside']
        };
        const targets = mapped[region] || (Array.isArray(region) ? region : [region]);
        const truthElements = targets.flatMap(t => data.zones[t] || []);
        const expectedVal = currentStep.expected || currentStep.expected_x;
        
        // TRUTH CHECK: DERIVE FROM ZONES FIRST (v6.3 Zero-Safe)
        if (truthElements.length > 0 || (region === 'intersection' && data.zones?.center?.length === 0)) {
            const isCountQ = currentStep.type === 'COUNT' || currentStep.engineType?.includes('COUNT');
            const truthCount = truthElements.length;
            const truthList = truthElements.join(',');
            
            corrected = isCountQ ? String(truthCount) : truthElements.join(', ');
            isCorrect = normalize(userText) === (isCountQ ? normalize(truthCount) : normalize(truthList));
        } else if (expectedVal !== undefined) {
            corrected = String(expectedVal);
            isCorrect = normalize(userText) === normalize(expectedVal);
        }
    }
    return { isCorrect, corrected };
  }, [currentStep, userText, chips, activeSets, computeLayout, data.zones]);

  const handleInteraction = useCallback(() => {
    if (isResolved) { 
        if (stepIdx < data.questions.length - 1) {
            setStepIdx(p => p+1); setUserText(""); setIsResolved(false); setFeedback({text:'', type:''});
            return;
        } else { onComplete(); return; }
    }
    const { isCorrect, corrected } = validate();
    if (onResult) onResult({ isCorrect, selectedAnswer: userText || 'Interaction', correctAnswer: corrected, type: 'simulation' });
    if (isCorrect) { setIsResolved(true); setFeedback({ text: '🌟 EXCELLENT!', type: 'success' }); window.ManyaAudio?.correct(); }
    else { setFeedback({ text: 'TRY AGAIN!', type: 'error' }); window.ManyaAudio?.wrong(); }
  }, [isResolved, stepIdx, data, validate, onComplete, onResult, userText]);

  // --- 🪄 EFFECTS ---
  useEffect(() => {
    const observer = new ResizeObserver(entries => { 
        if (entries[0]) setCanvasSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); 
    }); 
    if (canvasRef.current) observer.observe(canvasRef.current); 
    return () => observer.disconnect(); 
  }, []);

  useEffect(() => {
    if (canvasSize.width === 0 || !currentStep) return;
    if (currentStep.interaction === 'DRAG_SORT') {
        setChips((currentStep.items || []).map((it, i) => ({ ...it, id: `chip-${i}`, x: normX(50 + i*60), y: normY(350) })));
    } else if (currentStep.interaction === 'DRAG_SETS') {
        const sA = currentStep.items[0], sB = currentStep.items[1];
        if (!sA || !sB) return;
        setActiveSets({
            a: { x: normX(sA.x || 100), y: normY(sA.y || 200), r: sA.radius || 60, label: sA.val, color: sA.color || "#16a34a", locked: sA.locked, id: 'a' },
            b: { x: normX(sB.x || 300), y: normY(sB.y || 200), r: sB.radius || 60, label: sB.val, color: sB.color || "#ea580c", locked: sB.locked, id: 'b' }
        });
    } else { setChips([]); setActiveSets({a:null, b:null}); }
  }, [stepIdx, canvasSize, currentStep]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (cx - rect.left) * (canvasSize.width / rect.width), py = (cy - rect.top) * (canvasSize.height / rect.height);
    if (currentStep.interaction === 'DRAG_SETS') {
        const hit = [activeSets.b, activeSets.a].find(s => s && !s.locked && Math.hypot(px - s.x, py - s.y) < s.r);
        if (hit) { draggingRef.current = hit; dragOffsetRef.current = { x: px - hit.x, y: py - hit.y }; }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const chip = [...chips].reverse().find(c => Math.hypot(c.x - px, c.y - py) < 22);
        if (chip) { draggingRef.current = chip; dragOffsetRef.current = { x: px - chip.x, y: py - chip.y }; }
    }
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = Math.max(25, Math.min(canvasSize.width-25, (cx - rect.left) * (canvasSize.width / rect.width)));
    const py = Math.max(25, Math.min(canvasSize.height-25, (cy - rect.top) * (canvasSize.height / rect.height)));
    const dragTarget = draggingRef.current;
    if (currentStep.interaction === 'DRAG_SETS') {
        const dragId = dragTarget.id;
        setActiveSets(prev => {
            if (!prev[dragId]) return prev;
            return { ...prev, [dragId]: { ...prev[dragId], x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } };
        });
    } else {
        const dragId = dragTarget.id;
        setChips(prev => prev.map(c => c.id === dragId ? { ...c, x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } : c));
    }
  };

  if (!currentStep || !data) return null; // Safety guard

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center p-0 sm:p-6 h-full w-full dark:bg-[#0F172A] bg-[#FDFBF7] font-jakarta transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl dark:bg-[#1E293B] dark:border-white/10 bg-white border-slate-100 rounded-none sm:rounded-[2.5rem] shadow-2xl border p-4 sm:p-8 relative overflow-hidden flex flex-col">
        <div className="flex gap-2 justify-center mb-6 sm:mb-8">{data.questions.map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === stepIdx ? 'bg-amber-500 w-6' : (i < stepIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700')}`} />))}</div>
        <div className="flex items-center gap-2 mb-4"><Zap size={14} className="text-violet-500" /><div className="text-violet-500 font-black text-[10px] tracking-widest uppercase opacity-80">{data.topic} \u2022 {stepIdx + 1} / {data.questions.length}</div></div>
        <h2 className="text-xl sm:text-2xl font-bold dark:text-white text-slate-900 mb-6 leading-snug" dangerouslySetInnerHTML={{ __html: currentStep.prompt }} />
        <div className="relative w-full aspect-square sm:aspect-video rounded-3xl overflow-hidden mb-6 bg-slate-50 dark:bg-slate-900 border dark:border-white/5 border-slate-100 shadow-inner">
            <canvas ref={canvasRef} className="w-full h-full block touch-none" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={() => draggingRef.current = null} onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={() => draggingRef.current = null} />
            {feedback.text && <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-3 backdrop-blur-md ${feedback.type==='success'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-500':'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>{feedback.text}</div>}
        </div>
        {!isResolved && currentStep.interaction === 'BINARY' && (<div className="grid grid-cols-2 gap-4">{['Yes', 'No'].map(v => <button key={v} className={`h-16 rounded-2xl font-black text-xl border-2 transition-all ${userText===v?'bg-violet-600 text-white border-violet-600':'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-500'}`} onClick={()=>setUserText(v)}>{v}</button>)}</div>)}
        {!isResolved && !['BINARY','DRAG_SETS','DRAG_SORT'].includes(currentStep.interaction) && (<input type="text" className="w-full h-16 rounded-2xl text-center font-black text-2xl outline-none focus:ring-4 ring-violet-500/20 border-2 transition-all dark:bg-slate-800 dark:border-white/5 dark:text-white bg-slate-50 border-slate-100 text-slate-900" placeholder="Answer..." value={userText} onChange={e => setUserText(e.target.value)} />)}
        <button disabled={!isResolved && !userText && !['DRAG_SETS','DRAG_SORT'].includes(currentStep.interaction)} className={`w-full mt-6 h-14 sm:h-16 rounded-[1.25rem] font-black text-xs sm:text-sm tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${isResolved ? 'bg-emerald-500 text-white shadow-emerald-500/20 active:scale-95' : 'bg-violet-600 text-white shadow-violet-600/20 active:scale-95'}`} onClick={handleInteraction}>{isResolved ? (stepIdx === data.questions.length - 1 ? 'FINISH QUEST' : 'NEXT STEP') : 'CHECK ANSWER'}</button>
      </motion.div>
    </div>
  );
};
export default SetTheoryEngine;

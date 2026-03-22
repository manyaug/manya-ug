import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * MANYA SET THEORY ENGINE (React v1.6)
 * ------------------------------------
 * High-performance Venn Diagram rendering with Algebraic support.
 * Fixed: Definitive theme sync (ancestry-aware) and Algebraic assessment logic.
 */

const SetTheoryEngine = ({ data, onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedRegions, setSelectedRegions] = useState(new Set());
  const [userInputs, setUserInputs] = useState({});
  const [chips, setChips] = useState([]);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [isResolved, setIsResolved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const currentQuestion = data.questions[stepIdx];

  // --- 1. RENDERING HELPERS ---
  const calculateLayout = useCallback(() => {
    if (canvasSize.width === 0) return null;
    const { width, height } = canvasSize;
    const cx = width / 2;
    const cy = height * 0.42; 
    const isSingleSet = !data.sets.B || data.sets.B.label === "";
    const r = Math.min(width * 0.22, height * 0.3);
    const offset = isSingleSet ? 0 : r * 0.72;

    return {
      c1: { x: cx - offset, y: cy, r, color: data.sets.A.color || "#7C3AED" },
      c2: { x: cx + offset, y: cy, r, color: data.sets.B.color || "#DB2777" },
      center: { x: cx, y: cy }, r,
      s: window.devicePixelRatio || 2,
      isSingleSet, width, height, pad: 15, cy
    };
  }, [canvasSize, data]);

  const drawAtomicRegion = useCallback((tCtx, region, layout) => {
    const { c1, c2, r, width, height, pad } = layout;
    tCtx.save();
    tCtx.clearRect(0, 0, width, height);
    const colors = {
      'left': 'rgba(124, 58, 237, 0.25)',
      'right': 'rgba(219, 39, 119, 0.25)',
      'center': 'rgba(251, 191, 36, 0.4)',
      'outside': 'rgba(148, 163, 184, 0.2)'
    };
    tCtx.fillStyle = colors[region];
    if (region === 'center') {
      tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.clip();
      tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI * 2); tCtx.fill();
    } else if (region === 'left') {
      tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fill();
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI * 2); tCtx.fill();
    } else if (region === 'right') {
      tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI * 2); tCtx.fill();
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fill();
    } else if (region === 'outside') {
      tCtx.beginPath(); tCtx.rect(pad, pad, width - pad * 2, height - pad * 2); tCtx.fill();
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fill();
      tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI * 2); tCtx.fill();
    }
    tCtx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d');
    const layout = calculateLayout();
    if (!layout) return;
    const { c1, c2, r, s, isSingleSet, width, height, pad, cy } = layout;

    if (canvas.width !== width * s) canvas.width = width * s;
    if (canvas.height !== height * s) canvas.height = height * s;

    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    tempCanvasRef.current.width = width;
    tempCanvasRef.current.height = height;
    const tCtx = tempCanvasRef.current.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(s, s);

    const colors = {
      text: isDark ? "#FFFFFF" : "#1E293B",
      dimText: isDark ? "#94A3B8" : "#64748B",
      border: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9"
    };

    const finalRegions = new Set(selectedRegions);
    if (currentQuestion.targetRegion) {
       const map = { 
           'intersection': ['center'], 'union': ['left','center','right'], 'left_only': ['left'], 'right_only': ['right'],
           'outside': ['outside'], 'complement_left': ['right', 'outside'], 'complement_right': ['left', 'outside'], 'symmetric_difference': ['left', 'right']
       };
       (map[currentQuestion.targetRegion] || [currentQuestion.targetRegion]).forEach(z => finalRegions.add(z));
    }
    finalRegions.forEach(reg => {
      drawAtomicRegion(tCtx, reg, layout);
      ctx.drawImage(tempCanvasRef.current, 0, 0);
    });

    if (currentQuestion.interaction === 'DRAG_SETS') {
      chips.forEach(c => {
         ctx.lineWidth = 5; ctx.strokeStyle = c.color; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.stroke();
         ctx.fillStyle = c.color; ctx.font = `900 22px sans-serif`; ctx.textAlign = "center"; ctx.fillText(c.val, c.x, c.y + 7);
      });
      ctx.restore();
      return;
    }

    ctx.strokeStyle = colors.border; ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
    ctx.fillStyle = colors.text; ctx.font = `900 16px sans-serif`; ctx.textAlign = "left";
    const total = currentQuestion.equation_target;
    ctx.fillText(total ? `ξ=${total}` : "ξ", pad + 10, pad + 25);

    ctx.lineWidth = 4;
    ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI * 2); ctx.stroke();
    if (!isSingleSet) {
      ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = c1.color; ctx.font = `900 15px sans-serif`; ctx.textAlign = "center";
    ctx.fillText(data.sets.A.label, c1.x, c1.y - r - 12);
    if (!isSingleSet) {
      ctx.fillStyle = c2.color;
      ctx.fillText(data.sets.B.label, c2.x, c2.y - r - 12);
    }

    const drawZoneData = (arr, x, y) => { 
        if (!arr) return;
        ctx.fillStyle = colors.text; ctx.font = `bold 16px sans-serif`;
        arr.forEach((v, i) => { 
            const off = (i - (arr.length - 1) / 2) * 24; 
            ctx.fillText(v, x, y + off); 
        }); 
    };

    if (chips.filter(c => !c.isSet).length === 0) {
      drawZoneData(data.zones?.left, c1.x - r * 0.4, cy);
      drawZoneData(data.zones?.right, c2.x + r * 0.4, cy);
      drawZoneData(data.zones?.center, layout.center.x, cy);
      drawZoneData(data.zones?.outside, width - pad - 45, height - pad - 45);
    }

    chips.forEach(c => {
      if (c.isSet) return;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.isPlaced ? (isDark ? '#064e3b' : '#dcfce7') : (isDark ? '#1e293b' : '#FCE7F3'); ctx.fill();
      ctx.strokeStyle = c.isPlaced ? '#16a34a' : (isDark ? '#4b5563' : '#DB2777'); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'; ctx.font = `bold 14px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(c.val, c.x, c.y + 6);
    });

    ctx.restore();
  }, [calculateLayout, drawAtomicRegion, data, currentQuestion, selectedRegions, chips, isDark, canvasSize]);

  // --- 2. INPUT & ALGEBRA HELPERS ---
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - rect.left) * (rect.width > 0 ? canvasSize.width / rect.width : 1),
      y: (cy - rect.top) * (rect.height > 0 ? canvasSize.height / rect.height : 1)
    };
  }, [canvasSize]);

  const evaluateAlgebra = useCallback((expr, x) => {
    if (!expr) return 0;
    // Simple parser for "3h+1", "h-4", "2h", "h+2"
    let clean = String(expr).replace(/\s/g, '').toLowerCase();
    // Replace variable (h or x)
    const varName = clean.match(/[a-z]/)?.[0] || 'h';
    let val = clean.replace(new RegExp(varName, 'g'), `*${x}`);
    if (val.startsWith('*')) val = val.substring(1);
    val = val.replace(/\+\*/g, '+').replace(/\-\*/g, '-');
    // Basic calculation
    try {
        // eslint-disable-next-line no-eval
        return eval(val);
    } catch (e) { return 0; }
  }, []);

  const handleInteraction = useCallback(() => {
    if (isResolved) { if (stepIdx < data.questions.length - 1) setStepIdx(p => p + 1); else onComplete(); return; }
    let isCorrect = false;
    const q = currentQuestion;
    const normalize = (t) => String(t).toLowerCase().replace(/\s/g, '');
    const userAns = userInputs['text'] || "";

    // 1. Sorting Validation
    if (chips.length > 0 && q.interaction !== 'DRAG_SETS') {
      const layout = calculateLayout();
      if (!layout) return;
      isCorrect = chips.every(c => {
        if (c.isSet) return true;
        const target = c.target || c.targetRegion;
        if (!target) return true;
        const d1 = Math.hypot(c.x - layout.c1.x, c.y - layout.cy);
        const d2 = Math.hypot(c.x - layout.c2.x, c.y - layout.cy);
        let actual = 'outside';
        if (d1 < layout.r && d2 < layout.r) actual = 'center';
        else if (d1 < layout.r) actual = 'left';
        else if (d2 < layout.r) actual = 'right';
        const map = { 'left':'left', 'right':'right', 'center':'center', 'intersection':'center', 'left_only':'left', 'right_only':'right' };
        return map[actual] === map[target];
      });
    } 
    // 2. Algebraic Validation
    else if (q.type === 'ALGEBRA_SOLVE') {
        isCorrect = parseInt(userAns) === q.expected_x;
    }
    else if (q.type === 'COUNT_SUM' || q.type === 'ALGEBRA_SUBSTITUTE') {
        const x = q.x_val;
        const getRegionExprs = (reg) => {
            const map = { 'intersection': 'center', 'left_only': 'left', 'right_only': 'right', 'outside': 'outside', 'union': ['left','center','right'], 'right_total': ['center','right'], 'left_total': ['center','left'], 'universal_only': 'none' };
            const key = map[reg] || reg;
            if (reg === 'universal_only') return [q.expression];
            return Array.isArray(key) ? key.flatMap(k => data.zones[k] || []) : (data.zones[key] || []);
        };
        const exprs = getRegionExprs(q.targetRegion);
        const total = exprs.reduce((acc, exp) => acc + evaluateAlgebra(exp, x), 0);
        isCorrect = parseInt(userAns) === total;
    }
    // 3. Standard Venn Validation
    else if (q.interaction === 'DRAG_SETS') {
      isCorrect = chips.every(c => {
        if (!c.target) return true;
        const other = chips.find(o => o.id !== c.id);
        if (!other) return true;
        const dist = Math.hypot(c.x - other.x, c.y - other.y);
        if (c.target === 'overlap') return dist < (c.radius + other.radius) * 0.85;
        if (c.target === 'disjoint') return dist > (c.radius + other.radius);
        if (c.target.startsWith('inside_')) {
          const outer = chips.find(o => o.val === c.target.split('_')[1]);
          return outer ? Math.hypot(c.x - outer.x, c.y - outer.y) < (outer.radius - c.radius) : true;
        }
        return true;
      });
    } else if (q.interaction === 'CLICK_SUM' || q.interaction === 'SHADE_REGION') {
      const user = Array.from(selectedRegions).sort().join(',');
      const val = { 'intersection': 'center', 'union': 'center,left,right', 'left_only': 'left', 'right_only': 'right', 'complement_left': 'outside,right', 'complement_right': 'left,outside', 'symmetric_difference': 'left,right' }[q.targetRegion] || "";
      isCorrect = user === val.split(',').sort().join(',');
    } else if (q.interaction === 'DIAGRAM_FILL') {
      isCorrect = q.inputs.every(def => normalize(userInputs[def.region] || "") === normalize(def.expected));
    } else {
      const getRegionData = (reg) => {
          const map = { 'intersection': 'center', 'left_only': 'left', 'right_only': 'right', 'outside': 'outside', 'union': ['left','center','right'] };
          const key = map[reg] || reg;
          return Array.isArray(key) ? key.flatMap(k => data.zones[k] || []) : (data.zones[key] || []);
      };
      if (q.type === 'COUNT') isCorrect = parseInt(userAns) === getRegionData(q.targetRegion).length;
      else if (q.type === 'LIST') {
          const actual = getRegionData(q.targetRegion).map(normalize);
          const user = userAns.split(',').map(normalize).filter(Boolean);
          isCorrect = actual.length === user.length && actual.every(v => user.includes(v));
      }
      else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(userAns) === Math.pow(2, getRegionData(q.targetRegion || 'center').length);
      else if (q.type === 'PROPER_SUBSET_COUNT') isCorrect = parseInt(userAns) === (Math.pow(2, getRegionData(q.targetRegion || 'center').length) - 1);
      else isCorrect = normalize(userAns) === normalize(q.expected || "");
    }

    if (isCorrect) { setFeedback({ text: '🌟 EXCELLENT!', type: 'success' }); setIsResolved(true); } 
    else setFeedback({ text: 'Try again!', type: 'error' });
  }, [isResolved, stepIdx, chips, selectedRegions, userInputs, data, onComplete, calculateLayout, evaluateAlgebra, currentQuestion]);

  // --- 3. LIFECYCLE ---
  useLayoutEffect(() => {
    const checkTheme = () => {
      // 1. Ancestry Check (Robust)
      const hasDarkAncestor = !!containerRef.current?.closest('.dark');
      // 2. Computed Style Check (Fallback)
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const isActuallyDark = hasDarkAncestor || bodyBg === 'rgb(15, 23, 42)' || bodyBg === 'rgb(2, 6, 23)';
      setIsDark(isActuallyDark);
    };
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) setCanvasSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedRegions(new Set()); setUserInputs({}); setFeedback({ text: '', type: '' }); setIsResolved(false);
    if (currentQuestion.items) {
      setChips(currentQuestion.items.map((it, i) => ({ ...it, id: `chip-${i}`, x: 0, y: 0, radius: 24, isPlaced: false })));
    } else if (currentQuestion.interaction === 'DRAG_SETS') {
      setChips([
        { id: 'set-a', val: data.sets.A.label, color: data.sets.A.color, x: 100, y: 150, radius: 70, isSet: true },
        { id: 'set-b', val: data.sets.B.label, color: data.sets.B.color, x: 300, y: 150, radius: 70, isSet: true }
      ]);
    } else setChips([]);
  }, [stepIdx, data, currentQuestion]);

  useEffect(() => {
    if (chips.length > 0 && chips[0].x === 0 && canvasSize.width > 0) {
      const l = calculateLayout(); if (!l) return;
      const gap = 55; const startX = (l.width - ((chips.length - 1) * gap)) / 2;
      setChips(prev => prev.map((c, i) => ({ ...c, x: startX + i * gap, y: l.height - 40, isPlaced: false })));
    }
  }, [chips, calculateLayout, canvasSize]);

  useEffect(() => { draw(); }, [draw]);

  // --- 4. EVENT HANDLERS ---
  const onMouseDown = (e) => {
    const p = getPos(e); const q = currentQuestion;
    if (q.interaction === 'CLICK_SUM' || q.interaction === 'SHADE_REGION') {
      const l = calculateLayout(); if (!l) return;
      const d1 = Math.hypot(p.x - l.c1.x, p.y - l.cy); const d2 = Math.hypot(p.x - l.c2.x, p.y - l.cy);
      let reg = (d1 < l.r && d2 < l.r) ? 'center' : (d1 < l.r ? 'left' : (d2 < l.r ? 'right' : 'outside'));
      setSelectedRegions(prev => { const n = new Set(prev); if (n.has(reg)) n.delete(reg); else n.add(reg); return n; });
      return;
    }
    const chip = [...chips].reverse().find(c => !c.locked && Math.hypot(c.x - p.x, c.y - p.y) < c.radius);
    if (chip) { draggingRef.current = chip; dragOffsetRef.current = { x: p.x - chip.x, y: p.y - chip.y }; }
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return; const p = getPos(e);
    setChips(prev => prev.map(c => {
      if (c.id === draggingRef.current.id) {
        const layout = calculateLayout(); let isPlaced = false;
        if (layout) {
            const dx1 = p.x - layout.c1.x, dx2 = p.x - layout.c2.x, dy = p.y - layout.cy;
            isPlaced = Math.hypot(dx1, dy) < layout.r || Math.hypot(dx2, dy) < layout.r;
        }
        return { ...c, x: p.x - dragOffsetRef.current.x, y: p.y - dragOffsetRef.current.y, isPlaced };
      }
      return c;
    }));
  };

  const onMouseUp = () => draggingRef.current = null;

  const getInputStyles = (region) => {
    const l = calculateLayout(); if (!l) return { display: 'none' };
    let x = l.center.x, y = l.cy;
    if (region === 'left') x = l.c1.x - l.r * 0.45;
    if (region === 'right') x = l.c2.x + l.r * 0.45;
    if (region === 'outside') { x = l.width - 60; y = l.height - 60; }
    return { left: `${x}px`, top: `${y}px` };
  };

  const themeColors = isDark ? { bg: 'bg-slate-950', card: 'bg-slate-900', border: 'border-white/10', text: 'text-white' } : { bg: 'bg-stone-50', card: 'bg-white', border: 'border-slate-100', text: 'text-slate-900' };

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${themeColors.bg} ${themeColors.text} font-jakarta overflow-hidden transition-colors duration-300`}>
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        <div className={`w-full max-w-[420px] h-full max-h-[660px] ${themeColors.card} rounded-[2.5rem] shadow-2xl border-[2.5px] ${themeColors.border} flex flex-col overflow-hidden relative`}>
          <div className={`flex-1 relative touch-none border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
            <button className={`absolute top-4 right-4 z-50 ${isDark ? 'bg-black/40 text-slate-300' : 'bg-white/80 text-slate-500'} backdrop-blur-md border ${isDark ? 'border-white/10' : 'border-slate-100'} px-3 py-1.5 rounded-2xl flex items-center gap-2`} onClick={() => setFeedback({ text: `💡 ${currentQuestion.hint || 'Examine the diagram.'}`, type: 'hint' })}>
              <Lightbulb size={12} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Hint</span>
            </button>
            <canvas ref={canvasRef} className="w-full h-full" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp} />
            {currentQuestion.interaction === 'DIAGRAM_FILL' && currentQuestion.inputs.map(input => (
              <input key={input.region} className={`venn-floating-input ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'} ${isResolved ? 'correct' : ''}`} style={getInputStyles(input.region)} placeholder="?" value={userInputs[input.region] || ''} onChange={(e) => setUserInputs({ ...userInputs, [input.region]: e.target.value })} />
            ))}
          </div>
          <div className={`p-6 ${isDark ? 'bg-black/20' : 'bg-slate-50/50'} flex flex-col gap-4`}>
            <div className={`text-base font-black text-center leading-tight`} dangerouslySetInnerHTML={{ __html: currentQuestion.prompt }} />
            <div className="flex flex-col gap-3">
              {currentQuestion.interaction === 'TEXT_ENTRY' || (!currentQuestion.interaction && !currentQuestion.options) ? (
                <input type="text" className={`math-entry-box ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`} placeholder="Type answer..." value={userInputs['text'] || ''} onChange={(e) => setUserInputs({ ...userInputs, ['text']: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleInteraction()} />
              ) : currentQuestion.options && (
                <div className="grid grid-cols-2 gap-2">
                   {currentQuestion.options.map((opt, i) => (
                      <button key={i} className={`p-3 rounded-2xl text-[13px] font-black border-2 transition-all ${userInputs['text'] === opt ? 'bg-violet-500 border-violet-500 text-white' : (isDark ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-white border-slate-100 text-slate-500')}`} onClick={() => setUserInputs({ ...userInputs, ['text']: opt })}>{opt}</button>
                   ))}
                </div>
              )}
              <div className={`h-6 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'text-green-500' : 'text-rose-500'} ${feedback.type === 'hint' ? 'text-amber-500' : ''}`}>
                {feedback.type === 'success' && <CheckCircle2 size={14} />} {feedback.type === 'error' && <AlertCircle size={14} />} {feedback.text}
              </div>
              <button className={`manya-btn-pro w-full h-14 ${isResolved ? 'bg-green-500' : 'bg-violet-600'}`} onClick={handleInteraction}>{isResolved ? 'CONTINUE →' : 'CHECK ANSWER'}</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .venn-floating-input { position: absolute; transform: translate(-50%, -50%); width: 52px; height: 36px; border-radius: 12px; text-align: center; font-weight: 900; font-size: 16px; outline: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.2s; }
        .venn-floating-input:focus { border-color: #7C3AED; }
        .venn-floating-input.correct { border-color: #22c55e !important; background: #f0fdf4 !important; color: #16a34a !important; pointer-events: none; }
        .math-entry-box { height: 54px; border-radius: 20px; text-align: center; font-weight: 900; font-size: 1.4rem; outline: none; transition: all 0.2s; border-width: 3px; }
        .math-entry-box:focus { border-color: #7C3AED; }
        .manya-btn-pro { border: none; border-radius: 18px; color: white; font-weight: 900; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; box-shadow: 0 6px 0 rgba(0,0,0,0.15); }
        .manya-btn-pro:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

export default SetTheoryEngine;

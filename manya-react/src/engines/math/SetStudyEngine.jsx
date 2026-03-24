import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Orbit } from 'lucide-react';

/**
 * SET STUDY ENGINE (React v6.0 - Definitive Curation)
 * --------------------------------------------------
 * - Optimized 60FPS tick-loop (Stable).
 * - Manya Particles Background System.
 * - NEW: EQUAL_SETS & DISJOINT_SETS (1:1 Legacy).
 * - Redesigned Hub (No-Overlap Header).
 * - Fixed Proper Subset Logic in Power Sets.
 */

const SetStudyEngine = ({ data, onComplete, onResult }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [visitedIndices, setVisitedIndices] = useState(new Set([0]));

  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const tickRef = useRef(0);
  const requestRef = useRef();
  const particlesRef = useRef([]);

  const slides = useMemo(() => data.slides || [], [data]);
  const currentSlide = slides[stepIdx];
  const isLast = stepIdx === slides.length - 1;
  const allSeen = visitedIndices.size === slides.length;

  const initParticles = (width, height) => {
    particlesRef.current = Array.from({ length: 15 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 8 + 2,
      opacity: Math.random() * 0.2 + 0.1
    }));
  };

  const drawParticles = (ctx, width, height, s) => {
    ctx.save();
    particlesRef.current.forEach(p => {
      p.x += p.vx * s; p.y += p.vy * s;
      if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? `rgba(124, 58, 237, ${p.opacity})` : `rgba(219, 39, 119, ${p.opacity * 0.4})`;
      ctx.fill();
    });
    ctx.restore();
  };

  const draw = (ctx, tCtx, width, height, s) => {
    if (!ctx || !currentSlide) return;
    const tick = tickRef.current;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (isDark) { grad.addColorStop(0, "#0F172A"); grad.addColorStop(1, "#0B0E14"); }
    else { grad.addColorStop(0, "#FFFAF5"); grad.addColorStop(1, "#F8F9FA"); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

    drawParticles(ctx, width, height, s);
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
    ctx.lineWidth = 1 * s; ctx.beginPath();
    const gs = 50 * s;
    for (let x = 0; x < width; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += gs) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    const cx = width / 2; const cy = height / 2 + (20 * s); // Push everything down slightly
    const slide = currentSlide;
    const rBase = Math.min(width, height) * 0.32;

    // 1. FINITE BASKET
    if (slide.visualType === 'FINITE_BASKET') {
      const items = slide.visualData || [];
      const pulse = Math.sin(tick * 0.04) * 4 * s;
      ctx.save();
      ctx.shadowBlur = 40 * s; ctx.shadowColor = isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)";
      ctx.beginPath(); ctx.ellipse(cx, cy, rBase + pulse, (rBase + pulse) * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#1e1b4b" : "#f5f3ff"; ctx.fill();
      ctx.strokeStyle = "#7C3AED"; ctx.lineWidth = 5 * s; ctx.stroke();
      ctx.restore();
      items.forEach((it, i) => {
        const ang = (i / items.length) * Math.PI * 2 + (tick * 0.005);
        const dist = rBase * 0.5;
        const ix = cx + Math.cos(ang) * dist; const iy = cy + Math.sin(ang) * dist * 0.75;
        const p = Math.min(1, Math.max(0, (tick - i * 10) / 40));
        const sz = (p === 1 ? 1 : (1 - Math.pow(1 - p, 3)) * 1.15) * (rBase * 0.25);
        if (sz > 0) {
          ctx.beginPath(); ctx.arc(ix, iy, sz, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#4c1d95" : "#ede9fe"; ctx.fill();
          ctx.strokeStyle = "#7e22ce"; ctx.lineWidth = 2 * s; ctx.stroke();
          ctx.fillStyle = isDark ? "#fff" : "#581c87"; ctx.font = `900 ${sz * 0.85}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(it, ix, iy);
        }
      });
      if (slide.showCount && tick > 60) {
        ctx.fillStyle = "#DB2777"; ctx.font = `900 ${36 * s}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(`n(Set) = ${items.length}`, cx, cy + rBase * 1.05);
      }
    }

    // 2. INFINITE ROAD
    else if (slide.visualType === 'INFINITE_ROAD') {
      const speed = 2 * s; const offset = (tick * speed) % (150 * s);
      ctx.beginPath(); ctx.moveTo(cx - 30 * s, cy - 80 * s); ctx.lineTo(cx + 30 * s, cy - 80 * s);
      ctx.lineTo(width + 200 * s, height); ctx.lineTo(-200 * s, height);
      ctx.fillStyle = isDark ? "#1e1b4b" : "#FCE7F3"; ctx.fill();
      ctx.strokeStyle = "#DB2777"; ctx.lineWidth = 4 * s;
      for (let i = 0; i < 7; i++) {
        const yPos = (cy - 40 * s) + ((i * 120 * s + offset) % (height / 1.1));
        const sf = ((yPos - (cy - 80 * s)) / (height - (cy - 80 * s)));
        const w = 30 * s + (sf * 500 * s);
        if (yPos > cy - 80 * s) {
          ctx.beginPath(); ctx.moveTo(cx - w, yPos); ctx.lineTo(cx + w, yPos); ctx.stroke();
          ctx.fillStyle = isDark ? "#fda4af" : "#9F1239"; ctx.font = `900 ${42 * s * (sf + 0.1)}px sans-serif`; ctx.textAlign = "center";
          ctx.fillText(Math.floor(tick / 30) + i, cx, yPos - 10 * s);
        }
      }
      ctx.font = `900 ${90 * s}px serif`; ctx.fillStyle = "#7C3AED"; ctx.textAlign = "center";
      ctx.fillText("...", cx, cy - 20 * s + Math.sin(tick * 0.05) * 5 * s);
    }

    // 3. VENN / SUBSETS
    else if (slide.visualType === 'VENN_DIAGRAM' || slide.visualType === 'SUBSETS_DIAGRAM') {
      const isSubset = slide.visualType === 'SUBSETS_DIAGRAM';
      const r = rBase * 0.85; const offset = isSubset ? 0 : r * 0.65;
      const c1 = { x: cx - offset, y: cy };
      const c2 = { x: cx + offset * (isSubset ? 0 : 1), y: cy + (isSubset ? r * 0.35 : 0) };
      const r2 = isSubset ? r * 0.55 : r;
      const hl = slide.highlight || [];
      const pulse = (Math.sin(tick * 0.06) * 0.1) + 0.25;

      const drawZone = (z, col) => {
        tCtx.globalCompositeOperation = 'source-over'; tCtx.clearRect(0, 0, width, height);
        if (z === 'center' || z === 'subset') {
          tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fillStyle = col; tCtx.fill();
          tCtx.globalCompositeOperation = isSubset ? 'source-over' : 'source-in';
          tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); tCtx.fill();
        } else if (z === 'left' || z === 'difference') {
          tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fillStyle = col; tCtx.fill();
          tCtx.globalCompositeOperation = 'destination-out'; tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); tCtx.fill();
        } else if (z === 'right') {
          tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); tCtx.fillStyle = col; tCtx.fill();
          tCtx.globalCompositeOperation = 'destination-out'; tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fill();
        } else if (z === 'outside') {
          tCtx.fillStyle = col; tCtx.fillRect(cx - r * 2.5, cy - r * 1.6, r * 5, r * 3.2);
          tCtx.globalCompositeOperation = 'destination-out';
          tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI * 2); tCtx.fill();
          tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); tCtx.fill();
        }
        ctx.drawImage(tempCanvasRef.current, 0, 0);
      };

      const cPink = isDark ? `rgba(236, 72, 153, ${pulse + 0.1})` : `rgba(219, 39, 119, ${pulse})`;
      const cPurp = isDark ? `rgba(139, 92, 246, ${pulse + 0.1})` : `rgba(124, 58, 237, ${pulse})`;
      if (hl.includes('outside')) drawZone('outside', isDark ? "rgba(30, 41, 59, 0.5)" : "#f8fafc");
      if (hl.includes('left') || hl.includes('difference')) drawZone(hl.includes('left')?'left':'difference', cPink);
      if (hl.includes('right')) drawZone('right', cPink);
      if (hl.includes('center') || hl.includes('subset')) drawZone(isSubset?'subset':'center', cPurp);

      ctx.lineWidth = 2 * s; ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0";
      ctx.strokeRect(cx - r * 2.5, cy - r * 1.6, r * 5, r * 3.2);
      ctx.save(); ctx.shadowBlur = 10 * s; ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 6 * s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      ctx.font = `900 ${22 * s}px sans-serif`; ctx.textAlign = "center";
      ctx.fillStyle = isDark ? "#64748b" : "#94a3b8"; ctx.fillText("ξ", cx - r * 2.3, cy - r * 1.3);
      ctx.fillStyle = "#7C3AED"; ctx.fillText(slide.labels?.[1] || "A", c1.x - (isSubset ? 0 : r * 0.85), cy - r * 1.0);
      ctx.fillStyle = "#DB2777"; ctx.fillText(slide.labels?.[0] || "B", isSubset ? cx : (c2.x + r * 0.85), isSubset ? cy + c2.y - cy + 5 * s : (cy - r * 1.0));

      if (slide.elements) {
        ctx.font = `900 ${20 * s}px sans-serif`; ctx.fillStyle = isDark ? "#fff" : "#0f172a";
        if (slide.elements.left) ctx.fillText(slide.elements.left, c1.x - (isSubset ? 0 : r * 0.5), isSubset ? cy - r * 0.4 : cy);
        if (slide.elements.center || slide.elements.subset) ctx.fillText(slide.elements.center || slide.elements.subset, isSubset ? cx : cx, isSubset ? c2.y + 5 * s : cy);
        if (slide.elements.right) ctx.fillText(slide.elements.right, c2.x + r * 0.5, cy);
        if (slide.elements.outside) ctx.fillText(slide.elements.outside, cx + r * 2.1, cy + r * 1.4);
        if (slide.elements.difference) ctx.fillText(slide.elements.difference, cx, cy - r * 0.5);
      }
    }

    // 4. POWER SET TREE (1:1 IMPROVED)
    else if (slide.visualType === 'POWER_SET_TREE') {
      const items = slide.items || ["a", "b"];
      ctx.fillStyle = isDark ? "#fff" : "#1e293b"; ctx.font = `900 ${28 * s}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(`Set { ${items.join(', ')} }`, cx, cy - 100 * s);
      const total = Math.pow(2, items.length);
      const isProper = slide.showProper === true;
      const pulse = Math.sin(tick * 0.08) * 0.04 + 1;
      ctx.save(); ctx.translate(cx, cy - 50 * s); ctx.scale(pulse, pulse);
      if (isProper) {
         ctx.fillStyle = "#DB2777"; ctx.fillText(`Proper = 2^${items.length} - 1 = ${total - 1}`, 0, 0);
      } else {
         ctx.fillStyle = "#7C3AED"; ctx.fillText(`Subsets = 2^${items.length} = ${total}`, 0, 0);
      }
      ctx.restore();
      
      const subsets = items.length === 2 ? ["{a,b}", "{a}", "{b}", "{}"] : ["{a,b,c}", "{a,b}", "{a,c}", "{b,c}", "{a}", "{b}", "{c}", "{}"];
      subsets.forEach((sub, i) => {
        const p = Math.min(1, Math.max(0, (tick - 30 - i * 10) / 40));
        if (p > 0) {
          const col = i % 4; const row = Math.floor(i / 4);
          ctx.globalAlpha = p;
          const isImproper = (i === 0 && isProper);
          ctx.fillStyle = isImproper ? (isDark ? "#4b5563" : "#94a3b8") : (isDark ? "#f472b6" : "#DB2777");
          ctx.font = `${isImproper?'bold':'900'} ${19 * s}px monospace`;
          ctx.fillText(sub, cx + (col - 1.5) * 95 * s, cy + 25 * s + row * 45 * s);
          if (isImproper) {
             const tw = ctx.measureText(sub).width;
             ctx.beginPath(); ctx.moveTo(cx + (col - 1.5) * 95 * s - tw/2, cy + 25 * s + row * 45 * s - 7*s); ctx.lineTo(cx + (col - 1.5) * 95 * s + tw/2, cy + 25 * s + row * 45 * s - 7*s);
             ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2*s; ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;
    }

    // 5. MAPPING DIAGRAM
    else if (slide.visualType === 'MAPPING_DIAGRAM') {
      const rx = width * 0.12, ry = height * 0.35;
      const x1 = cx - width*0.25, x2 = cx + width*0.25;
      ctx.strokeStyle = "#7C3AED"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.ellipse(x1, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#DB2777"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.ellipse(x2, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      const itemsA = slide.itemsA || []; const itemsB = slide.itemsB || [];
      itemsA.forEach((it, i) => {
        const y = cy - ry * 0.65 + i * (ry * 1.3 / (itemsA.length - 1 || 1));
        const p = Math.min(1, Math.max(0, (tick - i * 15) / 45));
        ctx.fillStyle = isDark ? "#fff" : "#1e293b"; ctx.font = `900 ${22 * s}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(it, x1, y + 8 * s); ctx.fillText(itemsB[i], x2, y + 8 * s);
        if (p > 0.5) {
          const lp = (p - 0.5) * 2;
          ctx.beginPath(); ctx.moveTo(x1 + 25 * s, y); ctx.lineTo(x1 + 25 * s + (x2 - x1 - 50 * s) * lp, y);
          ctx.strokeStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"; ctx.lineWidth = 3 * s; ctx.stroke();
        }
      });
    }

    // 6. EQUAL / DISJOINT SETS (NEW)
    else if (slide.visualType === 'EQUAL_SETS' || slide.visualType === 'DISJOINT_SETS') {
      const r = rBase * 0.7;
      if (slide.visualType === 'DISJOINT_SETS') {
        const x1 = cx - r * 1.5; const x2 = cx + r * 1.5;
        ctx.lineWidth = 6 * s;
        ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(x1, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(x2, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#7C3AED"; ctx.font = `900 ${24 * s}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(slide.labels?.[0] || "A", x1, cy - r - 20 * s);
        ctx.fillStyle = "#DB2777"; ctx.fillText(slide.labels?.[1] || "B", x2, cy - r - 20 * s);
        const p = 1 + Math.sin(tick * 0.1) * 0.1; ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
        ctx.fillStyle = "#ef4444"; ctx.font = `bold ${50 * s}px sans-serif`; ctx.fillText("≠", 0, 15 * s); ctx.restore();
      } else {
        ctx.lineWidth = 6 * s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#7C3AED"; ctx.font = `900 ${24 * s}px sans-serif`; ctx.textAlign = "center"; ctx.fillText((slide.labels?.[0] || 'A') + " = " + (slide.labels?.[1] || 'B'), cx, cy - r - 25 * s);
        ctx.fillStyle = isDark ? "#fff" : "#1e293b"; ctx.font = `900 ${28 * s}px sans-serif`; ctx.fillText(slide.items || "", cx, cy + 10 * s);
      }
    }
  };

  // --- LIFECYCLE ---
  useLayoutEffect(() => {
    const check = () => setIsDark(!!containerRef.current?.closest('.dark') || getComputedStyle(document.body).backgroundColor === 'rgb(15, 23, 42)');
    check(); const o = new MutationObserver(check); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);

  const animate = () => {
    const c = canvasRef.current; if (!c) return;
    const s = window.devicePixelRatio || 2;
    const w = c.clientWidth * s; const h = c.clientHeight * s;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; tempCanvasRef.current.width = w; tempCanvasRef.current.height = h; initParticles(w, h); }
    tickRef.current += 1;
    draw(c.getContext('2d'), tempCanvasRef.current.getContext('2d'), w, h, s);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [stepIdx, isDark]);

  useEffect(() => { tickRef.current = 0; if (slides.length > 0 && !visitedIndices.has(stepIdx)) setVisitedIndices(prev => new Set([...prev, stepIdx])); }, [stepIdx, slides.length]);

  const hNext = () => { 
    if (stepIdx < slides.length - 1) {
      setStepIdx(s => s + 1); 
    } else if (allSeen) {
      if (onResult) {
        onResult({
          isCorrect: true,
          score: 1,
          total: 1,
          type: 'study_complete'
        });
      }
      onComplete(); 
    }
  };
  const hPrev = () => { if (stepIdx > 0) setStepIdx(s => s - 1); };

  const theme = isDark ? { bg: 'bg-[#0B101A]', stage: 'from-[#0F172A] to-[#0B101A]', card: 'bg-[#151921]', text: 'text-white', sub: 'text-slate-400', b: 'border-white/5' } : { bg: 'bg-[#F8FAFC]', stage: 'from-[#FFFBF5] to-[#F8F9FA]', card: 'bg-white', text: 'text-[#0f172a]', sub: 'text-[#475569]', b: 'border-slate-100' };

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${theme.bg} font-jakarta transition-colors duration-500 overflow-hidden`}>
      {/* 1. STAGE (CURATED OVERLAP FIX) */}
      <div className={`h-[42%] min-h-[250px] relative bg-gradient-to-b ${theme.stage} border-b-2 ${theme.b}`}>
         <canvas ref={canvasRef} className="w-full h-full" />
         
         {/* COMPACT BADGES (Fix Overlap) */}
         <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            <div className={`px-3 py-1.5 rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-glow-indigo' : 'bg-white/80 backdrop-blur-md text-indigo-600 border border-indigo-100 shadow-premium-sm'}`}>
                <Orbit size={12} className="animate-spin-slow" /> {data.topic || 'Set Theory'}
            </div>
            <div className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold ${isDark ? 'bg-slate-800/80 text-slate-500' : 'bg-white/80 backdrop-blur-md text-slate-400 shadow-premium-sm'}`}>
                {stepIdx + 1} / {slides.length}
            </div>
         </div>

         {/* PROGRESS BAR */}
         <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden z-20">
            <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-1000 ease-spring" style={{ width: `${((stepIdx + 1) / slides.length) * 100}%` }} />
         </div>
      </div>

      {/* 2. LESSON CARD */}
      <div className={`flex-1 flex flex-col ${theme.card} relative z-10 shadow-up`}>
         <div className="flex-1 overflow-y-auto px-7 py-10 no-scrollbar">
            <h2 className={`text-2xl font-black mb-5 leading-tight ${theme.text} tracking-tighter`}>{currentSlide.title}</h2>
            <div className={`text-[1.125rem] leading-[1.8] font-semibold ${theme.sub} prose-premium`} dangerouslySetInnerHTML={{ __html: currentSlide.text }} />
         </div>

         {/* 3. CONTROLS */}
         <div className={`p-5 flex gap-4 border-t ${theme.b} bg-inherit`}>
            <button className={`w-24 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${stepIdx === 0 ? 'opacity-0 pointer-events-none' : (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400')}`} onClick={hPrev}><ChevronLeft size={22} strokeWidth={4} /></button>
            <button className={`flex-1 h-14 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 shadow-glow-pink flex items-center justify-center gap-3 ${isLast ? 'bg-[#7c3aed] text-white' : 'bg-[#DB2777] text-white'}`} onClick={hNext}>
               {isLast ? 'Complete' : 'Next Step'} <ChevronRight size={18} strokeWidth={4} />
            </button>
         </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .prose-premium b { font-weight: 900; color: inherit; }
        .prose-premium .sym { font-family: 'Times New Roman', serif; font-style: italic; font-weight: 900; background: rgba(124,58,237,0.08); padding: 2px 7px; border-radius: 8px; color: #7c3aed; font-size: 1.25rem; vertical-align: middle; }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        .shadow-glow-pink { box-shadow: 0 10px 25px -5px rgba(219, 39, 119, 0.4); }
        .shadow-glow-indigo { box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.4); }
        .shadow-premium-sm { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
};

SetStudyEngine.hideGlobalFooter = true;
export default SetStudyEngine;

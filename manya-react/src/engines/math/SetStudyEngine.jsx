import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { discoverArtifact, syncUserData } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import SetStudyRenderer from './SetStudyRenderer';
import { initParticles, updateParticles } from './SetStudyLogic';

/**
 * SET STUDY ENGINE v8.0 (Atomic)
 * --------------------------------------------------
 * - DECOUPLED: Separates canvas animation from React state management.
 * - Optimized 60FPS tick-loop.
 */
const SetStudyEngine = ({ data, onComplete, onResult, skipDiscovery = false }) => {
  const dispatch = useDispatch();
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
  const allSeen = visitedIndices.size === slides.length;

  // --- 🎨 CANVAS ANIMATION LOOP ---
  const draw = (ctx, tCtx, width, height, s) => {
    if (!ctx || !currentSlide) return;
    const tick = tickRef.current;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (isDark) { grad.addColorStop(0, "#0F172A"); grad.addColorStop(1, "#0B0E14"); }
    else { grad.addColorStop(0, "#FFFAF5"); grad.addColorStop(1, "#F8F9FA"); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

    // Particles
    particlesRef.current = updateParticles(particlesRef.current, width, height, s);
    ctx.save();
    particlesRef.current.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? `rgba(124, 58, 237, ${p.opacity})` : `rgba(219, 39, 119, ${p.opacity * 0.4})`;
      ctx.fill();
    });
    ctx.restore();

    // Grid
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
    ctx.lineWidth = 1 * s; ctx.beginPath();
    const gs = 50 * s;
    for (let x = 0; x < width; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += gs) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    const cx = width / 2; const cy = height / 2 + (20 * s);
    const rBase = Math.min(width, height) * 0.32;

    // --- VISUAL TYPES ---
    if (currentSlide.visualType === 'FINITE_BASKET') {
      const items = currentSlide.visualData || [];
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
          ctx.fillStyle = isDark ? "#fff" : "#581c87"; ctx.font = `800 ${sz * 0.85}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(it, ix, iy);
        }
      });
    } else if (currentSlide.visualType === 'INFINITE_ROAD') {
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
          ctx.fillStyle = isDark ? "#fda4af" : "#9F1239"; ctx.font = `800 ${42 * s * (sf + 0.1)}px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign = "center";
          ctx.fillText(Math.floor(tick / 30) + i, cx, yPos - 10 * s);
        }
      }
      ctx.font = `800 ${90 * s}px 'Plus Jakarta Sans', serif`; ctx.fillStyle = "#7C3AED"; ctx.textAlign = "center";
      ctx.fillText("...", cx, cy - 20 * s + Math.sin(tick * 0.05) * 5 * s);
    } else if (currentSlide.visualType === 'VENN_DIAGRAM' || currentSlide.visualType === 'SUBSETS_DIAGRAM') {
      const isSubset = currentSlide.visualType === 'SUBSETS_DIAGRAM';
      const r = rBase * 0.85; const offset = isSubset ? 0 : r * 0.65;
      const c1 = { x: cx - offset, y: cy };
      const c2 = { x: cx + offset * (isSubset ? 0 : 1), y: cy + (isSubset ? r * 0.35 : 0) };
      const r2 = isSubset ? r * 0.55 : r;
      const hl = currentSlide.highlight || [];
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
      ctx.lineWidth = 6 * s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(c2.x, c2.y, r2, 0, Math.PI * 2); ctx.stroke();
      
      ctx.font = `800 ${22 * s}px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign = "center";
      ctx.fillStyle = isDark ? "#64748b" : "#94a3b8"; ctx.fillText("ξ", cx - r * 2.3, cy - r * 1.3);
      ctx.fillStyle = "#7C3AED"; ctx.fillText(currentSlide.labels?.[1] || "A", c1.x - (isSubset ? 0 : r * 0.85), cy - r * 1.0);
      ctx.fillStyle = "#DB2777"; ctx.fillText(currentSlide.labels?.[0] || "B", isSubset ? cx : (c2.x + r * 0.85), isSubset ? cy + r * 0.35 + 5 * s : (cy - r * 1.0));
    } else if (currentSlide.visualType === 'EQUAL_SETS' || currentSlide.visualType === 'DISJOINT_SETS') {
      const r = rBase * 0.7;
      if (currentSlide.visualType === 'DISJOINT_SETS') {
        const x1 = cx - r * 1.5; const x2 = cx + r * 1.5;
        ctx.lineWidth = 6 * s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(x1, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(x2, cy, r, 0, Math.PI * 2); ctx.stroke();
        const p = 1 + Math.sin(tick * 0.1) * 0.1; ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
        ctx.fillStyle = "#ef4444"; ctx.font = `bold ${50 * s}px sans-serif`; ctx.fillText("≠", 0, 15 * s); ctx.restore();
      } else {
        ctx.lineWidth = 6 * s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = isDark ? "#fff" : "#1e293b"; ctx.font = `800 ${28 * s}px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign = "center";
        ctx.fillText(currentSlide.items || "", cx, cy + 10 * s);
      }
    }
  };

  const animate = () => {
    const c = canvasRef.current; if (!c) return;
    const s = window.devicePixelRatio || 2;
    const w = c.clientWidth * s; const h = c.clientHeight * s;
    if (c.width !== w || c.height !== h) { 
      c.width = w; c.height = h; 
      tempCanvasRef.current.width = w; tempCanvasRef.current.height = h; 
      particlesRef.current = initParticles(w, h); 
    }
    tickRef.current += 1;
    draw(c.getContext('2d'), tempCanvasRef.current.getContext('2d'), w, h, s);
    requestRef.current = requestAnimationFrame(animate);
  };

  useLayoutEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    checkTheme(); const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [stepIdx, isDark, currentSlide]);

  useEffect(() => { 
    tickRef.current = 0; 
    if (slides.length > 0 && !visitedIndices.has(stepIdx)) {
      setVisitedIndices(prev => new Set([...prev, stepIdx])); 
    }
  }, [stepIdx, slides.length]);

  const hNext = () => { 
    if (stepIdx < slides.length - 1) setStepIdx(s => s + 1); 
    else if (allSeen) {
      // 🏺 ARCHIVE to Knowledge Vault - ONLY if not a quiz/exercise and NOT already in vault
      if (data.mode !== 'quiz' && !skipDiscovery) {
        dispatch(discoverArtifact({
            id: data.id || `math_set_${Date.now()}`,
            type: 'set_study',
            title: data.topic || 'Math Discovery',
            subject: data.subject || 'MATH',
            data: data 
        }));

        // 🚀 FORCE PERSISTENCE
        setTimeout(() => {
            dispatch(syncUserData(store.getState().user.data));
        }, 100);

        dispatch(addToast({
            message: "Math Discovery Archived to Vault! 🏺✨",
            type: "success"
        }));
      }

      onResult?.({ isCorrect: true, score: 1, total: 1, type: 'study_complete' });
      onComplete?.(); 
    }
  };
  const hPrev = () => { if (stepIdx > 0) setStepIdx(s => s - 1); };

  return (
    <SetStudyRenderer 
      stepIdx={stepIdx} slides={slides} isDark={isDark} visitedIndices={visitedIndices}
      canvasRef={canvasRef} containerRef={containerRef}
      hPrev={hPrev} hNext={hNext} topic={data.topic}
    />
  );
};

SetStudyEngine.hideGlobalFooter = true;
export default SetStudyEngine;

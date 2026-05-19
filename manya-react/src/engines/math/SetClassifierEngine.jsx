import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import SetClassifierRenderer from './SetClassifierRenderer';
import { getDeductedScene, initBrandedParticles } from './SetClassifierLogic';

/**
 * SET CLASSIFIER ENGINE v8.0 (Atomic)
 * --------------------------------------------------
 * - DECOUPLED: Separates particle physics from UI.
 * - Optimized 60FPS tick-loop.
 */
const SetClassifierEngine = ({ data, onComplete, onAttempt, onResult }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [feedback, setFeedback] = useState('idle'); 
  const [isResolved, setIsResolved] = useState(false);
  const [totalMistakes, setTotalMistakes] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const tickRef = useRef(0);
  const particlesRef = useRef([]);
  const requestRef = useRef();
  
  const startTimeRef = useRef(Date.now());
  const globalStartTimeRef = useRef(Date.now());

  const questions = useMemo(() => data.questions || [], [data]);
  const currentQ = questions[stepIdx];
  const scene = useMemo(() => getDeductedScene(currentQ), [currentQ]);

  useEffect(() => {
    onResult?.({
      score: stepIdx,
      total: questions.length,
      type: 'pulse'
    });
  }, [stepIdx, questions.length, onResult]);

  // --- 🎨 CANVAS DRAW LOOP ---
  const drawModel = (ctx, w, h, s) => {
    if (!ctx || !currentQ) return;
    const tick = tickRef.current;
    const isFinite = currentQ.expected === 'finite';
    
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    if (isDark) { bg.addColorStop(0, "#0F172A"); bg.addColorStop(1, "#0B101A"); }
    else { bg.addColorStop(0, "#FFFFFF"); bg.addColorStop(1, "#F9FBFD"); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const margin = 40 * s;

    particlesRef.current.forEach(p => {
        if (isFinite) { 
           if (p.x < margin) { p.x = margin; p.vx = Math.abs(p.vx); }
           if (p.x > w - margin) { p.x = w - margin; p.vx = -Math.abs(p.vx); }
           if (p.y < margin) { p.y = margin; p.vy = Math.abs(p.vy || 0); }
           if (p.y > h - margin) { p.y = h - margin; p.vy = -Math.abs(p.vy || 0); }
        } else { 
           const wrap = 100 * s;
           if (p.x < -wrap) p.x = w + wrap; if (p.x > w + wrap) p.x = -wrap;
           if (p.y < -wrap) p.y = h + wrap; if (p.y > h + wrap) p.y = -wrap;
        }
        
        p.x += (p.vx || 0); p.y += (p.vy || 0);

        ctx.save();
        if (p.type === 'star') {
            const rad = Math.max(0.1, p.z * s * (1 + Math.sin(tick * 0.01 + p.id) * 0.2));
            ctx.fillStyle = isDark ? `rgba(255,255,255,${0.3 + Math.sin(tick * 0.02 + p.id) * 0.2})` : `rgba(124,58,237,${0.2 + Math.sin(tick * 0.02 + p.id) * 0.1})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'pin') {
            const wave = Math.sin(tick * 0.02 + p.id) * 5 * s;
            ctx.fillStyle = "#DB2777"; 
            ctx.beginPath(); ctx.arc(p.x, p.y - wave, Math.max(0.1, 6 * s), 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5 * s; ctx.stroke();
        } else if (p.type === 'rain') {
            ctx.fillStyle = isDark ? "#4ade80" : "#059669"; ctx.font = `bold ${22 * s}px monospace`;
            ctx.globalAlpha = 0.4 + Math.sin(tick * 0.02 + p.id) * 0.2; ctx.fillText(p.label, p.x, p.y);
        } else if (p.type === 'label') {
            ctx.fillStyle = isDark ? "#fff" : "#7c3aed"; ctx.font = `800 ${p.size * s}px 'Plus Jakarta Sans', sans-serif`;
            ctx.textAlign = "center"; ctx.fillText(p.label, p.x, p.y);
        } else if (p.type === 'emoji' || p.type === 'student') {
            ctx.font = `${p.size * s}px serif`;
            ctx.translate(p.x, p.y); if (p.vx < 0) ctx.scale(-1, 1);
            ctx.rotate(Math.sin(tick * 0.005 + p.id) * 0.1);
            ctx.fillText(p.char || (p.type === 'student' ? '🧒' : '✨'), -p.size * s / 2, p.size * s / 2);
        } else if (p.type === 'grain') {
            ctx.fillStyle = isDark ? "#fde68a" : "#f59e0b";
            ctx.globalAlpha = 0.6 + Math.sin(tick * 0.01 + p.id) * 0.3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    if (isFinite) {
        ctx.save(); 
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(124, 58, 237, 0.3)"; ctx.lineWidth = 6 * s; 
        ctx.beginPath(); ctx.roundRect(margin - 15 * s, margin - 15 * s, w - margin * 2 + 30 * s, h - margin * 2 + 30 * s, 30 * s); ctx.stroke(); 
        ctx.restore();
    } else {
        if (tick % 180 > 90) {
            ctx.fillStyle = isDark ? "#475569" : "#cbd5e1"; ctx.font = `800 ${80 * s}px serif`;
            ctx.textAlign = "center"; ctx.fillText("...", w / 2, h - 20 * s);
        }
    }
  };

  const animate = () => {
    const c = canvasRef.current; if (!c) return;
    const s = window.devicePixelRatio || 2;
    const w = c.clientWidth * s; const h = c.clientHeight * s;
    if (c.width !== w || c.height !== h) { 
        c.width = w; c.height = h; 
        particlesRef.current = initBrandedParticles(scene, w, h, currentQ); 
    }
    tickRef.current += 1;
    drawModel(c.getContext('2d'), w, h, s);
    requestRef.current = requestAnimationFrame(animate);
  };

  useLayoutEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    checkTheme(); const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [stepIdx, isDark, scene]);

  const handleChoice = (c) => {
    if (isResolved) return;
    const isCorrect = c === currentQ.expected;
    const duration = Date.now() - startTimeRef.current;

    onAttempt?.({ isCorrect, label: `Classify [${stepIdx + 1}]`, duration });

    if (isCorrect) { setFeedback('correct'); setIsResolved(true); audioService.success?.(); }
    else { setFeedback('wrong'); setTotalMistakes(m => m + 1); audioService.error?.(); setTimeout(() => setFeedback('idle'), 800); }
  };

  const handleNext = () => {
    if (stepIdx < questions.length - 1) {
       startTimeRef.current = Date.now();
       setStepIdx(s => s + 1); setFeedback('idle'); setIsResolved(false);
    } else { 
       onComplete?.({ isCorrect: totalMistakes === 0, score: questions.length - totalMistakes, total: questions.length, mistakes: totalMistakes, type: 'simulation' }); 
    }
  };

  return (
    <SetClassifierRenderer 
        currentQ={currentQ} stepIdx={stepIdx} totalQuestions={questions.length}
        isDark={isDark} feedback={feedback} isResolved={isResolved}
        canvasRef={canvasRef} containerRef={containerRef}
        handleChoice={handleChoice} handleNext={handleNext}
    />
  );
};

SetClassifierEngine.hideGlobalFooter = true;
export default SetClassifierEngine;

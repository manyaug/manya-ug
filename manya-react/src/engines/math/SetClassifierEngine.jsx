import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Orbit, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/**
 * SET CLASSIFIER ENGINE (React v6.0 - Definitive Fix)
 * --------------------------------------------------
 * - Slowed Motion: Velocities reduced by 60% for better legibility.
 * - Strict Containment: Atomic boundary clamping prevents out-of-canvas escape.
 * - Crash Prevention: Math.max(0.1, ...) on all arc radii to avoid negative radius errors.
 * - Atomic Compatibility: Optimized to handle single-question JSONs.
 */

const SetClassifierEngine = ({ data, onComplete, onAttempt }) => {
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
  const lastSimAttemptRef = useRef({ time: 0, label: '' });
  
  const startTimeRef = useRef(Date.now());
  const globalStartTimeRef = useRef(Date.now());

  const questions = useMemo(() => data.questions || [], [data]);
  // Safety for empty or atomic questions
  const currentQ = questions[stepIdx] || questions[0];

  const getDeductedScene = (q) => {
    if (!q) return 'default';
    if (q.scene && q.scene !== 'default') return q.scene;
    
    const text = (q.prompt || "").toLowerCase();
    if (text.includes("uganda") && !text.includes("school")) return 'map';
    if (text.includes("school") && !text.includes("pupil")) return 'schools';
    if (text.includes("district") || text.includes("geography")) return 'map';
    if (text.includes("integer") || text.includes("whole number") || text.includes("negative") || text.includes("count")) return 'integers';
    if (text.includes("multiples") || text.includes("set of numbers") || text.includes("numeric")) return 'rain';
    if (text.includes("stars") || text.includes("points") || text.includes("infinite") || text.includes("universe")) return 'stars';
    if (text.includes("pupils") || text.includes("children") || text.includes("people") || text.includes("teacher")) return 'class';
    if (text.includes("cow") || text.includes("kraal") || text.includes("animals")) return 'cows';
    if (text.includes("fish") || text.includes("ocean") || text.includes("lake")) return 'fish';
    if (text.includes("vowels")) return 'vowels';
    if (text.includes("letters") || text.includes("mathematics") || text.includes("'")) return 'letters';
    if (text.includes("leaves") || text.includes("tree") || text.includes("forest")) return 'leaves';
    if (text.includes("sand") || text.includes("beach") || text.includes("grains")) return 'sand';
    
    return q.scene || 'default';
  };

  const scene = useMemo(() => getDeductedScene(currentQ), [currentQ]);

  const initBrandedParticles = (w, h) => {
    const p = [];
    const spawn = (count, logic) => { 
        for (let i = 0; i < count; i++) {
            const base = logic();
            p.push({ 
                ...base, 
                vx: base.vx ?? (Math.random()-0.5)*0.3, // VERY SLOW MOTION (v6.2)
                vy: base.vy ?? (Math.random()-0.5)*0.3, 
                id: i 
            }); 
        }
    };

    if (scene === 'map') {
        spawn(25, () => ({ x: w/2 + (Math.random()-0.5)*w*0.5, y: h/2 + (Math.random()-0.5)*h*0.5, type: 'pin' }));
    } else if (scene === 'stars') {
        spawn(120, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'star', z: Math.random()*3+0.5 }));
    } else if (scene === 'rain' || scene === 'integers') {
        const isInt = scene === 'integers';
        spawn(30, () => ({ 
            x: Math.random()*w, 
            y: Math.random()*h, 
            type: 'rain', 
            vy: -0.2 - Math.random()*0.3, 
            label: isInt ? Math.floor(Math.random()*200 - 100) : Math.floor(Math.random()*10)*5 
        }));
    } else if (scene === 'class') {
        spawn(15, () => ({ x: w/2 + (Math.random()-0.5)*w*0.6, y: h/2 + (Math.random()-0.5)*h*0.6, type: 'student', char: Math.random()>0.5?'🧒':'👧', size: 40 }));
    } else if (scene === 'vowels' || scene === 'letters' || scene === 'default') {
        const labels = scene === 'vowels' ? "AEIOU".split('') : (currentQ.prompt?.toUpperCase().includes("MATHEMATICS") ? "MATHS".split('') : "ABC".split(''));
        labels.forEach((l, i) => p.push({ x: w/2 + (Math.random()-0.5)*w*0.6, y: h/2 + (Math.random()-0.5)*h*0.5, type: 'label', label: l, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, size: 30, id: i }));
    } else if (scene === 'schools') {
        spawn(20, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char: '🏫', size: 40 }));
    } else if (scene === 'sand') {
        spawn(300, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'grain', size: Math.random()*2+1 }));
    } else if (scene === 'leaves') {
        spawn(20, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char: '🍃', size: 30, vy: 0.15 + Math.random()*0.2 }));
    } else {
        const char = scene === 'cows' ? '🐄' : (scene === 'fish' ? '🐟' : '✨');
        spawn(12, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char, size: 50 }));
    }
    particlesRef.current = p;
  };

  const drawDefinitive = (ctx, w, h, s) => {
    if (!ctx || !currentQ) return;
    const tick = tickRef.current;
    const isFinite = currentQ.expected === 'finite';
    
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    if (isDark) { bg.addColorStop(0, "#0F172A"); bg.addColorStop(1, "#0B101A"); }
    else { bg.addColorStop(0, "#FFFFFF"); bg.addColorStop(1, "#F9FBFD"); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const margin = 40*s; // REDUCED MARGIN (Defined for v6.5)

    particlesRef.current.forEach(p => {
        if (isFinite) { 
           if (p.x < margin) { p.x = margin; p.vx = Math.abs(p.vx); }
           if (p.x > w-margin) { p.x = w-margin; p.vx = -Math.abs(p.vx); }
           if (p.y < margin) { p.y = margin; p.vy = Math.abs(p.vy || 0); }
           if (p.y > h-margin) { p.y = h-margin; p.vy = -Math.abs(p.vy || 0); }
        } else { 
           const wrap = 100*s;
           if (p.x < -wrap) p.x = w+wrap; if (p.x > w+wrap) p.x = -wrap;
           if (p.y < -wrap) p.y = h+wrap; if (p.y > h+wrap) p.y = -wrap;
        }
        
        p.x += (p.vx || 0); p.y += (p.vy || 0);

        ctx.save();
        if (p.type === 'star') {
            const rad = Math.max(0.1, p.z * s * (1 + Math.sin(tick*0.01 + p.id)*0.2));
            ctx.fillStyle = isDark ? `rgba(255,255,255,${0.3 + Math.sin(tick*0.02 + p.id)*0.2})` : `rgba(124,58,237,${0.2 + Math.sin(tick*0.02 + p.id)*0.1})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'pin') {
            const wave = Math.sin(tick*0.02 + p.id)*5*s;
            ctx.fillStyle = "#DB2777"; 
            ctx.beginPath(); ctx.arc(p.x, p.y - wave, Math.max(0.1, 6*s), 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5*s; ctx.stroke();
        } else if (p.type === 'rain') {
            ctx.fillStyle = isDark ? "#4ade80" : "#059669"; ctx.font = `bold ${22*s}px monospace`;
            ctx.globalAlpha = 0.4 + Math.sin(tick*0.02 + p.id)*0.2; ctx.fillText(p.label, p.x, p.y);
        } else if (p.type === 'label') {
            ctx.fillStyle = isDark ? "#fff" : "#7c3aed"; ctx.font = `900 ${p.size*s}px sans-serif`;
            ctx.textAlign="center"; ctx.fillText(p.label, p.x, p.y);
        } else if (p.type === 'emoji' || p.type === 'student') {
            ctx.font = `${p.size*s}px serif`;
            ctx.translate(p.x, p.y); if (p.vx < 0) ctx.scale(-1, 1);
            ctx.rotate(Math.sin(tick*0.005 + p.id)*0.1);
            ctx.fillText(p.char, -p.size*s/2, p.size*s/2);
        } else if (p.type === 'grain') {
            ctx.fillStyle = isDark ? "#fde68a" : "#f59e0b";
            ctx.globalAlpha = 0.6 + Math.sin(tick*0.01 + p.id)*0.3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size*s, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    });

    if (isFinite) {
        ctx.save(); 
        const grd = ctx.createLinearGradient(margin, margin, w-margin, h-margin);
        grd.addColorStop(0, "rgba(124, 58, 237, 0.1)"); grd.addColorStop(1, "rgba(124, 58, 237, 0.02)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.roundRect(margin-15*s, margin-15*s, w-margin*2+30*s, h-margin*2+30*s, 30*s); ctx.fill();
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(124, 58, 237, 0.3)"; ctx.lineWidth = 6*s; 
        ctx.stroke(); 
        ctx.restore();
    } else {
        // Infinite indicator: Ellipsis
        if (tick % 180 > 90) {
            ctx.fillStyle = isDark ? "#475569" : "#cbd5e1"; ctx.font = `900 ${80*s}px serif`;
            ctx.textAlign = "center"; ctx.fillText("...", w/2, h - 20*s);
        }
    }
  };

  const animateDefinitive = () => {
    const c = canvasRef.current; if (!c) return;
    const s = window.devicePixelRatio || 2;
    const w = c.clientWidth * s; const h = c.clientHeight * s;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; initBrandedParticles(w, h); }
    tickRef.current += 1;
    drawDefinitive(c.getContext('2d'), w, h, s);
    requestRef.current = requestAnimationFrame(animateDefinitive);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateDefinitive);
    return () => cancelAnimationFrame(requestRef.current);
  }, [stepIdx, isDark, scene]);

  useLayoutEffect(() => {
    const check = () => setIsDark(!!containerRef.current?.closest('.dark') || getComputedStyle(document.body).backgroundColor === 'rgb(15, 23, 42)');
    check(); const o = new MutationObserver(check); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);

  const handleChoice = (c) => {
    if (isResolved) return;
    const isCorrect = c === currentQ.expected;
    const duration = Date.now() - startTimeRef.current;

    // ── RECORD GRANULAR ATTEMPT ──
    if (onAttempt) {
        onAttempt({
            isCorrect,
            label: `Classify [${stepIdx + 1}]`,
            selectedAnswer: c,
            correctAnswer: currentQ.expected,
            duration,
            mistakes: isCorrect ? 0 : 1
        });
    }

    if (isCorrect) { 
        setFeedback('correct'); 
        setIsResolved(true); 
    }
    else { 
        setFeedback('wrong'); 
        setTotalMistakes(prev => prev + 1);
        setTimeout(() => setFeedback('idle'), 800); 
    }
  };

  const handleNext = () => {
    if (stepIdx < questions.length - 1) {
       startTimeRef.current = Date.now();
       setStepIdx(s => s + 1); setFeedback('idle'); setIsResolved(false);
    } else { 
       if (onComplete) onComplete({
          isCorrect: totalMistakes === 0,
          accuracy: Math.max(0, (questions.length - totalMistakes) / questions.length),
          score: questions.length - totalMistakes,
          total: questions.length,
          mistakes: totalMistakes,
          duration: Date.now() - globalStartTimeRef.current,
          engineType: 'SET_CLASSIFIER'
       }); 
    }
  };

  const theme = isDark ? { bg: 'bg-[#0B101A]', stage: 'from-[#0F172A] to-[#0B101A]', card: 'bg-[#151921]', text: 'text-white', sub: 'text-slate-400', b: 'border-white/5' } : { bg: 'bg-[#F8FAFC]', stage: 'from-[#FFFFFF] to-[#F9FBFD]', card: 'bg-white', text: 'text-[#0f172a]', sub: 'text-[#475569]', b: 'border-slate-100' };

  if (!currentQ || !data) return null; // Safety guard

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${theme.bg} font-jakarta transition-all duration-500 overflow-hidden`}>
      {/* 1. STAGE - Dominant space for particle visual */}
      <div className={`flex-[2.5] w-full relative bg-gradient-to-b ${theme.stage} border-b-2 ${theme.b} transition-all duration-700 ${feedback === 'correct' ? 'border-green-500 bg-green-500/5' : (feedback === 'wrong' ? 'border-red-500 bg-red-500/5' : theme.b)}`}>
         <canvas ref={canvasRef} className="w-full h-full block" />
         
         <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            <div className={`px-3 py-1.5 rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-glow-indigo' : 'bg-white/80 backdrop-blur-md text-indigo-600 border border-indigo-100 shadow-premium-sm'}`}>
                <Orbit size={12} className="animate-spin-slow" /> CLASSIFY
            </div>
            <div className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold ${isDark ? 'bg-black/40 text-slate-500' : 'bg-white/80 backdrop-blur-md text-slate-400 shadow-premium-sm'}`}>
                {stepIdx + 1} / {questions.length}
            </div>
         </div>

         {/* PROGRESS BAR */}
         <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden z-20">
            <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-1000 ease-spring" style={{ width: `${((stepIdx + 1) / questions.length) * 100}%` }} />
         </div>
      </div>

      {/* 2. LESSON CARD */}
      <div className={`flex-none flex flex-col ${theme.card} relative z-10 shadow-up overflow-hidden`}>
         <div className="flex-none px-6 py-5 text-center flex flex-col justify-center gap-1.5">
            <h2 className={`text-xl font-black leading-tight ${theme.text} tracking-tight`} dangerouslySetInnerHTML={{ __html: currentQ.prompt }} />
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme.sub} opacity-30`}>Determine Domain</p>
         </div>

         {/* 3. CONTROLS */}
         <div className={`p-6 flex flex-col gap-4 border-t ${theme.b}`}>
          <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${isResolved ? 'opacity-0 scale-95 absolute inset-0 pointer-events-none' : 'opacity-100'}`}>
                <button onClick={() => handleChoice('finite')} className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-95 flex flex-col items-center justify-center shadow-[0_5px_0_rgba(5,150,105,1)] hover:shadow-[0_3px_0_rgba(5,150,105,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[5px] text-white bg-emerald-500 border border-emerald-400`}>
                    FINITE <span className="text-[8px] opacity-60 mt-0.5 uppercase font-semibold">Limited</span>
                </button>
                <button onClick={() => handleChoice('infinite')} className={`h-14 rounded-2xl font-black text-[12px] tracking-widest uppercase transition-all active:scale-95 flex flex-col items-center justify-center shadow-[0_5px_0_rgba(219,39,119,1)] hover:shadow-[0_3px_0_rgba(219,39,119,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[5px] text-white bg-pink-500 border border-pink-400`}>
                    INFINITE <span className="text-[8px] opacity-60 mt-0.5 uppercase font-semibold">Endless</span>
                </button>
            </div>

            <button 
                onClick={handleNext}
                className={`w-full h-14 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all active:scale-95 shadow-glow-indigo flex items-center justify-center gap-3 relative z-30 ${isResolved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none absolute inset-x-5'} bg-indigo-600 text-white shadow-[0_5px_0_rgba(67,56,202,1)]`}>
                {stepIdx === questions.length - 1 ? 'Finish Activity' : 'Next Question'} <ArrowRight size={18} strokeWidth={4} />
            </button>
         </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-spin-slow { animation: spin 12s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        .shadow-up { box-shadow: 0 -15px 40px rgba(0,0,0,0.04); }
        .shadow-glow-indigo { box-shadow: 0 10px 25px -5px rgba( 79, 70, 229, 0.4); }
        .shadow-glow-pink { box-shadow: 0 10px 25px -5px rgba(219, 39, 119, 0.4); }
        .shadow-glow-emerald { box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.2); }
        .shadow-premium-sm { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
};

SetClassifierEngine.hideGlobalFooter = true;
export default SetClassifierEngine;

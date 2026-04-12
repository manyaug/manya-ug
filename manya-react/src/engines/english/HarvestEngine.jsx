import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * MANYA ENGLISH — HARVEST ENGINE 3.0 (Clean Rebuild)
 * "Catch the right words before they hit the ground!"
 *
 * Control: Tap LEFT half / RIGHT half of screen to snap basket.
 * Logic:   Items fall in two fixed lanes (left 30%, right 70%).
 *          Basket snaps to the tapped side.
 *          Correct catch → +10 pts. Wrong catch → -1 life.
 *          Missed correct item → -1 life.
 * Win:     Reach winScore (default 50).
 * Lose:    All 3 lives gone.
 */

const LANE_X = { left: 30, right: 70 }; // % from left edge

const HarvestEngine = ({ data, onComplete }) => {
  /* ── data ── */
  const leftCat  = (data?.leftCategory  || 'NOUN').toUpperCase();
  const rightCat = (data?.rightCategory || 'VERB').toUpperCase();
  const wordPool = useMemo(() => data?.words || [], [data]);
  const WIN      = data?.winScore ?? 50;

  /* ── state ── */
  const [side, setSide]       = useState('left');   // basket position
  const [items, setItems]     = useState([]);
  const [score, setScore]     = useState(0);
  const [lives, setLives]     = useState(3);
  const [done, setDone]       = useState(false);     // win/lose final
  const [won, setWon]         = useState(false);
  const [particles, setParticles] = useState([]);
  const [shakeKey, setShakeKey]   = useState(0);     // CSS shake trigger

  /* ── refs (live values for rAF loop) ── */
  const sideRef    = useRef('left');
  const scoreRef   = useRef(0);
  const livesRef   = useRef(3);
  const doneRef    = useRef(false);
  const nextId     = useRef(0);
  const lastSpawn  = useRef(0);
  const globalStartTimeRef = useRef(Date.now());
  const mistakesRef = useRef(0);
  const raf        = useRef(null);

  const syncRefs = useCallback(() => {
    sideRef.current  = side;
  }, [side]);
  useEffect(syncRefs, [side, syncRefs]);

  /* ── particle helper ── */
  const burst = (x, y, color) =>
    setParticles(p => [
      ...p,
      ...Array(7).fill(0).map(() => ({
        id: Math.random(),
        x, y, color,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random()) * -5 - 2,
        life: 1,
      }))
    ]);

  /* ── tap handler ── */
  const handleTap = useCallback((e) => {
    if (doneRef.current) return;
    const el   = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx   = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const next = cx < rect.width / 2 ? 'left' : 'right';
    setSide(next);
    sideRef.current = next;
  }, []);

  /* ── rAF game loop ── */
  useEffect(() => {
    if (!wordPool || !wordPool.length) return;

    const tick = (t) => {
      if (doneRef.current) return;

      /* 1 — Spawn every 1.8s for better pacing */
      if (t - lastSpawn.current > 1800) {
        const word = wordPool[Math.floor(Math.random() * wordPool.length)];
        // Determine the correct lane for this word to avoid "Impossible Catch" scenarios
        const isLeft = word.type.toUpperCase().trim() === leftCat.trim();
        const laneSide = isLeft ? 'left' : 'right';
        
        setItems(prev => [
          ...prev,
          {
            id: nextId.current++,
            text: word.text,
            cat:  word.type.toUpperCase().trim(),
            side: laneSide,
            x:    LANE_X[laneSide],
            y:    -10,
            vy:   0.55 + Math.random() * 0.2, // Variable speed
          }
        ]);
        lastSpawn.current = t;
      }

      /* 2 — move items + collision */
      let scoreGain = 0;
      let lifeLoss = 0;
      let burstList = [];

      setItems(prev => {
        const kept = [];
        for (const item of prev) {
          const newY = item.y + item.vy;

          /* catch zone (widened slightly for mobile) */
          if (newY >= 75 && newY <= 90 && item.side === sideRef.current) {
            const correct =
              (item.side === 'left'  && item.cat === leftCat.trim()) ||
              (item.side === 'right' && item.cat === rightCat.trim());

            if (correct) {
                scoreGain += 10;
                burstList.push({ x: item.x, y: newY, color: '#f59e0b' });
            } else {
                lifeLoss += 1;
                burstList.push({ x: item.x, y: newY, color: '#f43f5e' });
            }
            continue; 
          }

          /* missed correct item penalty */
          if (newY > 100) {
              const wasCorrect = 
                (item.side === 'left' && item.cat === leftCat.trim()) ||
                (item.side === 'right' && item.cat === rightCat.trim());
              
              if (wasCorrect) lifeLoss += 1;
              continue;
          }

          kept.push({ ...item, y: newY });
        }
        return kept;
      });

      if (scoreGain > 0) {
        const next = scoreRef.current + scoreGain;
        scoreRef.current = next;
        setScore(next);
      }
      if (lifeLoss > 0) {
        const next = Math.max(0, livesRef.current - lifeLoss);
        livesRef.current = next;
        setLives(next);
        mistakesRef.current += lifeLoss;
        setShakeKey(k => k + 1);
      }
      burstList.forEach(b => burst(b.x, b.y, b.color));

      setParticles(p =>
        p
          .map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.2, life: pt.life - 0.05 }))
          .filter(pt => pt.life > 0)
      );

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [wordPool, leftCat, rightCat, WIN]);

  /* ── Win/Lose detection (OUTSIDE RAF loop — no nested setState) ── */
  useEffect(() => {
    if (done) return;
    if (score >= WIN) {
      doneRef.current = true;
      setDone(true);
      setWon(true);
      cancelAnimationFrame(raf.current);
    }
  }, [score, WIN, done]);

  useEffect(() => {
    if (done) return;
    if (lives <= 0) {
      doneRef.current = true;
      setDone(true);
      setWon(false);
      cancelAnimationFrame(raf.current);
    }
  }, [lives, done]);

  /* ── basket X position for each side ── */
  const basketLeft = side === 'left' ? '10%' : '55%';

  /* ── colour helpers ── */
  const catColor = (cat) => cat === leftCat ? 'bg-indigo-600' : 'bg-emerald-600';
  const catBorder = (cat) => cat === leftCat ? 'border-indigo-400' : 'border-emerald-400';

  return (
    <div
      className="flex flex-col h-full bg-[#0f1623] text-white overflow-hidden select-none font-sans relative"
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* ── HUD ── */}
      <header className="flex-none flex items-center justify-between px-5 pt-6 sm:pt-10 pb-4 z-20">
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2">
          <span className="text-amber-400 text-xs sm:text-sm">⭐</span>
          <span className="text-base sm:text-lg font-black tabular-nums">{score}</span>
          <span className="text-[9px] sm:text-[10px] text-amber-500/60 font-bold ml-0.5 sm:ml-1">/ {WIN}</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {[0,1,2].map(i => (
            <span key={i} className={`text-xl sm:text-2xl transition-all duration-300 ${i < lives ? 'opacity-100' : 'opacity-15'}`}>
              {i < lives ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
      </header>

      {/* ── Lane labels ── */}
      <div className="flex-none flex px-4 gap-3 sm:gap-4 pb-2 z-20">
        <div className={`flex-1 text-center py-4 sm:py-5 rounded-[24px] sm:rounded-3xl border-2 transition-all duration-200 font-black text-xs sm:text-sm uppercase tracking-widest ${side === 'left' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/3 border-white/8 text-slate-500'}`}>
          <div className="text-[8px] sm:text-[9px] opacity-40 mb-1 leading-none">Lane 01</div>
          {leftCat}
        </div>
        <div className={`flex-1 text-center py-4 sm:py-5 rounded-[24px] sm:rounded-3xl border-2 transition-all duration-200 font-black text-xs sm:text-sm uppercase tracking-widest ${side === 'right' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/3 border-white/8 text-slate-500'}`}>
          <div className="text-[8px] sm:text-[9px] opacity-40 mb-1 leading-none">Lane 02</div>
          {rightCat}
        </div>
      </div>

      {/* ── Game field ── */}
      <div
        key={shakeKey}  /* change key → re-mounts for CSS shake */
        className="flex-1 relative overflow-hidden"
        style={{ animation: shakeKey > 0 ? 'shake 0.4s ease' : 'none' }}
      >
        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color, opacity: p.life, transform: `scale(${p.life})` }}
          />
        ))}

        {/* Falling items */}
        {items.map(item => (
          <div
            key={item.id}
            className="absolute pointer-events-none flex flex-col items-center gap-1"
            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            <div className={`w-14 h-14 rounded-3xl border-2 ${catColor(item.cat)} ${catBorder(item.cat)} flex items-center justify-center shadow-2xl`}>
              <span className="text-2xl">🍎</span>
            </div>
            <div className="px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
              {item.text}
            </div>
          </div>
        ))}

        {/* Basket */}
        <div
          className="absolute bottom-4 transition-all duration-150 ease-out pointer-events-none"
          style={{ left: basketLeft, width: '40%' }}
        >
          <div className="relative mx-auto flex flex-col items-center w-[80px] sm:w-[120px]">
            {/* Shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-4 bg-black/30 rounded-full blur-md" />
            {/* Basket body */}
            <div className="w-full h-16 sm:h-20 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-[30px] sm:rounded-b-[40px] rounded-t-xl sm:rounded-t-2xl border-t-4 sm:border-t-8 border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 overflow-hidden">
              <span className="text-2xl sm:text-3xl">🧺</span>
            </div>
          </div>
        </div>

        {/* "Tap" hint on game start */}
        {score === 0 && lives === 3 && !done && (
          <div className="absolute bottom-32 inset-x-0 flex justify-center pointer-events-none">
            <div className="flex gap-4 animate-bounce">
              <div className="px-5 py-3 bg-white/5 border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">← Tap Left</div>
              <div className="px-5 py-3 bg-white/5 border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Tap Right →</div>
            </div>
          </div>
        )}
      </div>

      {/* ── End screen ── */}
      {done && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm bg-[#151e2e] rounded-[40px] p-8 sm:p-10 text-center shadow-2xl border border-white/8">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl ${won ? 'bg-amber-500' : 'bg-rose-600'}`}>
              {won ? '🏆' : '😔'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 leading-none uppercase italic">{won ? 'Finished!' : 'Missed!'}</h2>
            <p className="text-slate-400 text-[11px] sm:text-sm mb-6 sm:mb-8">{won ? `Amazing! ${score} stars collected.` : `${score} stars — try again?`}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (onComplete) onComplete({
                    isCorrect: won,
                    accuracy: Math.max(0, (WIN - (mistakesRef.current * 5)) / WIN), // Heuristic: mistakes are costly
                    score: score,
                    total: WIN,
                    mistakes: mistakesRef.current,
                    duration: Date.now() - globalStartTimeRef.current,
                    type: 'simulation',
                    engineType: 'HARVEST_GAME'
                  });
                }}
                className="w-full h-14 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-transform"
              >
                Continue Quest →
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
              >
                ↺ Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-8px); }
          80%      { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

HarvestEngine.hideGlobalFooter = true;
export default HarvestEngine;

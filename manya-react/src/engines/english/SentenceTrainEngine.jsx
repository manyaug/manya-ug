import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

/**
 * MANYA ENGLISH — GRAMMAR CONDUCTOR 3.2
 * Cinematic locomotive + word carriages on ONE horizontal scroll track.
 * Words are clearly visible attached directly behind the train.
 */

const CarWheel = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#0f172a" stroke="#475569" strokeWidth="2.5"/>
    <line x1="14" y1="2" x2="14" y2="26" stroke="#334155" strokeWidth="2"/>
    <line x1="2" y1="14" x2="26" y2="14" stroke="#334155" strokeWidth="2"/>
    <line x1="5" y1="5" x2="23" y2="23" stroke="#334155" strokeWidth="1.5"/>
    <line x1="23" y1="5" x2="5" y2="23" stroke="#334155" strokeWidth="1.5"/>
    <circle cx="14" cy="14" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5"/>
    <circle cx="14" cy="14" r="2" fill="#475569"/>
  </svg>
);

const SteamCloud = ({ delay = 0 }) => (
  <div
    className="absolute rounded-full bg-slate-300/20 backdrop-blur-sm pointer-events-none"
    style={{
      width: 28, height: 28,
      animation: `steamUp 2.5s ${delay}s ease-out infinite`,
      top: 0, left: 0,
    }}
  />
);

/* ─────────────────────────────────────────────────────────── */
const SentenceTrainEngine = ({ data, onComplete }) => {
  const questions = useMemo(() => data?.questions || [], [data]);
  const [qIdx, setQIdx]   = useState(0);
  const [pool, setPool]   = useState([]);
  const [train, setTrain] = useState([]);
  const [phase, setPhase] = useState('play'); // 'play' | 'wrong' | 'depart'
  const [score, setScore] = useState(0);
  const trackRef = useRef(null);
  const q = questions[qIdx];

  /* ── init ── */
  const initLevel = useCallback((idx) => {
    if (!questions[idx]) return;
    const words = questions[idx].sentence.split(' ');
    setPool(
      words.map(w => ({ id: `${idx}-${Math.random().toString(36).slice(2)}`, text: w }))
           .sort(() => Math.random() - 0.5)
    );
    setTrain([]);
    setPhase('play');
  }, [questions]);

  useEffect(() => initLevel(qIdx), [qIdx, initLevel]);

  /* ── auto-scroll carriages into view ── */
  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollLeft = trackRef.current.scrollWidth;
  }, [train.length]);

  const couple   = (w) => { if (phase !== 'play') return; setPool(p => p.filter(x => x.id !== w.id)); setTrain(t => [...t, w]); };
  const uncouple = (w) => { if (phase !== 'play') return; setTrain(t => t.filter(x => x.id !== w.id)); setPool(p => [...p, w]); };

  /* ── win check ── */
  useEffect(() => {
    if (pool.length > 0 || train.length === 0 || phase !== 'play') return;
    const ok = train.map(w => w.text).join(' ') === q.sentence;
    if (ok)  { setPhase('depart'); setScore(s => s + 100); setTimeout(() => { if (qIdx + 1 < questions.length) setQIdx(i => i + 1); else onComplete?.(); }, 2500); }
    else     { setPhase('wrong'); }
  }, [pool, train, phase, q, qIdx, questions.length, onComplete]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-white overflow-hidden font-sans select-none">

      {/* ── HEADER ── */}
      <header className="flex-none flex items-center justify-between px-5 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">🚂</div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Grammar Conductor</p>
            <p className="text-sm font-black">{qIdx + 1} / {questions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl">
          <span className="text-amber-400">⭐</span>
          <span className="text-sm font-black tabular-nums">{score}</span>
        </div>
      </header>

      {/* ── SKY ── */}
      <div className="flex-none h-8 relative pointer-events-none overflow-hidden">
        <div className="absolute top-2 left-16 w-20 h-4 bg-white/5 rounded-full" />
        <div className="absolute top-0 right-20 w-14 h-3 bg-white/4 rounded-full" />
      </div>

      {/* ── TRAIN TRACK (horizontal scroll) ── */}
      <div className="flex-none relative" style={{ height: 180 }}>

        {/* Rails (behind everything) */}
        <div className="absolute inset-x-0 z-0" style={{ bottom: 10 }}>
          <div className="w-full h-2.5 bg-gradient-to-b from-slate-500 to-slate-700 shadow-md" />
          <div className="flex gap-7 px-4 py-0.5">
            {Array(20).fill(0).map((_,i) => (
              <div key={i} className="w-10 h-3.5 bg-amber-950 rounded-sm flex-shrink-0 opacity-90" />
            ))}
          </div>
          <div className="w-full h-2.5 bg-gradient-to-b from-slate-500 to-slate-700 shadow-md" />
        </div>

        {/* Scrollable train + carriages */}
        <div
          ref={trackRef}
          className={`absolute inset-0 flex items-end pb-6 pl-3 gap-0 overflow-x-auto z-10 transition-transform duration-[2400ms] ease-in ${phase === 'depart' ? '-translate-x-[200vw]' : 'translate-x-0'}`}
          style={{ scrollbarWidth: 'none' }}
        >
          {/* ═══ LOCOMOTIVE ═══ */}
          <div className="flex-shrink-0 relative" style={{ width: 170, height: 130 }}>
            {/* Steam */}
            <div className="absolute left-12 top-[-16px] flex gap-2" style={{ pointerEvents: 'none' }}>
              {[0, 0.7, 1.4].map((d, i) => (
                <SteamCloud key={i} delay={d} />
              ))}
            </div>

            {/* Chimney */}
            <div className="absolute bg-slate-800 border-2 border-slate-700 rounded-t-xl" style={{ left: 44, top: 0, width: 20, height: 32 }} />

            {/* Cabin */}
            <div
              className="absolute rounded-tl-[28px] rounded-tr-2xl border-t-8 border-indigo-400 shadow-2xl shadow-indigo-500/40"
              style={{ left: 0, top: 28, width: 148, height: 82, background: 'linear-gradient(145deg,#4338ca,#312e81)' }}
            >
              {/* Window */}
              <div className="absolute inset-x-4 top-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center" style={{ height: 38 }}>
                <span className="text-[10px] font-black tracking-[0.35em] text-indigo-300/60">MANYA-01</span>
              </div>
            </div>

            {/* Nose */}
            <div
              className="absolute bg-slate-900 rounded-r-3xl border-r-2 border-slate-700 shadow-xl"
              style={{ right: 0, top: 52, width: 34, height: 48 }}
            >
              {/* Headlight */}
              <div className="absolute w-5 h-5 rounded-full" style={{ right: 2, top: '50%', transform: 'translateY(-50%)', background: '#fde68a', boxShadow: '0 0 10px 4px rgba(253,230,138,0.5)' }} />
            </div>

            {/* Wheels */}
            <div className="absolute flex items-center gap-3" style={{ bottom: 0, left: 6 }}>
              <CarWheel size={36} />
              <CarWheel size={28} />
              <CarWheel size={24} />
            </div>
          </div>

          {/* Loco → tender coupling */}
          <div className="flex-shrink-0 self-center" style={{ width: 16, height: 6, background: '#475569', borderRadius: 3, marginBottom: 24 }} />

          {/* ═══ TENDER (Coal Car) ═══ */}
          <div className="flex-shrink-0" style={{ width: 80, height: 110 }}>
            <div className="relative" style={{ height: 70, marginTop: 10 }}>
              <div
                className="w-full h-full rounded-xl border-2 border-slate-600"
                style={{ background: 'linear-gradient(180deg, #374151, #1f2937)' }}
              >
                {/* Coal */}
                <div className="absolute inset-x-2 -top-2 h-5 bg-slate-950 rounded-full" />
              </div>
              {/* Coupling right */}
              <div className="absolute w-5 h-3 rounded bg-slate-500 -right-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex justify-around px-2 mt-1">
              <CarWheel size={24} />
              <CarWheel size={24} />
            </div>
          </div>

          {/* ═══ WORD CARRIAGES ═══ */}
          {train.map((word, i) => (
            <React.Fragment key={word.id}>
              {/* Coupling chain */}
              <div className="flex-shrink-0 self-center" style={{ width: 14, height: 5, background: '#475569', borderRadius: 3, marginBottom: 24 }} />

              {/* Carriage */}
              <div
                className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                onClick={() => uncouple(word)}
                style={{ width: 96 }}
              >
                {/* Body */}
                <div
                  className="w-full rounded-2xl border-b-4 border-slate-500 flex items-center justify-center shadow-2xl hover:border-rose-500/60 hover:bg-rose-500/10 transition-all group"
                  style={{ height: 64, background: 'linear-gradient(180deg,#e2e8f0,#cbd5e1)' }}
                >
                  <span className="text-[13px] font-black uppercase tracking-widest text-slate-800 text-center leading-tight px-2">
                    {word.text}
                  </span>
                </div>
                {/* Wheels */}
                <div className="flex justify-around px-2 mt-1">
                  <CarWheel size={22} />
                  <CarWheel size={22} />
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Ghost slot */}
          {phase === 'play' && pool.length > 0 && (
            <>
              <div className="flex-shrink-0 self-center" style={{ width: 14, height: 5, background: '#334155', borderRadius: 3, marginBottom: 24, opacity: 0.5 }} />
              <div className="flex-shrink-0" style={{ width: 96 }}>
                <div
                  className="w-full rounded-2xl border-2 border-dashed border-indigo-500/30 flex items-center justify-center animate-pulse"
                  style={{ height: 64, background: 'rgba(99,102,241,0.05)' }}
                >
                  <span className="text-2xl text-indigo-400/30">+</span>
                </div>
                <div className="flex justify-around px-2 mt-1 opacity-30">
                  <CarWheel size={22} />
                  <CarWheel size={22} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── DEPOT PANEL ── */}
      <div className="flex-1 bg-[#161b27] rounded-t-[44px] px-5 pt-6 pb-8 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] z-20 flex flex-col gap-5 overflow-y-auto">

        {/* Wrong banner */}
        {phase === 'wrong' && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-bold text-rose-300 flex-1">Wrong order — uncouple and try again!</p>
            <button
              onClick={() => initLevel(qIdx)}
              className="text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl"
            >
              Reset
            </button>
          </div>
        )}

        {/* Pool words */}
        <div className="flex flex-wrap justify-center gap-3">
          {pool.map(word => (
            <button
              key={word.id}
              onClick={() => couple(word)}
              className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-indigo-600/20 hover:border-indigo-500/40 rounded-2xl text-sm font-black uppercase tracking-wider text-slate-300 hover:text-white active:scale-95 transition-all"
            >
              {word.text}
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl px-4 py-4 mt-auto">
          <span className="text-amber-400 text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Station Master's Tip</p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              {q?.hint || 'Tap words to couple them in the right grammar order, then depart!'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes steamUp {
          0%   { opacity: 0; transform: translateY(0)   scale(0.4); }
          30%  { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(-55px) scale(2.2); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

SentenceTrainEngine.hideGlobalFooter = true;
export default SentenceTrainEngine;

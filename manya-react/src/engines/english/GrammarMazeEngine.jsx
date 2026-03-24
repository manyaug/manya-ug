import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Lightbulb, Trophy, Heart, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, Zap } from 'lucide-react';

/**
 * MANYA ENGLISH: GRAMMAR MAZE ENGINE (React v1.0)
 * ----------------------------------------------
 * - Tile-based maze with moving obstacles (Tigers/Snakes).
 * - Keyboard & D-Pad navigation.
 * - Dynamic answer gates with grammar questions.
 * - Premium glassmorphic HUD and arcade-style feedback.
 */

const GrammarMazeEngine = ({ data, onComplete }) => {
    const levels = useMemo(() => data?.levels || [], [data]);
    const [lvlIdx, setLvlIdx] = useState(0);
    const [playerPos, setPlayerPos] = useState({ r: 0, c: 0 });
    const [lives, setLives] = useState(5);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type, msg }
    const [obstacles, setObstacles] = useState([]);
    const [showFinish, setShowFinish] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    const currentLvl = levels[lvlIdx];
    const maze = currentLvl?.maze || [];
    const rows = maze.length;
    const cols = maze[0]?.length || 0;

    // 1. Initialize Level
    const initLevel = useCallback((idx) => {
        const lvl = levels[idx];
        if (!lvl) return;

        // Find Start
        for (let r = 0; r < lvl.maze.length; r++) {
            for (let c = 0; c < lvl.maze[r].length; c++) {
                if (lvl.maze[r][c] === 2) {
                    setPlayerPos({ r, c });
                    break;
                }
            }
        }

        // Init Obstacles
        setObstacles(lvl.obstacles.map(obs => ({
            ...obs,
            r: obs.path[0].r,
            c: obs.path[0].c,
            step: 0
        })));

        setFeedback(null);
        setIsGameOver(false);
    }, [levels]);

    useEffect(() => { initLevel(lvlIdx); }, [lvlIdx, initLevel]);

    // 2. Obstacle Movement
    useEffect(() => {
        if (isGameOver || showFinish) return;

        const interval = setInterval(() => {
            setObstacles(prev => prev.map(obs => {
                const nextStep = (obs.step + 1) % obs.path.length;
                const nextPos = obs.path[nextStep];
                
                // Collision check with player
                if (nextPos.r === playerPos.r && nextPos.c === playerPos.c) {
                    handleHit();
                }
                
                return { ...obs, r: nextPos.r, c: nextPos.c, step: nextStep };
            }));
        }, 600);

        return () => clearInterval(interval);
    }, [playerPos, isGameOver, showFinish]);

    // 3. Game Logic
    const handleHit = useCallback(() => {
        setLives(l => {
            const next = Math.max(0, l - 1);
            if (next === 0) setIsGameOver(true);
            return next;
        });
        setFeedback({ type: 'error', msg: 'OUCH! Watch out!' });
        window.ManyaAudio?.error?.();
        
        // Reset player to start
        const lvl = levels[lvlIdx];
        for (let r = 0; r < lvl.maze.length; r++) {
            for (let c = 0; c < lvl.maze[r].length; c++) {
                if (lvl.maze[r][c] === 2) {
                    setPlayerPos({ r, c });
                    break;
                }
            }
        }
    }, [levels, lvlIdx]);

    const attemptMove = useCallback((dr, dc) => {
        if (isGameOver || showFinish || feedback?.type === 'success') return;

        const nr = playerPos.r + dr;
        const nc = playerPos.c + dc;

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || maze[nr][nc] === 1) return;

        setPlayerPos({ r: nr, c: nc });

        // Check Answer Gate
        const gate = currentLvl.answers.find(ans => ans.r === nr && ans.c === nc);
        if (gate) {
            if (gate.isCorrect) {
                setScore(s => s + 250);
                setFeedback({ type: 'success', msg: '🌟 CORRECT!' });
                window.ManyaAudio?.success?.();
                setTimeout(() => {
                    if (lvlIdx < levels.length - 1) setLvlIdx(i => i + 1);
                    else setShowFinish(true);
                }, 1000);
            } else {
                handleHit();
            }
        }

        // Check Obstacle collision again (just in case)
        if (obstacles.some(obs => obs.r === nr && obs.c === nc)) {
            handleHit();
        }
    }, [playerPos, rows, cols, maze, currentLvl, obstacles, isGameOver, showFinish, feedback, handleHit, lvlIdx, levels.length]);

    // 4. Input Handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp': case 'w': attemptMove(-1, 0); break;
                case 'ArrowDown': case 's': attemptMove(1, 0); break;
                case 'ArrowLeft': case 'a': attemptMove(0, -1); break;
                case 'ArrowRight': case 'd': attemptMove(0, 1); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [attemptMove]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* Header HUD */}
            <div className="flex-none p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        <Zap size={12} className="animate-pulse" /> Level {lvlIdx + 1}
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>
                            {Array(lives).fill(0).map((_, i) => <Heart key={i} size={12} fill="currentColor" />)}
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                            {score}
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-3xl border text-center transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <p className="text-xs font-black leading-tight uppercase tracking-tight">
                        {currentLvl?.question}
                    </p>
                </div>
            </div>

            {/* Maze Area */}
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                <div 
                    className={`relative grid p-1 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
                    style={{ 
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        width: 'min(90vw, 400px)',
                        aspectRatio: `${cols}/${rows}`
                    }}
                >
                    {maze.map((row, r) => row.map((tile, c) => {
                        const gate = currentLvl.answers.find(ans => ans.r === r && ans.c === c);
                        const isWall = tile === 1;
                        return (
                            <div 
                                key={`${r}-${c}`}
                                className={`relative flex items-center justify-center text-[8px] font-black text-center border-[0.5px] border-black/5 ${isWall ? (isDark ? 'bg-slate-900' : 'bg-slate-400') : ''} ${gate ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700') : ''}`}
                            >
                                {gate?.text}
                            </div>
                        );
                    }))}

                    {/* Moving Obstacles */}
                    {obstacles.map((obs, i) => (
                        <div 
                            key={i}
                            className="absolute z-10 text-lg transition-all duration-500 ease-linear flex items-center justify-center"
                            style={{ 
                                width: `${100/cols}%`, 
                                height: `${100/rows}%`,
                                transform: `translate(${obs.c * 100}%, ${obs.r * 100}%)`
                            }}
                        >
                            {obs.type === 'TIGER' ? '🐅' : '🐍'}
                        </div>
                    ))}

                    {/* Player */}
                    <div 
                        className="absolute z-20 transition-all duration-200 ease-out flex items-center justify-center"
                        style={{ 
                            width: `${100/cols}%`, 
                            height: `${100/rows}%`,
                            transform: `translate(${playerPos.c * 100}%, ${playerPos.r * 100}%)`
                        }}
                    >
                        <div className="w-4/5 h-4/5 bg-indigo-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                            <span className="text-[10px]">👤</span>
                        </div>
                    </div>
                </div>

                {/* Feedback Toast */}
                {feedback && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-300">
                        <div className={`px-6 py-3 rounded-2xl font-black text-sm shadow-2xl border-2 ${feedback.type === 'success' ? 'bg-emerald-500 border-white text-white' : 'bg-rose-500 border-white text-white'}`}>
                            {feedback.msg}
                        </div>
                    </div>
                )}
            </div>

            {/* D-Pad Controls */}
            <div className={`p-6 pb-10 flex flex-col items-center shrink-0 ${isDark ? 'bg-[#0B0E14]' : 'bg-slate-50'}`}>
                <div className="grid grid-cols-3 gap-2">
                    <div />
                    <button onClick={() => attemptMove(-1, 0)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-200 dark:border-white/10">
                        <ChevronUp size={24} />
                    </button>
                    <div />
                    <button onClick={() => attemptMove(0, -1)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-200 dark:border-white/10">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => attemptMove(1, 0)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-200 dark:border-white/10">
                        <ChevronDown size={24} />
                    </button>
                    <button onClick={() => attemptMove(0, 1)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-200 dark:border-white/10">
                        <ChevronRight size={24} />
                    </button>
                </div>
                
                {data?.hint && (
                    <div className="mt-8 flex items-center gap-3 px-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Lightbulb size={16} />
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {data.hint}
                        </p>
                    </div>
                )}
            </div>

            {/* Finish/Fail Overlays */}
            {(showFinish || isGameOver) && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 scale-in-center">
                        <div className={`w-24 h-24 rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12 ${showFinish ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {showFinish ? <Trophy size={48} /> : <AlertCircle size={48} />}
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">
                            {showFinish ? 'Maze Runner!' : 'Game Over'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                            Final Score: {score} pts
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Continue Quest
                            </button>
                            <button 
                                onClick={() => { setLvlIdx(0); setLives(5); setScore(0); setShowFinish(false); setIsGameOver(false); }}
                                className="w-full h-14 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-indigo-500 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

GrammarMazeEngine.hideGlobalFooter = true;
export default GrammarMazeEngine;

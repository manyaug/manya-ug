import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Lightbulb, Trophy, Search, RefreshCw, ArrowRight, Timer, Sparkles } from 'lucide-react';

/**
 * MANYA ENGLISH: WORD GRID ENGINE (React v1.0)
 * -------------------------------------------
 * - Dynamic grid generation with word placement logic.
 * - Multi-directional word search (H, V, D, Reverse).
 * - Smooth drag-to-select interaction (Mouse & Touch).
 * - Premium glassmorphic HUD and dark mode support.
 */

const WordGridEngine = ({ data, onComplete }) => {
    const gridSize = data?.size || 8;
    const rawWords = useMemo(() => {
        if (!data?.words) return ["MANYA", "LEARN", "APP"];
        return data.words.map(w => (typeof w === 'string' ? w : w.word).toUpperCase());
    }, [data]);

    const [grid, setGrid] = useState([]);
    const [foundWords, setFoundWords] = useState(new Set());
    const [selection, setSelection] = useState([]); // [{r, c}, ...]
    const [isSelecting, setIsSelecting] = useState(false);
    const [score, setScore] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const containerRef = useRef(null);

    // 1. Grid Generation Logic
    const initGrid = useCallback(() => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const newGrid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(''));
        const directions = [
            {r: 0, c: 1}, {r: 1, c: 0}, {r: 1, c: 1}, {r: 1, c: -1},
            {r: 0, c: -1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: -1, c: 1}
        ];

        const placementWords = [...rawWords].sort((a, b) => b.length - a.length);
        
        // --- Solvability Guard: Retry until ALL words are placed ---
        let allPlaced = false;
        let gridAttempts = 0;

        while (!allPlaced && gridAttempts < 50) {
            gridAttempts++;
            newGrid.forEach(row => row.fill('')); // Reset grid
            allPlaced = true;

            for (const word of placementWords) {
                const letters = word.replace(/[^A-Z]/g, '').toUpperCase().split('');
                let wordPlaced = false;
                let wordAttempts = 0;

                while (!wordPlaced && wordAttempts < 100) {
                    wordAttempts++;
                    const startR = Math.floor(Math.random() * gridSize);
                    const startC = Math.floor(Math.random() * gridSize);
                    const dir = directions[Math.floor(Math.random() * directions.length)];

                    let possible = true;
                    for (let i = 0; i < letters.length; i++) {
                        const r = startR + i * dir.r;
                        const c = startC + i * dir.c;
                        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize || (newGrid[r][c] !== '' && newGrid[r][c] !== letters[i])) {
                            possible = false;
                            break;
                        }
                    }

                    if (possible) {
                        for (let i = 0; i < letters.length; i++) {
                            newGrid[startR + i * dir.r][startC + i * dir.c] = letters[i];
                        }
                        wordPlaced = true;
                    }
                }
                if (!wordPlaced) {
                    allPlaced = false;
                    break; // Trigger grid restart
                }
            }
        }

        // Fill remaining with random letters
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (newGrid[r][c] === '') newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
        setGrid(newGrid);
        setFoundWords(new Set());
        setFoundCoords(new Set());
        setScore(0);
        setSeconds(0);
        setShowFinish(false);
    }, [gridSize, rawWords]);

    useEffect(() => { 
        initGrid(); 
        window.QuestRunner?.setIsTyping?.(false);
    }, [initGrid]);

    // 2. Timer & Theme
    useEffect(() => {
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // 3. Selection Logic
    const getPosFromEvent = (e) => {
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.dataset.r !== undefined) {
            return { r: parseInt(target.dataset.r), c: parseInt(target.dataset.c) };
        }
        return null;
    };

    const handleStart = (e) => {
        const pos = getPosFromEvent(e);
        if (pos) {
            setIsSelecting(true);
            setSelection([pos]);
        }
    };

    const handleMove = (e) => {
        if (!isSelecting) return;
        const pos = getPosFromEvent(e);
        if (!pos) return;

        const first = selection[0];
        if (!first || (first.r === pos.r && first.c === pos.c && selection.length === 1)) return;

        // Calculate deltas
        const dr = pos.r - first.r;
        const dc = pos.c - first.c;
        const absDR = Math.abs(dr);
        const absDC = Math.abs(dc);

        // Check for straight lines (Horizontal, Vertical, 45 degree Diagonal)
        const isHorizontal = dr === 0;
        const isVertical = dc === 0;
        const isDiagonal = absDR === absDC;

        if (isHorizontal || isVertical || isDiagonal) {
            const steps = Math.max(absDR, absDC);
            const stepR = dr === 0 ? 0 : dr / absDR;
            const stepC = dc === 0 ? 0 : dc / absDC;

            const newSelection = [];
            for (let i = 0; i <= steps; i++) {
                newSelection.push({
                    r: first.r + i * stepR,
                    c: first.c + i * stepC
                });
            }
            setSelection(newSelection);
        }
    };

    const [foundCoords, setFoundCoords] = useState(new Set()); // Set of "r,c" strings

    // 4. Render Helpers
    const isCellSelected = (r, c) => selection.some(p => p.r === r && p.c === c);
    const isCellFound = (r, c) => foundCoords.has(`${r},${c}`);

    const handleEnd = () => {
        if (!isSelecting) return;
        setIsSelecting(false);

        const word = selection.map(p => grid[p.r][p.c]).join('');
        const revWord = word.split('').reverse().join('');
        
        const matched = rawWords.find(w => {
            const clean = w.replace(/[^A-Z]/g, '').toUpperCase();
            return clean === word || clean === revWord;
        });
        
        if (matched && !foundWords.has(matched)) {
            const newFound = new Set(foundWords);
            newFound.add(matched);
            setFoundWords(newFound);
            
            // Add coordinates to permanent highlights
            const newCoords = new Set(foundCoords);
            selection.forEach(p => newCoords.add(`${p.r},${p.c}`));
            setFoundCoords(newCoords);

            setScore(s => s + 10);
            window.ManyaAudio?.success?.();
            if (newFound.size === rawWords.length) setTimeout(() => setShowFinish(true), 800);
        } else if (selection.length > 1) {
            window.ManyaAudio?.error?.();
        }
        setSelection([]);
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* Header HUD */}
            <div className="flex-none p-4 sm:p-6 pb-2">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-[15px] sm:rounded-2xl text-[9px] sm:text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <Search size={12} className="animate-pulse" /> Word Search
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-500 shadow-sm border border-slate-100'}`}>
                            <Timer size={12} /> {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                        </div>
                        <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'}`}>
                            {score}
                        </div>
                    </div>
                </div>

                {/* Target Word List - Premium Pills */}
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-4 max-w-xl mx-auto">
                    {rawWords.map((word, i) => (
                        <div 
                            key={i} 
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${foundWords.has(word) ? 'bg-emerald-500 text-white scale-90 opacity-40 translate-y-1' : (isDark ? 'bg-white/5 text-slate-200 border border-white/10 shadow-xl' : 'bg-white text-slate-700 border border-slate-200 shadow-lg shadow-slate-200/50')}`}
                        >
                            {word}
                            {foundWords.has(word) && <Sparkles size={8} className="inline ml-1 mb-0.5" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid Area */}
            <div 
                className="flex-1 flex items-center justify-center p-3 sm:p-6 touch-none overflow-hidden"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            >
                <div 
                    className={`grid gap-0.5 sm:gap-1 w-full max-w-[340px] sm:max-w-[420px] aspect-square p-2 sm:p-2.5 rounded-[30px] sm:rounded-[40px] shadow-3xl transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/10 shadow-indigo-500/5' : 'bg-white border-2 border-slate-200 shadow-slate-300/50'}`}
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                    {grid.map((row, r) => row.map((char, c) => {
                        const selected = isCellSelected(r, c);
                        const found = isCellFound(r, c);
                        return (
                            <div 
                                key={`${r}-${c}`}
                                data-r={r}
                                data-c={c}
                                className={`flex items-center justify-center rounded-lg sm:rounded-xl text-[13px] sm:text-[15px] font-black transition-all duration-300 select-none pointer-events-auto ${selected ? 'bg-indigo-600 text-white scale-110 z-20 shadow-xl rotate-3' : (found ? 'bg-emerald-500/20 text-emerald-500 scale-95' : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'))}`}
                            >
                                {char}
                            </div>
                        );
                    }))}
                </div>
            </div>

            <div className="p-6 text-center">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Drag to Connect Letters
                </p>
            </div>

            {/* Finish Overlay */}
            {showFinish && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 sm:p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-8 sm:p-10 rounded-[40px] sm:rounded-[45px] shadow-3xl border border-white/10 scale-in-center max-w-xs w-full">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600 text-white rounded-[30px] sm:rounded-[35px] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl rotate-12">
                            <Trophy size={40} className="sm:hidden" />
                            <Trophy size={48} className="hidden sm:block" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Success!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-base">
                            Final Score: {score} pts
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-14 sm:h-16 bg-indigo-600 text-white rounded-2xl font-black text-[10px] sm:text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Continue <ArrowRight size={20} strokeWidth={4} />
                            </button>
                            <button 
                                onClick={initGrid}
                                className="w-full h-12 text-slate-500 font-black text-[9px] sm:text-[10px] tracking-widest uppercase hover:text-indigo-500 transition-colors"
                            >
                                ↺ Play Again
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

WordGridEngine.hideGlobalFooter = true;
export default WordGridEngine;

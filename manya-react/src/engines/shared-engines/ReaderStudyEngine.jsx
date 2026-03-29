import React, { useState, useEffect, useRef } from 'react';
import { 
    BookOpen, 
    Lightbulb, 
    AlertTriangle, 
    CheckCircle2, 
    ChevronRight,
    Trophy,
    RotateCcw,
    Zap
} from 'lucide-react';

/**
 * ReaderStudyEngine - React Migration
 * Features:
 * - Bento Layout: Content cards with fluid entry animations.
 * - Scroll Progress: Top-mounted progress bar.
 * - Flashcards: Interactive term/fact/mnemonic cards.
 * - Subject-Aware: Dynamic accents based on subject.
 */
export function ReaderStudyEngine({ data, onComplete, onResult }) {
    const [isVisible, setIsVisible] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight <= clientHeight) {
            setScrollProgress(100);
            return;
        }
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(progress);
    };

    useEffect(() => {
        setIsVisible(true);
        // Initial check if content is small
        if (containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight <= clientHeight) setScrollProgress(100);
        }
    }, [data]);

    if (!data) return <div className="p-8 text-center opacity-50">No content available.</div>;

    const getAccent = () => {
        if (data.themeColor) return data.themeColor;
        const sub = (data.subject || '').toLowerCase();
        if (sub.includes('science')) return '#7c3aed';
        if (sub.includes('english')) return '#3b82f6';
        if (sub.includes('math')) return '#ef4444';
        if (sub.includes('sst')) return '#f59e0b';
        return '#7c3aed';
    };

    const accent = getAccent();

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-y-auto transition-colors duration-700 scroll-smooth pb-40"
            style={{ '--accent-color': accent }}
            onScroll={handleScroll}
        >
            {/* PROGRESS BAR */}
            <div className="fixed top-0 left-0 right-0 h-2 bg-transparent z-[3000] overflow-hidden">
                <div 
                    className="h-full bg-[var(--accent-color)] transition-all duration-300 ease-out shadow-[0_4px_15px_var(--accent-color)] rounded-r-full"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            <div className="max-w-[800px] mx-auto p-4 sm:p-8 md:p-16">
                
                {/* HEADER - Responsive Typography */}
                <header className={`mb-12 md:mb-20 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--accent-color)] text-white shadow-lg flex items-center justify-center transform rotate-3">
                            <BookOpen size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] md:text-[11px] font-black text-[var(--accent-color)] tracking-[0.3em] uppercase opacity-70">
                                {data.variantTitle || data.subject || 'MASTER CLASS'}
                            </span>
                            <div className="h-0.5 w-8 bg-[var(--accent-color)] rounded-full mt-1 opacity-30" />
                        </div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-[var(--text-main)] leading-[1.1] tracking-tight mb-6">
                        {data.topic || 'Concept Study'}
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--text-sub)] font-medium opacity-60 leading-relaxed max-w-[500px]">
                        Dive deep into the core principles of this unit with Manya's premium study guides.
                    </p>
                </header>

                {/* CONTENT BENTO - Adaptive Spacing */}
                <div className="flex flex-col gap-8 md:gap-14">
                    {(data.sections || []).map((sec, idx) => (
                        <div 
                            key={idx}
                            className={`transition-all duration-1000 ease-out`}
                            style={{ 
                                transitionDelay: `${200 + idx * 100}ms`,
                                opacity: isVisible ? 1 : 0,
                                transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
                            }}
                        >
                            <SectionRenderer section={sec} accent={accent} index={idx} />
                        </div>
                    ))}
                </div>

                {/* FLASHCARDS SECTION */}
                {data.cards && data.cards.length > 0 && (
                    <div className={`mt-24 md:mt-32 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                        <div className="flex flex-col items-center gap-4 mb-12 text-center px-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-[1.5rem] bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner mb-2">
                                <Zap size={24} className="animate-pulse" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight">Rapid Recall Cards</h2>
                            <p className="text-[10px] md:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Tap to flip & test your knowledge</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                            {data.cards.map((card, i) => (
                                <Flashcard key={i} card={card} accent={accent} />
                            ))}
                        </div>
                    </div>
                )}

                {/* FINISH ACTIONS */}
                <div 
                    className={`mt-32 md:mt-48 transition-all duration-1000 delay-700 flex flex-col items-center ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                >
                    <button 
                        onClick={() => {
                            if (onResult) {
                                onResult({
                                    isCorrect: true,
                                    score: 1,
                                    total: 1,
                                    type: 'study'
                                });
                            }
                            onComplete();
                        }}
                        className="w-full h-24 md:h-28 rounded-[2.5rem] md:rounded-[3.5rem] bg-[var(--accent-color)] text-white font-black text-xl md:text-3xl shadow-[0_20px_40px_-10px_rgba(124,58,237,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-6 md:gap-8 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        READ & FINISH
                        <ChevronRight size={32} className="group-hover:translate-x-3 transition-transform duration-500" />
                    </button>
                    
                    <div className="mt-12 flex flex-col items-center gap-3">
                         <div className="flex gap-1.5">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
                            ))}
                         </div>
                         <span className="text-[10px] font-black text-[var(--text-main)] tracking-[0.3em] uppercase opacity-40">
                            Unit Mastered • 100% Progress
                         </span>
                    </div>
                </div>

            </div>

            <style>{`
                :root {
                    --bg-main: #ffffff;
                .reader-study-root {
                    background: var(--bg-main);
                    color: var(--text-main);
                }
                
                [data-theme='dark'] .reader-study-root {
                    --bg-main: #0B0E14;
                    --bg-card: #1f2937;
                    --text-main: #f8fafc;
                    --text-sub: #d1d5db;
                    --text-muted: #9ca3af;
                    --border-subtle: #374151;
                    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12);
                }

                .bento-section {
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-subtle);
                    border-radius: 32px;
                    padding: 32px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.5s ease;
                }

                @media (min-width: 768px) {
                    .bento-section { border-radius: 48px; padding: 56px; }
                    .bento-section:hover { transform: translateY(-8px); border-color: var(--accent-color); }
                }

                .p-point-v2 {
                    display: flex; gap: 16px; padding: 20px;
                    background: var(--bg-main); border: 1.5px solid var(--border-subtle);
                    border-radius: 24px; transition: all 0.3s ease;
                }
                
                @media (min-width: 768px) {
                    .p-point-v2 { gap: 24px; padding: 32px; border-radius: 32px; }
                    .p-point-v2:hover { border-color: var(--accent-color); transform: scale(1.02); background: var(--bg-card); }
                }
                
                .p-marker-v2 {
                    width: 32px; height: 32px; border-radius: 10px;
                    background: var(--accent-color); color: white;
                    display: flex; items-center; justify-content: center;
                    font-weight: 900; font-size: 14px; flex-shrink: 0;
                    box-shadow: 0 5px 15px -3px var(--accent-color);
                }
                
                @media (min-width: 768px) {
                    .p-marker-v2 { width: 42px; height: 42px; border-radius: 14px; font-size: 16px; transform: rotate(-10deg); }
                }

                .flashcard-root { perspective: 1200px; width: 100%; }
                .flashcard-inner {
                    position: relative; width: 100%; height: 320px;
                    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    transform-style: preserve-3d; cursor: pointer;
                }
                
                @media (min-width: 768px) { .flashcard-inner { height: 360px; } }
                
                .flashcard-inner.flipped { transform: rotateY(180deg); }
                .card-face {
                    position: absolute; width: 100%; height: 100%;
                    backface-visibility: hidden; border-radius: 32px;
                    display: flex; flex-direction: column; items-center; justify-content: center;
                    padding: 32px; text-align: center; border: 2.5px solid var(--border-subtle);
                    box-shadow: var(--shadow-md); overflow: hidden;
                }
                
                @media (min-width: 768px) { .card-face { border-radius: 48px; padding: 48px; } }
                
                .card-front { background: var(--bg-card); z-index: 2; }
                .card-back { transform: rotateY(180deg); background: var(--bg-main); border-color: var(--accent-color); }
                
                .comparison-table-wrap {
                    border-radius: 24px; overflow-x: auto;
                    border: 1.5px solid var(--border-subtle);
                    background: var(--bg-main);
                }
            `}</style>
        </div>
    );
}

function SectionRenderer({ section, accent, index }) {
    if (section.type === 'bullets') {
        return (
            <div className="bento-section">
                <div className="flex items-center gap-2 mb-6 md:mb-10">
                    <div className="w-1.5 h-6 rounded-full bg-[var(--accent-color)]" />
                    <span className="text-[10px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase opacity-60">
                        SECTION {index + 1}
                    </span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-5xl font-black text-[var(--text-main)] mb-6 md:mb-10 tracking-tight leading-tight">
                    {section.title}
                </h3>
                <div className="flex flex-col gap-4 md:gap-6">
                    {section.points.map((p, i) => (
                        <div key={i} className="p-point-v2 group/point">
                            <div className="p-marker-v2 transition-transform duration-500">{i + 1}</div>
                            <div 
                                className="text-[var(--text-sub)] font-bold text-base md:text-xl leading-relaxed mt-0.5"
                                dangerouslySetInnerHTML={{ __html: p }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (section.type === 'comparison') {
        return (
            <div className="bento-section">
                <div className="flex items-center gap-3 mb-8 md:mb-10">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center">
                        <RotateCcw size={16} />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-main)] tracking-[0.2em] uppercase opacity-40">
                        MATRIX
                    </span>
                </div>
                <h3 className="text-2xl md:text-4xl font-black text-[var(--text-main)] mb-8 md:mb-10 tracking-tight">
                    {section.title}
                </h3>
                <div className="comparison-table-wrap">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                        <thead>
                            <tr className="bg-[var(--text-main)] text-white">
                                <th className="p-4 md:p-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest">METRIC</th>
                                <th className="p-4 md:p-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">{section.itemA}</th>
                                <th className="p-4 md:p-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">{section.itemB}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {section.rows.map((row, i) => (
                                <tr key={i} className="border-t border-[var(--border-subtle)]">
                                    <td 
                                        className="p-4 md:p-6 text-[10px] font-black text-[var(--accent-color)] uppercase"
                                        dangerouslySetInnerHTML={{ __html: row.feature }}
                                    />
                                    <td 
                                        className="p-4 md:p-6 text-sm md:text-lg font-bold text-[var(--text-main)] text-center"
                                        dangerouslySetInnerHTML={{ __html: row.valA }}
                                    />
                                    <td 
                                        className="p-4 md:p-6 text-sm md:text-lg font-bold text-[var(--text-main)] text-center"
                                        dangerouslySetInnerHTML={{ __html: row.valB }}
                                    />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (section.type === 'tip' || section.type === 'warning') {
        const isWarning = section.type === 'warning';
        return (
            <div className={`p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border-l-[12px] md:border-l-[24px] flex flex-col md:flex-row items-start gap-6 md:gap-12 shadow-xl ${
                isWarning 
                ? 'bg-rose-50/50 border-rose-500 text-rose-950 shadow-rose-500/5' 
                : 'bg-amber-50/50 border-amber-400 text-amber-950 shadow-amber-400/5'
            }`}>
                <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-xl rotate-3 shrink-0 ${
                    isWarning ? 'bg-rose-500' : 'bg-amber-400'
                }`}>
                    {isWarning ? <AlertTriangle size={32} /> : <Lightbulb size={32} />}
                </div>
                <div className="flex flex-col gap-2 md:gap-4">
                    <span className={`text-[10px] md:text-[12px] font-black tracking-[0.2em] uppercase ${
                        isWarning ? 'text-rose-600' : 'text-amber-700'
                    }`}>
                        {isWarning ? 'URGENT' : 'PRO TIP'}
                    </span>
                    <p 
                        className="text-2xl md:text-4xl font-black leading-[1.2] tracking-tighter"
                        dangerouslySetInnerHTML={{ __html: section.text }}
                    />
                </div>
            </div>
        );
    }

    return null;
}

function Flashcard({ card, accent }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="flashcard-root" onClick={() => setFlipped(!flipped)}>
            <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
                {/* FRONT */}
                <div className="card-face card-front">
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-4 bg-[var(--accent-color)]/5 text-[var(--accent-color)] rounded-2xl opacity-40">
                             <RotateCcw size={28} />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">TERM</h4>
                        <span 
                            className="text-2xl md:text-4xl font-black text-[var(--text-main)] tracking-tighter leading-tight"
                            dangerouslySetInnerHTML={{ __html: card.term }}
                        />
                    </div>
                </div>
                {/* BACK */}
                <div className="card-face card-back">
                    <div className="flex flex-col gap-6 items-center">
                        <p 
                            className="text-lg md:text-xl font-bold text-[var(--text-main)] leading-relaxed text-center px-4"
                            dangerouslySetInnerHTML={{ __html: card.fact }}
                        />
                        {card.mnemonic && (
                            <div className="p-5 bg-white/40 rounded-3xl border border-[var(--accent-color)]/20 italic text-sm text-[var(--text-sub)] font-medium leading-relaxed">
                                <div dangerouslySetInnerHTML={{ __html: card.mnemonic }} />
                            </div>
                        )}
                        <div className="mt-4 px-4 py-1.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-black tracking-widest uppercase">
                            GOT IT!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReaderStudyEngine;

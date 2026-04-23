import React, { useState } from 'react';
import { 
    BookOpen, 
    Lightbulb, 
    AlertTriangle, 
    ChevronRight,
    RotateCcw,
    Zap
} from 'lucide-react';

export function Flashcard({ card, accent }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="flashcard-root" onClick={() => setFlipped(!flipped)}>
            <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
                <div className="card-face card-front">
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-4 bg-[var(--accent-color)]/5 text-[var(--accent-color)] rounded-2xl opacity-40">
                             <RotateCcw size={28} />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">TERM</h4>
                        <span 
                            className="text-xl md:text-3xl font-black text-[var(--text-main)] tracking-tighter leading-tight mt-2"
                            dangerouslySetInnerHTML={{ __html: card.term }}
                        />
                    </div>
                </div>
                <div className="card-face card-back">
                    <div className="flex flex-col gap-6 items-center">
                        <p 
                            className="text-base md:text-lg font-bold text-[var(--text-main)] leading-relaxed text-center px-4"
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

export function SectionRenderer({ section, accent, index }) {
    if (section.type === 'bullets') {
        return (
            <div className="bento-section">
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <div className="w-1.5 h-6 rounded-full bg-[var(--accent-color)]" />
                    <span className="text-[10px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase opacity-60">
                        SECTION {index + 1}
                    </span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-main)] mb-6 tracking-tight leading-tight">
                    {section.title}
                </h3>
                <div className="flex flex-col gap-4 md:gap-6">
                    {section.points.map((p, i) => (
                        <div key={i} className="p-point-v2 group/point">
                            <div className="p-marker-v2 transition-transform duration-500">{i + 1}</div>
                            <div 
                                className="text-[var(--text-sub)] font-bold text-base md:text-xl leading-relaxed mt-0.5 flex-1 min-w-0 break-words"
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

export default function ReaderRenderer({
    refContainer,
    data,
    accent,
    isVisible,
    onScroll,
    onComplete
}) {
    return (
        <div 
            ref={refContainer}
            className="reader-study-root relative w-full h-full block bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-y-auto overflow-x-hidden transition-colors duration-700 scroll-smooth"
            style={{ 
                '--accent-color': accent,
                scrollbarGutter: 'stable',
                WebkitOverflowScrolling: 'touch'
            }}
            onScroll={onScroll}
        >
            <div className="w-full max-w-[800px] mx-auto p-4 sm:p-8 md:p-12">
                <header className={`mb-8 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-color)] text-white flex items-center justify-center">
                            <BookOpen size={16} />
                        </div>
                        <span className="text-[10px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase opacity-80">
                            {data.variantTitle || data.subject || 'MASTER CLASS'}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] leading-tight tracking-tight mb-3">
                        {data.topic || 'Concept Study'}
                    </h1>
                    <p className="text-base text-[var(--text-sub)] font-medium opacity-80 leading-relaxed max-w-[600px]">
                        Dive deep into the core principles of this unit with Manya's premium study guides.
                    </p>
                </header>

                <div className="flex flex-col gap-6 md:gap-8">
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

                {data.cards && data.cards.length > 0 && (
                    <div className={`mt-24 md:mt-32 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                        <div className="flex flex-col items-center gap-4 mb-12 text-center px-4">
                            <div className="w-10 h-10 rounded-[1rem] bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                                <Zap size={18} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-[var(--text-main)] tracking-tight">Rapid Recall Cards</h2>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tap to flip & test your knowledge</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {data.cards.map((card, i) => (
                                <Flashcard key={i} card={card} accent={accent} />
                            ))}
                        </div>
                    </div>
                )}

                <div className={`mt-16 flex justify-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <button 
                        onClick={onComplete}
                        className="h-14 px-10 rounded-2xl bg-[var(--accent-color)] text-white font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        COMPLETE READING <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <style>{`
                .reader-study-root {
                    --bg-main: #ffffff; --bg-card: #f9fafb; --text-main: #0f172a; --text-sub: #475569;
                    --text-muted: #94a3b8; --border-subtle: #e2e8f0; --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    color: var(--text-main);
                }
                [data-theme='dark'] .reader-study-root {
                    --bg-main: #0B0E14; --bg-card: #161a23; --text-main: #f8fafc; --text-sub: #94a3b8;
                    --text-muted: #64748b; --border-subtle: #1e293b; --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                }
                .bento-section { position: relative; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 24px; width: 100%; }
                .bento-section:last-child { border-bottom: none; }
                .p-point-v2 { display: flex; gap: 16px; align-items: flex-start; transition: all 0.3s ease; margin-bottom: 24px; width: 100%; }
                .p-marker-v2 { width: 24px; height: 24px; border-radius: 8px; background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
                .flashcard-root { perspective: 1200px; width: 100%; height: 100%; }
                .flashcard-inner { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); transform-style: preserve-3d; cursor: pointer; }
                .flashcard-inner.flipped { transform: rotateY(180deg); }
                .card-face { grid-column: 1 / 2; grid-row: 1 / 2; backface-visibility: hidden; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; border: 2px solid var(--border-subtle); box-shadow: var(--shadow-md); }
                .card-front { background: var(--bg-card); z-index: 2; }
                .card-back { transform: rotateY(180deg); background: var(--bg-main); border-color: var(--accent-color); }
                .comparison-table-wrap { border-radius: 24px; overflow-x: auto; border: 1.5px solid var(--border-subtle); background: var(--bg-main); }
            `}</style>
        </div>
    );
}

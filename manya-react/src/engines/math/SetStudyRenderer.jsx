import React from 'react';
import { ChevronLeft, ChevronRight, Orbit } from 'lucide-react';
import { THEMES } from './SetStudyLogic';

/**
 * SET STUDY RENDERER
 * Handles the visual presentation, canvas drawing, and interaction UI.
 */
const SetStudyRenderer = ({
  stepIdx,
  slides,
  isDark,
  visitedIndices,
  canvasRef,
  containerRef,
  hPrev,
  hNext,
  topic
}) => {
  const currentSlide = slides[stepIdx] || { title: "Concept Study", text: "Explore the details of this topic below." };
  const isLast = stepIdx === slides.length - 1;
  const allSeen = visitedIndices.size === slides.length;
  const theme = isDark ? THEMES.dark : THEMES.light;

  return (
    <div ref={containerRef} className={`flex flex-col h-full max-h-full ${theme.bg} font-jakarta transition-colors duration-500 overflow-hidden`}>
      {/* 1. STAGE */}
      <div className={`h-[38%] min-h-[220px] relative bg-gradient-to-b ${theme.stage} border-b-2 ${theme.b} flex-shrink-0`}>
         <canvas ref={canvasRef} className="w-full h-full" />
         
         <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            <div className={`px-3 py-1.5 rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-glow-indigo' : 'bg-white/80 backdrop-blur-md text-indigo-600 border border-indigo-100 shadow-premium-sm'}`}>
                <Orbit size={12} className="animate-spin-slow" /> {typeof topic === 'object' ? topic.label : (topic || 'Set Theory')}
            </div>
            <div className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold ${isDark ? 'bg-slate-800/80 text-slate-500' : 'bg-white/80 backdrop-blur-md text-slate-400 shadow-premium-sm'}`}>
                {stepIdx + 1} / {slides.length}
            </div>
         </div>

         <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden z-20">
            <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-1000 ease-spring" style={{ width: `${((stepIdx + 1) / slides.length) * 100}%` }} />
         </div>
      </div>

      {/* 2. LESSON CARD */}
      <div className={`flex-1 min-h-0 flex flex-col ${theme.card} relative z-10 shadow-up`}>
         <div className="flex-1 min-h-0 overflow-y-auto px-7 py-10 no-scrollbar">
            <h2 className={`text-2xl font-black mb-5 leading-tight ${theme.text} tracking-tighter`}>{currentSlide.title}</h2>
            <div className={`text-[1.125rem] leading-[1.8] font-semibold ${theme.sub} prose-premium`} dangerouslySetInnerHTML={{ __html: currentSlide.text }} />
         </div>

         {/* 3. CONTROLS */}
         <div className={`p-5 flex gap-4 border-t ${theme.b} bg-inherit flex-shrink-0`}>
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

export default SetStudyRenderer;

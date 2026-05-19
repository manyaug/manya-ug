import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Check, ChevronDown, Hash, FunctionSquare, Languages } from 'lucide-react';
import { IMAGES } from '../../config/assetUrls';

/**
 * MANYA PREMIUM MULTI-MODE KEYBOARD v3.0 (Kids Friendly)
 * --------------------------------------------------
 * - THEME AWARE: Fully responsive to data-theme="dark".
 * - OVERFLOW FIXED: Auto-scrolling input display.
 * - BRANDED: Integrated Manya icon.
 * - ACCESSIBLE: Large, rounded, high-contrast keys.
 */
const ManyaKeyboard = ({ 
  isOpen, 
  onInput, 
  onDelete, 
  onClose, 
  onDone,
  value = ''
}) => {
  const [mode, setMode] = useState('alpha'); // Default to alpha for English
  const [isDark, setIsDark] = useState(false);
  const displayRef = useRef(null);

  // --- 🧠 THEME SYNC ---
  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Auto-scroll to end when typing (Overflow Fix)
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [value]);

  // --- KEY LAYOUTS ---
  const numericLayout = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '/']];
  const algebraLayout = [['x', 'y', 'z'], ['n', '(', ')'], ['+', '-', '*'], ['/', '^', '=']];
  const qwertyLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const Key = ({ val, onClick, className = '', color = '', size = 'h-14' }) => {
    const defaultColor = color || (isDark 
      ? 'bg-white/10 text-white hover:bg-white/15 border-transparent' 
      : 'bg-white text-slate-800 hover:bg-slate-50 border-[#E8DDD0] shadow-[0_4px_0_rgba(139,90,43,0.08)]');

    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95, y: 2 }}
        onClick={() => onClick(val === '␣' ? ' ' : val)}
        className={`${size} rounded-2xl font-black text-lg active:shadow-none transition-all flex items-center justify-center border-2 ${defaultColor} ${className}`}
      >
        {val === ' ' ? '␣' : val}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed bottom-0 left-0 right-0 z-[100] border-t-8 border-[#7c3aed] rounded-t-[3.5rem] p-6 pb-10 antialiased transition-all duration-300 ${
            isDark 
            ? 'bg-[#0f172a] text-white shadow-[0_-20px_50px_rgba(0,0,0,0.4)]' 
            : 'bg-[#FFF8F0] text-[#2D1B4E] shadow-[0_-20px_50px_rgba(139,90,43,0.12)]'
          }`}
          style={{ fontFamily: 'var(--font-main)' }}
        >
          <div className="max-w-lg mx-auto">
            {/* 1. HEADER & DISPLAY */}
            <div className="flex justify-between items-center mb-5 px-2">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-none">
                  <img src={IMAGES.manya_icon} alt="Manya" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-[#8B7FA3]'}`}>Entering Value</span>
                  <div 
                    ref={displayRef}
                    className="text-2xl font-black text-indigo-500 min-h-[2.5rem] flex items-center overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth"
                  >
                    {value || <span className={`opacity-20 italic ${isDark ? 'text-indigo-300' : 'text-[#7c3aed]'}`}>Type here...</span>}
                    <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-7 bg-indigo-500 ml-1 rounded-full flex-none" />
                  </div>
                </div>
              </div>
              <button onClick={onClose} className={`p-3 rounded-2xl transition-colors ml-4 ${isDark ? 'bg-white/5 text-slate-400 hover:text-indigo-400' : 'bg-white border border-[#E8DDD0] text-[#8B7FA3] hover:text-[#7c3aed]'}`}>
                <ChevronDown size={24} />
              </button>
            </div>

            {/* 2. MODE SELECTOR */}
            <div className={`flex gap-2 mb-6 p-1 rounded-[1.5rem] border ${isDark ? 'bg-white/5 border-transparent' : 'bg-white border-[#E8DDD0]'}`}>
              {[
                { id: 'alpha', icon: <Languages size={18} />, label: 'ABC' },
                { id: 'numeric', icon: <Hash size={18} />, label: '123' },
                { id: 'algebra', icon: <FunctionSquare size={18} />, label: 'f(x)' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] tracking-widest transition-all ${
                    mode === t.id 
                    ? (isDark 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' 
                        : 'bg-[#7c3aed] text-white shadow-xl shadow-[#7c3aed]/25')
                    : (isDark 
                        ? 'text-slate-400 hover:text-slate-300' 
                        : 'text-[#8B7FA3] hover:text-[#2D1B4E]')
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 3. DYNAMIC KEYPAD AREA */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                <AnimatePresence mode="wait">
                  {mode === 'numeric' && (
                    <motion.div key="numeric" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="grid grid-cols-3 gap-3">
                      {numericLayout.flat().map(k => <Key key={k} val={k} onClick={onInput} />)}
                    </motion.div>
                  )}
                  {mode === 'algebra' && (
                    <motion.div key="algebra" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="grid grid-cols-3 gap-3">
                      {algebraLayout.flat().map(k => (
                        <Key 
                          key={k} val={k} onClick={onInput} 
                          color={isDark ? 'bg-indigo-900/30 text-indigo-300 border-transparent' : 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20 shadow-[0_4px_0_rgba(124,58,237,0.15)]'} 
                        />
                      ))}
                    </motion.div>
                  )}
                  {mode === 'alpha' && (
                    <motion.div key="alpha" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col gap-2 w-full">
                       <div className="flex justify-center gap-1.5">
                         {qwertyLayout[0].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                       </div>
                       <div className="flex justify-center gap-1.5 px-4">
                         {qwertyLayout[1].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                       </div>
                       <div className="flex justify-center gap-1.5">
                         <button onClick={onDelete} className={`flex-1 !h-12 rounded-2xl flex items-center justify-center border-2 min-w-[40px] transition-all active:translate-y-[2px] ${
                           isDark 
                           ? 'bg-rose-900/20 text-rose-400 border-rose-500/20 shadow-[0_4px_0_rgba(244,63,94,0.1)]' 
                           : 'bg-rose-100 text-rose-600 border-rose-200 shadow-[0_4px_0_rgba(244,63,94,0.15)]'
                         }`}>
                           <Delete size={20} />
                         </button>
                         {qwertyLayout[2].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                         <button onClick={onDone} className="flex-1 !h-12 rounded-2xl bg-[#58cc02] text-white flex items-center justify-center border-b-[4px] border-[#46a302] min-w-[40px] shadow-[0_4px_0_#46a302] active:translate-y-[2px] active:border-b-[2px]">
                           <Check size={20} strokeWidth={4} />
                         </button>
                       </div>
                       <div className="flex justify-center gap-2 mt-1">
                         <Key val=" " onClick={onInput} className="w-[65%] !h-12 !text-sm rounded-[2rem]" color={isDark ? "bg-indigo-500/20 text-indigo-400 border-transparent" : "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20"} />
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar Actions (Numeric/Algebra only) */}
              {mode !== 'alpha' && (
                <div className="w-16 flex flex-col gap-3">
                  <button onClick={onDelete} className={`h-20 rounded-[1.5rem] flex items-center justify-center border-2 active:translate-y-[2px] active:border-b-[4px] transition-all ${
                    isDark 
                    ? 'bg-rose-900/30 text-rose-500 border-rose-500/20 shadow-[0_4px_0_rgba(244,63,94,0.1)]' 
                    : 'bg-rose-100 text-rose-600 border-rose-200 shadow-[0_4px_0_rgba(244,63,94,0.15)]'
                  }`}><Delete size={24} /></button>
                  <button onClick={onDone} className="flex-1 rounded-[1.5rem] bg-[#58cc02] text-white flex items-center justify-center border-b-[6px] border-[#46a302] active:translate-y-[2px] active:border-b-[4px] transition-all shadow-lg shadow-[#58cc02]/25"><Check size={32} strokeWidth={4} /></button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ManyaKeyboard;

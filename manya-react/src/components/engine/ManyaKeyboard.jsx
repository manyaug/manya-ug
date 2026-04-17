import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Check, ChevronDown, Hash, FunctionSquare, Languages } from 'lucide-react';

/**
 * MANYA PREMIUM MULTI-MODE KEYBOARD v2.1
 * --------------------------------------------------
 * Optimized layout to ensure full QWERTY visibility and better ergonomics.
 */
const ManyaKeyboard = ({ 
  isOpen, 
  onInput, 
  onDelete, 
  onClose, 
  onDone,
  value = ''
}) => {
  const [mode, setMode] = useState('numeric'); // 'numeric' | 'algebra' | 'alpha'

  // --- KEY LAYOUTS ---
  const numericLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '/']
  ];

  const algebraLayout = [
    ['x', 'y', 'z'],
    ['n', '(', ')'],
    ['+', '-', '*'],
    ['/', '^', '=']
  ];

  const qwertyLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const Key = ({ val, onClick, className = '', color = 'bg-white text-slate-900', size = 'h-14' }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 2 }}
      onClick={() => onClick(val === '␣' ? ' ' : val)}
      className={`${size} rounded-xl font-black text-lg shadow-[0_4px_0_rgba(0,0,0,0.1)] active:shadow-none transition-all flex items-center justify-center border-2 border-slate-100 dark:border-white/10 ${color} ${className}`}
    >
      {val === ' ' ? '␣' : val}
    </motion.button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-50 dark:bg-slate-900 border-t-4 border-indigo-500 rounded-t-[3rem] p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] font-['Plus_Jakarta_Sans'] antialiased"
        >
          <div className="max-w-lg mx-auto">
            {/* 1. HEADER & DISPLAY */}
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entering Value</span>
                <div className="text-2xl font-black text-indigo-500 min-h-[2.5rem] flex items-center">
                  {value || <span className="opacity-20 text-indigo-300 italic">Type here...</span>}
                  <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-7 bg-indigo-500 ml-1 rounded-full" />
                </div>
              </div>
              <button onClick={onClose} className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors">
                <ChevronDown size={24} />
              </button>
            </div>

            {/* 2. MODE SELECTOR */}
            <div className="flex gap-2 mb-6 bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl">
              {[
                { id: 'numeric', icon: <Hash size={18} />, label: '123' },
                { id: 'algebra', icon: <FunctionSquare size={18} />, label: 'f(x)' },
                { id: 'alpha', icon: <Languages size={18} />, label: 'ABC' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs tracking-widest transition-all ${
                    mode === t.id 
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
                    <motion.div key="numeric" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-3">
                      {numericLayout.flat().map(k => <Key key={k} val={k} onClick={onInput} />)}
                    </motion.div>
                  )}
                  {mode === 'algebra' && (
                    <motion.div key="algebra" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-3">
                      {algebraLayout.flat().map(k => <Key key={k} val={k} onClick={onInput} color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" />)}
                    </motion.div>
                  )}
                  {mode === 'alpha' && (
                    <motion.div key="alpha" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-1.5 w-full">
                       {/* Row 1: Q-P */}
                       <div className="flex justify-center gap-1">
                         {qwertyLayout[0].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                       </div>
                       {/* Row 2: A-L */}
                       <div className="flex justify-center gap-1 px-4">
                         {qwertyLayout[1].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                       </div>
                       {/* Row 3: Z-M + Backspace */}
                       <div className="flex justify-center gap-1">
                         <button onClick={onDelete} className="flex-1 !h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 flex items-center justify-center border-2 border-slate-100 dark:border-white/10 min-w-[40px]">
                           <Delete size={18} />
                         </button>
                         {qwertyLayout[2].map(k => <Key key={k} val={k} onClick={onInput} className="flex-1 !h-12 !text-base min-w-[28px]" />)}
                         <button onClick={onDone} className="flex-1 !h-12 rounded-xl bg-[#58cc02] text-white flex items-center justify-center border-b-[4px] border-[#46a302] min-w-[40px]">
                           <Check size={18} strokeWidth={4} />
                         </button>
                       </div>
                       {/* Row 4: Space */}
                       <div className="flex justify-center gap-1 mt-1">
                         <Key val=" " onClick={onInput} className="w-[60%] !h-12 !text-sm" color="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500" />
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar: Only for non-alpha modes */}
              {mode !== 'alpha' && (
                <div className="w-16 flex flex-col gap-3">
                  <button 
                    onClick={onDelete}
                    className="h-20 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center border-2 border-rose-200 dark:border-rose-500/20 shadow-[0_4px_0_#fda4af] active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Delete size={24} />
                  </button>
                  <button 
                    onClick={onDone}
                    className="flex-1 rounded-2xl bg-[#58cc02] text-white flex items-center justify-center border-b-[6px] border-[#46a302] active:h-[calc(100%-6px)] active:translate-y-[6px] transition-all shadow-lg"
                  >
                    <Check size={32} strokeWidth={4} />
                  </button>
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

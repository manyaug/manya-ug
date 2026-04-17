import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PIZZA FRACTIONS RENDERER
 * Stateless UI component for visualization of toppings and pizza state.
 */

const PizzaRenderer = ({ 
    selectedIds, 
    phase, 
    isError, 
    getToppingLayout, 
    TOPPINGS, 
    targetVal, 
    numToppings, 
    calculateCombinations 
}) => {
    const layout = getToppingLayout(selectedIds);

    return (
        <div className="flex-1 relative flex flex-col items-center justify-center px-4"
             style={{ background: 'radial-gradient(ellipse at center, #2d1200 0%, #1a0a00 100%)' }}>

            <motion.div
                className="relative rounded-full"
                style={{ width: 'min(52vw, 200px)', aspectRatio: '1/1' }}
                animate={
                    phase === 'celebrating' ? { scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] } :
                    isError                 ? { scale: [1, 0.95, 1] } : {}
                }
                transition={{ duration: 0.5 }}
            >
                {/* Crust & Cheese */}
                <div className="absolute inset-0 rounded-full bg-amber-800 shadow-[0_0_30px_rgba(245,158,11,0.3)]" />
                <div className="absolute inset-[10%] rounded-full"
                     style={{ background: 'radial-gradient(circle at 35% 30%, #fffbeb 0%, #fcd34d 60%, #f59e0b 100%)' }} />
                
                {/* Toppings Overlay */}
                <AnimatePresence>
                    {layout.map(({ id, x, y }) => {
                        const t = TOPPINGS.find(t => t.id === id);
                        return (
                            <motion.div
                                key={`pizza-${id}`}
                                initial={{ scale: 0, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
                                className="absolute text-xl pointer-events-none"
                                style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                {t?.icon}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {selectedIds.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-amber-700/40 text-[11px] font-bold italic">Plain Cheese</span>
                    </div>
                )}
            </motion.div>

            {/* MicroHUD Score Preview */}
            <div className="mt-3 flex items-center gap-3">
                <div className="text-center">
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Toppings</div>
                    <div className="text-white font-black text-xl">{numToppings}</div>
                </div>
                <div className="text-white/20 font-black">→</div>
                <div className="text-center">
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Combos</div>
                    <div className={`font-black text-xl ${calculateCombinations(numToppings) === targetVal ? 'text-emerald-400' : 'text-white'}`}>
                        {numToppings === 0 ? '—' : calculateCombinations(numToppings)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PizzaRenderer;

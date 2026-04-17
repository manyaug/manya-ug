import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen } from 'lucide-react';

/**
 * SUBSET EXPLORER RENDERER
 * Stateless UI component for the discovery glass zone.
 */

const SubsetRenderer = ({ 
    theme, 
    items, 
    insideItems, 
    errorAnim, 
    successAnim, 
    ICONS, 
    COLORS, 
    dropZoneRef,
    toggleItem,
    handleDragEnd
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center relative">
            <motion.div 
                ref={dropZoneRef}
                animate={
                    errorAnim ? { x: [-10, 10, -10, 10, 0] } :
                    successAnim ? { scale: [1, 1.05, 1], borderColor: ['#475569', '#10b981', '#475569'] } : {}
                }
                className={`relative flex flex-wrap content-center justify-center gap-6 p-8 shadow-2xl transition-all duration-300 ${
                    theme === 'flag' 
                        ? 'w-[300px] h-[180px] bg-white/5 border-2 border-white/10 rounded-2xl flex-row overflow-hidden' 
                        : 'w-full max-w-[340px] aspect-[4/3] bg-slate-900/50 backdrop-blur-xl border-4 border-slate-700/50 rounded-[40px]'
                }`}
            >
                {theme === 'flag' ? (
                    items.map((item, i) => (
                        <div key={`stripe-${i}`} className="flex-1 border-r border-white/5 last:border-r-0 transition-all duration-500" style={{ backgroundColor: insideItems.has(item) ? COLORS[item] || '#ccc' : 'transparent', opacity: insideItems.has(item) ? 1 : 0.1 }} />
                    ))
                ) : (
                    <>
                        <AnimatePresence>
                            {insideItems.size === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 font-black tracking-widest pointer-events-none">
                                    <PackageOpen size={64} className="mb-4 opacity-10" />
                                    <span>EMPTY SET (∅)</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {Array.from(insideItems).map(item => (
                            <motion.div layoutId={`item-${item}`} key={item} onClick={() => toggleItem(item)} className="w-20 h-20 flex items-center justify-center text-5xl cursor-pointer hover:scale-110 active:scale-95 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] z-10">
                                {ICONS[item] || "📦"}
                            </motion.div>
                        ))}
                    </>
                )}
            </motion.div>
            
            {/* Inventory / Shelf */}
            <div className="flex gap-6 items-center justify-center mt-10 h-24">
                {items.map(item => {
                    const isInside = insideItems.has(item);
                    return (
                        <div key={item} className="relative w-16 h-16">
                            <AnimatePresence>
                                {!isInside && (
                                    <motion.div 
                                        layoutId={`item-${item}`} 
                                        drag dragSnapToOrigin 
                                        onDragEnd={(e, info) => handleDragEnd(e, info, item)} 
                                        onClick={() => toggleItem(item)} 
                                        className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-5xl hover:-translate-y-2 transition-all active:scale-90 drop-shadow-2xl z-30"
                                    >
                                        {ICONS[item] || "📦"}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="absolute inset-0 flex items-center justify-center opacity-5 grayscale pointer-events-none text-4xl">{ICONS[item] || "📦"}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubsetRenderer;

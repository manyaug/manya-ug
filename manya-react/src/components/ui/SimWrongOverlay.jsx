import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw } from 'lucide-react';

const SimWrongOverlay = ({ show = false, onDismiss }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onDismiss, 1200);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Centered Try Again Badge (Set Theory Style) */}
                    <motion.div
                        className="bg-amber-500 border-2 border-amber-400 text-white px-8 py-4 rounded-[2rem] shadow-[0_20px_40px_rgba(245,158,11,0.4)] flex items-center gap-3"
                        initial={{ scale: 0.8, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 300 }}
                    >
                        <RotateCcw size={24} className="animate-spin-slow" />
                        <span className="text-xl font-black italic tracking-tight uppercase">Try Again!</span>
                        <AlertCircle size={20} className="opacity-50" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SimWrongOverlay;

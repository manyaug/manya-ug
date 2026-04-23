import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import '../../styles/PremiumModal.css';

/**
 * PremiumModal
 * ============
 * A high-fidelity, glassmorphism modal system for the Bulletproof Manya design.
 * Features background blur, spring physics, and accessible portals.
 */
const PremiumModal = ({ 
    isOpen, 
    onClose, 
    children, 
    showClose = true,
    maxWidth = '450px',
    className = ''
}) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="premium-modal-wrapper">
                    {/* BACKDROP */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="premium-modal-backdrop"
                    />

                    {/* CONTENT CONTAINER */}
                    <div className="premium-modal-container">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className={`premium-modal-card ${className}`}
                            style={{ maxWidth }}
                        >
                            <div className="premium-modal-gloss" />
                            
                            {children}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default PremiumModal;

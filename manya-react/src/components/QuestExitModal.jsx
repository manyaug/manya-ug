import React from 'react';
import PremiumModal from './ui/PremiumModal';
import { LogOut, Heart } from 'lucide-react';

/**
 * QuestExitModal
 * ==============
 * Replaces the ugly window.confirm for quest exits.
 * Themed according to the subject.
 */
const QuestExitModal = ({ isOpen, onClose, onConfirm, subject = 'math' }) => {
    // Subject-specific accents
    const subjectColors = {
        math: '#7c3aed',
        science: '#16a34a',
        sst: '#0ea5e9',
        english: '#db2777'
    };

    const accent = subjectColors[subject.toLowerCase()] || '#6366f1';

    return (
        <PremiumModal 
            isOpen={isOpen} 
            onClose={onClose}
            maxWidth="400px"
        >
            <div className="premium-modal-content" style={{ '--modal-accent': accent }}>
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
                         style={{ backgroundColor: `${accent}20`, color: accent, border: `2px solid ${accent}40` }}>
                        <LogOut size={36} strokeWidth={3} />
                    </div>
                </div>

                <h3 className="premium-modal-title">Leaving already?</h3>
                <p className="premium-modal-body">
                    Don't worry, your progress is <span style={{ color: accent, fontWeight: 900 }}>automatically saved</span>. Take a break or continue later!
                </p>

                <div className="premium-modal-actions">
                    <button 
                        className="manya-btn-modal-primary"
                        onClick={onConfirm}
                    >
                        Save & Exit
                    </button>
                    <button 
                        className="manya-btn-modal-secondary"
                        onClick={onClose}
                    >
                        Keep Learning
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase font-black text-slate-300 tracking-[0.2em]">
                    <Heart size={10} fill="currentColor" /> Stay Bulletproof
                </div>
            </div>
        </PremiumModal>
    );
};

export default QuestExitModal;

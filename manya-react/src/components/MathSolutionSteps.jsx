import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Zap, Trophy, HelpCircle } from 'lucide-react';

const ICON_MAP = {
    Lightbulb: <Lightbulb size={18} />,
    Zap:       <Zap size={18} />,
    Trophy:    <Trophy size={18} />,
    HelpCircle: <HelpCircle size={18} />
};

const MathSolutionStep = ({ step, index, total }) => {
    const isFirst = index === 0;
    const isLast  = index === total - 1;
    const IconComponent = ICON_MAP[step.iconName] || <HelpCircle size={18} />;

    return (
        <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.12 + 0.2, duration: 0.4 }}
            className="flex items-stretch gap-4 relative"
            key={step.id}
        >
            {/* Timeline Column */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
                {/* Upper part of the line */}
                <div className={`w-0.5 flex-1 transition-all ${isFirst ? 'bg-transparent' : 'bg-[var(--border-color)] opacity-40'}`} />
                
                {/* Step Circle/Icon */}
                <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center z-10 shadow-sm border border-[var(--border-color)]"
                    style={{ background: step.bg, color: step.color }}
                >
                    {IconComponent}
                </div>
                
                {/* Lower part of the line */}
                <div className={`w-0.5 flex-1 transition-all ${isLast ? 'bg-transparent' : 'bg-[var(--border-color)] opacity-40'}`} />
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-10">
                <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[1.2rem] px-5 py-4 shadow-sm hover:shadow-md transition-all duration-300 min-h-[80px] flex flex-col justify-center">
                    {/* Step Label */}
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ background: step.color }} />
                         <p 
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: step.color }}
                        >
                            {step.label}
                        </p>
                    </div>
                    
                    {/* Step Text */}
                    <div 
                        className="text-[14.5px] leading-[1.6] font-bold text-[var(--text-main)] whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: step.text }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export const MathSolutionSteps = ({ steps = [] }) => {
    if (!steps || steps.length === 0) {
        return (
            <div className="px-5 py-4 text-center">
                <p className="text-[13.5px] font-bold text-[var(--text-sub)] italic opacity-60">
                    No detailed steps available for this question.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0 px-1 py-1 overflow-visible">
            {steps.map((step, idx) => (
                <MathSolutionStep 
                    key={step.id || idx} 
                    step={step} 
                    index={idx} 
                    total={steps.length} 
                />
            ))}
        </div>
    );
};

export default MathSolutionSteps;

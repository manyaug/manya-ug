import React from 'react';

/**
 * MUSCLE SIMULATION RENDERER
 * Stateless Canvas UI component for the musculoskeletal system.
 */

const MuscleRenderer = ({ 
    canvasRef, 
    isFlexed, 
    isExtended 
}) => {
    return (
        <div className="relative w-full aspect-[4/3] md:aspect-video bg-sky-50/50 rounded-3xl shadow-xl border-4 border-slate-100 overflow-hidden">
            <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-cover md:object-contain" />

            {/* Floating Instructional Badges */}
            <div className="absolute top-8 left-8 flex flex-col gap-3">
                <div className={`px-6 py-4 rounded-2xl shadow-lg border-2 transition-all ${isFlexed ? 'bg-red-50 border-red-200 scale-105' : 'bg-white border-slate-100 opacity-80'}`}>
                    <h3 className={`text-lg font-black uppercase ${isFlexed ? 'text-red-500' : 'text-slate-400'}`}>Biceps</h3>
                    <p className={`text-sm font-bold ${isFlexed ? 'text-red-400' : 'text-slate-300'}`}>
                        {isFlexed ? '🔥 Pulling (Contracted)' : '✨ Relaxed'}
                    </p>
                </div>
            </div>

            <div className="absolute bottom-8 right-8 flex flex-col gap-3">
                <div className={`px-6 py-4 rounded-2xl shadow-lg border-2 transition-all ${isExtended ? 'bg-indigo-50 border-indigo-200 scale-105' : 'bg-white border-slate-100 opacity-80'}`}>
                    <h3 className={`text-lg font-black uppercase ${isExtended ? 'text-indigo-500' : 'text-slate-400'}`}>Triceps</h3>
                    <p className={`text-sm font-bold ${isExtended ? 'text-indigo-400' : 'text-slate-300'}`}>
                        {isExtended ? '🔥 Pulling (Contracted)' : '✨ Relaxed'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MuscleRenderer;

import React from 'react';

/**
 * WATER CYCLE RENDERER
 * Stateless Canvas UI component for the water cycle.
 */

const WaterRenderer = ({ 
    canvasRef, 
    sunIntensity 
}) => {
    return (
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-100/50 min-h-0" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="shadow-2xl rounded-2xl bg-sky-100 border-4 border-white overflow-hidden relative w-full max-w-[800px]">
                {/* SVG LAYER: RELATIVE BLOCK (Gives layout height) */}
                <svg viewBox="0 0 800 500" style={{ display: 'block', width: '100%', height: 'auto', position: 'relative', zIndex: 1 }}>
                    <rect x="0" y="0" width="800" height="500" fill="#bae6fd" />
                    
                    {/* Sun with Intensity Glow */}
                    <circle 
                        cx="700" cy="80" 
                        r={30 + (sunIntensity / 5)} fill="#fde047"
                        style={{ filter: `blur(${sunIntensity / 10}px)`, opacity: 0.3 + (sunIntensity / 100) * 0.7 }}
                    />
                    <circle cx="700" cy="80" r="15" fill="#facc15" />
                    
                    {/* Mountains */}
                    <path d="M-50 500 L200 250 L450 500 Z" fill="#92400e" />
                    <path d="M300 500 L550 300 L850 500 Z" fill="#78350f" />
                    
                    {/* Water Line */}
                    <rect x="0" y="440" width="800" height="60" fill="#3b82f6" opacity="0.9" />
                </svg>

                {/* CANVAS LAYER: ABSOLUTE OVERLAY */}
                <canvas 
                    ref={canvasRef} width={800} height={500}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
                />

                {/* Legend Overlay */}
                <div className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-white shadow-lg pointer-events-none z-10">
                    <h3 className="text-[10px] font-black text-[#7c3aed] uppercase italic flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Hybrid Engine 3.0
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Physics Optimized</p>
                </div>
            </div>
        </div>
    );
};

export default WaterRenderer;

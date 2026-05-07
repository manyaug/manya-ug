import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Info, Beaker, Heart, Book } from 'lucide-react';
import SimulationEngine from '../components/engine/SimulationEngine';
import { ENGINE_REGISTRY, getEngine } from '../config/engineRegistry';

const AVAILABLE_SIMULATIONS = Object.entries(ENGINE_REGISTRY)
    .filter(([_, meta]) => meta.id)
    .map(([key, meta]) => ({ ...meta, id: key }));

/**
 * SimulationTestingView - Dedicated playground for simulations.
 * Lists all available simulation components for developer testing.
 */
export default function SimulationTestingView() {
    const navigate = useNavigate();
    const [selectedSim, setSelectedSim] = useState(null);

    // Dynamic icon mapping based on category
    const getSimIcon = (category) => {
        switch (category) {
            case 'Biology': return <Heart size={24} style={{ color: 'var(--manya-pink)' }} />;
            case 'Science': return <Beaker size={24} style={{ color: 'var(--subject-science)' }} />;
            case 'English': return <Book size={24} style={{ color: 'var(--subject-english)' }} />;
            default: return <Play size={24} style={{ color: 'var(--manya-purple)' }} />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen animate-in" style={{ background: 'var(--bg-page)' }}>
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => selectedSim ? setSelectedSim(null) : navigate(-1)}
                    className="p-2 hover:bg-opacity-10 hover:bg-black rounded-lg transition-colors"
                >
                    <ChevronLeft size={24} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <div>
                    <h1 className="text-xl font-black tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                        {selectedSim ? selectedSim.name : 'Simulation Lab'}
                    </h1>
                    {selectedSim && <p className="text-[10px] font-bold mt-1 uppercase tracking-widest" style={{ color: 'var(--manya-purple)' }}>Active Test Environment</p>}
                    {!selectedSim && <p className="text-[10px] font-bold mt-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Internal Sandbox</p>}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                {!selectedSim ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AVAILABLE_SIMULATIONS.map(sim => (
                            <div
                                key={sim.id}
                                className="rounded-2xl p-6 border-2 shadow-sm transition-all group flex flex-col cursor-pointer"
                                style={{ 
                                    background: 'var(--bg-card)', 
                                    borderColor: 'var(--border-color)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--manya-purple)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                onClick={() => setSelectedSim(sim)}
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: 'var(--bg-primary)' }}>
                                    {getSimIcon(sim.category)}
                                </div>
                                <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{sim.name}</h2>
                                <p className="text-xs font-bold mt-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{sim.description}</p>
                                
                                <div className="mt-4 flex flex-wrap gap-1">
                                    {sim.tags?.map(tag => (
                                        <span key={tag} className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter" style={{ background: 'var(--manya-purple-light)', color: 'var(--manya-purple)' }}>
                                        {sim.difficulty}
                                    </span>
                                    <span className="text-sm font-black transition-transform group-hover:translate-x-1" style={{ color: 'var(--manya-purple)' }}>
                                        Launch →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto min-h-0">
                        <SimulationEngine 
                            simulationName={selectedSim.id} 
                            onComplete={() => setSelectedSim(null)}
                            onScoreUpdate={(score) => console.log(`[SimTest] Score: ${score}`)}
                        />
                        
                        <div className="mt-8 p-6 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-start gap-4">
                                <Info className="mt-1 shrink-0" size={20} style={{ color: 'var(--manya-purple)' }} />
                                <div>
                                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>Developer Notes</h4>
                                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                        This component follows the Hybrid Rendering Model. 
                                        The SVG defines the layout height (relative), while the Canvas overlays the physics (absolute).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

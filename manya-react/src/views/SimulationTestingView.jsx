import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Info, Beaker, Heart, Book } from 'lucide-react';
import SimulationEngine from '../components/engine/SimulationEngine';
import { AVAILABLE_SIMULATIONS } from '../components/engine/SimulationRegistry';

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
            case 'Biology': return <Heart size={24} className="text-pink-500" />;
            case 'Science': return <Beaker size={24} className="text-[#7c3aed]" />;
            case 'English': return <Book size={24} className="text-pink-600" />;
            default: return <Play size={24} className="text-[#7c3aed]" />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200">
                <button
                    onClick={() => selectedSim ? setSelectedSim(null) : navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                        {selectedSim ? selectedSim.name : 'Simulation Lab'}
                    </h1>
                    {selectedSim && <p className="text-[10px] font-bold text-[#7c3aed] mt-1 uppercase tracking-widest">Active Test Environment</p>}
                    {!selectedSim && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Internal Sandbox</p>}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                {!selectedSim ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AVAILABLE_SIMULATIONS.map(sim => (
                            <div
                                key={sim.id}
                                className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-[#7c3aed]/30 shadow-sm transition-all group flex flex-col cursor-pointer"
                                onClick={() => setSelectedSim(sim)}
                            >
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    {getSimIcon(sim.category)}
                                </div>
                                <h2 className="text-lg font-black text-slate-800">{sim.name}</h2>
                                <p className="text-xs font-bold text-slate-400 mt-2 flex-1">{sim.description}</p>
                                
                                <div className="mt-4 flex flex-wrap gap-1">
                                    {sim.tags?.map(tag => (
                                        <span key={tag} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded uppercase tracking-tighter">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                                    <span className="text-[10px] font-black px-2 py-1 bg-[#7c3aed]/5 text-[#7c3aed] rounded uppercase tracking-tighter">
                                        {sim.difficulty}
                                    </span>
                                    <span className="text-sm font-black text-[#7c3aed] group-hover:translate-x-1 transition-transform">
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
                        
                        <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-start gap-4">
                                <Info className="text-[#7c3aed] mt-1 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-bold text-slate-800">Developer Notes</h4>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
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
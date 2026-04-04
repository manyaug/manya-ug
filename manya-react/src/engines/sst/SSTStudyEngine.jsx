import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Globe, 
    MapPin, 
    Info, 
    CheckCircle2, 
    AlertTriangle, 
    Lightbulb, 
    ArrowRight, 
    Users,
    Navigation,
    Anchor
} from 'lucide-react';

/**
 * SST STUDY ENGINE - v1.0
 * Premium visual renderer for rich SST study notes.
 */
const SSTStudyEngine = ({ data, onComplete }) => {
    const notes = data?.study_notes || data;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        // Scroll to top when entering
        window.scrollTo(0, 0);
    }, []);

    if (!notes) return <div className="p-10 text-center text-rose-500 font-bold leading-tight">Data Load Error: Study notes missing.</div>;

    // Helper to render lists with nice bullets
    const renderList = (items, colorClass = "text-slate-600", icon = <CheckCircle2 size={16} className="text-emerald-500 mt-1 shrink-0" />) => (
        <ul className="space-y-4">
            {items.map((item, index) => (
                <li key={index} className={`flex gap-3 text-sm font-medium ${colorClass} animate-in slide-in-from-left duration-500`} style={{ animationDelay: `${index * 100}ms` }}>
                    {icon}
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );

    return (
        <div className={`flex-1 flex flex-col bg-slate-50 min-h-screen pb-24 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* HERO HEADER */}
            <div className="relative bg-slate-900 text-white pt-12 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -ml-10 -mb-10" />
                
                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-4 text-amber-500 font-black text-[10px] tracking-widest uppercase">
                        <Globe size={14} /> {data.topic || "Social Studies"}
                    </div>
                    <h1 className="text-3xl font-black leading-tight tracking-tight mb-4">
                        {notes.title || data.subtopic}
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold border border-white/10">
                        <BookOpen size={14} className="text-amber-400" /> Lesson Material
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className="max-w-2xl mx-auto -mt-10 px-4 w-full space-y-6">
                
                {/* 1. DEFINITION CARD */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-900/5 border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Info size={120} />
                    </div>
                    <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Core Concept</h3>
                    <p className="text-xl font-bold text-slate-800 leading-relaxed italic">
                        "{notes.definition}"
                    </p>
                </div>

                {/* 2. KEY FACTS GRID */}
                {notes.key_facts && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Lightbulb size={18} className="text-amber-500" />
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Key Discovery Points</h3>
                        </div>
                        <div className="bg-slate-100/50 rounded-[2.5rem] p-8 border border-white">
                            {renderList(notes.key_facts)}
                        </div>
                    </div>
                )}

                {/* 3. REGIONAL ANALYSIS (EXAMPLES) */}
                {notes.examples_by_region && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <MapPin size={18} className="text-blue-500" />
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Regional Examples</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(notes.examples_by_region).map(([region, countries], idx) => (
                                <div key={region} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-blue-200 transition-colors">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                                        {region.replace(/_/g, ' ')}
                                        <Navigation size={12} className="opacity-30" />
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {countries.map(c => (
                                            <span key={c} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-100">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. CHALLENGES VS SOLUTIONS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Problems */}
                    {notes.problems_faced && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <AlertTriangle size={18} className="text-rose-500" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Challenges</h3>
                            </div>
                            <div className="bg-rose-50/50 rounded-[2.5rem] p-6 border border-rose-100 min-h-full">
                                {renderList(notes.problems_faced, "text-rose-900", <X size={14} className="text-rose-400 mt-1 shrink-0" />)}
                            </div>
                        </div>
                    )}
                    {/* Solutions */}
                    {notes.solutions_to_problems && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <CheckCircle2 size={18} className="text-emerald-500" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Strategic Solutions</h3>
                            </div>
                            <div className="bg-emerald-50/50 rounded-[2.5rem] p-6 border border-emerald-100 min-h-full">
                                {renderList(notes.solutions_to_problems, "text-emerald-900", <CheckCircle2 size={14} className="text-emerald-400 mt-1 shrink-0" />)}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. STRATEGIC POSITIONING (CASE STUDY) */}
                {notes.ugandas_strategic_position && (
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Anchor size={120} />
                        </div>
                        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Users size={14} /> Case Study: Uganda's Advantage
                        </h3>
                        
                        <div className="space-y-6 relative z-10">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Main Sea Gateways</h4>
                                <div className="space-y-3">
                                    {notes.ugandas_strategic_position.main_seaports_used.map((port, i) => (
                                        <div key={i} className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <Navigation size={16} className="text-amber-500 shrink-0" />
                                            <span className="text-sm font-medium leading-relaxed">{port}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-500 rounded-3xl p-6 text-slate-900">
                                <h4 className="text-[10px] font-black text-slate-900/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Lightbulb size={12} fill="currentColor" /> Inland Water Insight
                                </h4>
                                <p className="text-sm font-bold leading-relaxed">
                                    {notes.ugandas_strategic_position.inland_water_advantage}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* COMPLETION BUTTON */}
                <button 
                    onClick={() => {
                         window.scrollTo(0, 0);
                         onComplete?.({ success: true, score: 100 });
                    }}
                    className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black text-[13px] tracking-widest uppercase flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-slate-900/20 mt-12 mb-8"
                >
                    I UNDERSTAND THE CONCEPT <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default SSTStudyEngine;

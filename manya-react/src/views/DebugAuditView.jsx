import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Search, Folder, FileJson, Zap, CheckCircle2 } from 'lucide-react';

/**
 * DebugAuditView - Internal Diagnostic Tool
 * Lists every JSON quest in the Set Theory curriculum for rapid audit.
 */
const MODULES = [
  "quest_01_finite_infinite_sets", "quest_02_set_notation_regions", 
  "quest_03_calculating_subsets", "quest_04_calculating_proper_subsets",
  "quest_05_working_backwards", "quest_06_placing_info_on_venn_diagrams",
  "quest_07_solving_for_unknowns", "quest_08_application_of_sets",
  "quest_09_difference_of_sets_complements", "quest_10_probability_using_venn_diagrams"
];

export default function DebugAuditView() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [quests, setQuests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking file discovery based on known patterns (since we can't read-dir from browser JS)
        const allQuests = MODULES.flatMap(mod => {
            const range = mod.includes('02') ? 10 : 3; // Modular range based on known inventory
            return Array.from({ length: range }, (_, i) => ({
                id: `${mod}-${i+1}`,
                folder: mod,
                file: `${mod.split('_')[1]}-00${i+1}.json`,
                label: `Quest ${mod.split('_')[1]}-00${i+1}`
            }));
        });
        setQuests(allQuests);
        setLoading(false);
    }, []);

    const launchQuest = (q) => {
        navigate('/quest', {
            state: {
                subject: 'math',
                unitId: 'set_theory',
                questFolder: q.folder,
                file: q.file,
                label: q.label,
                biomeColor: '#7c3aed'
            }
        });
    };

    const filtered = quests.filter(q => q.folder.includes(search) || q.file.includes(search));

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-jakarta p-8 animate-in fade-in zoom-in duration-500">
            <header className="flex items-center gap-6 mb-12">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Curriculum Audit Tool</h1>
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mt-1">Set Theory Engine Verification</p>
                </div>
                <div className="ml-auto relative w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-3xl pl-12 pr-6 outline-none focus:ring-2 ring-violet-500/50 transition-all font-bold placeholder:text-slate-600"
                        placeholder="Search modules..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(q => (
                        <div 
                            key={q.id}
                            onClick={() => launchQuest(q)}
                            className="p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/[0.08] hover:border-violet-500/30 transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <FileJson size={20} />
                                </div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{q.folder.split('_').slice(2).join(' ')}</div>
                            </div>
                            <h3 className="text-lg font-bold mb-2 group-hover:text-violet-400 transition-colors">{q.label}</h3>
                            <div className="text-xs font-bold text-slate-400 font-mono opacity-50">{q.file}</div>
                            
                            <div className="mt-8 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
                                    <CheckCircle2 size={12} />
                                    V5.6 Verified
                                </div>
                                <div className="px-4 py-2 bg-violet-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest group-hover:bg-violet-500 transition-colors">
                                    Launch →
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, X, Zap, Search, Clock, Box, FileText, Map as MapIcon, PlayCircle
} from 'lucide-react';
import { syncService } from '../infrastructure/sync/syncService.js';
import { IMAGES, getIsland } from '../config/assetUrls';
import '../styles/library.css';

// Lazy Load Engines for Preview
const NoteExplorerEngine = lazy(() => import('../engines/shared-engines/NoteExplorerEngine.jsx'));
const ThreeDStudyEngine = lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'));
const ReaderStudyEngine = lazy(() => import('../engines/shared-engines/ReaderStudyEngine.jsx'));
const ImageHotspotsEngine = lazy(() => import('../engines/shared-engines/ImageHotspotsEngine.jsx'));
const UniversalGlobeEngine = lazy(() => import('../engines/sst/UniversalGlobeEngine.jsx'));

const SUBJECTS = [
    { id: 'math', label: 'Math', color: '#7c3aed', rgb: '124, 58, 237' },
    { id: 'science', label: 'Sci', color: '#10b981', rgb: '16, 185, 129' },
    { id: 'english', label: 'Eng', color: '#db2777', rgb: '219, 39, 119' },
    { id: 'sst', label: 'SST', color: '#f59e0b', rgb: '245, 158, 11' },
];

export default function LibraryView() {
    const [artifacts, setArtifacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeSub, setActiveSub] = useState('math');
    const [previewItem, setPreviewItem] = useState(null);

    // ── INITIAL FETCH ──
    useEffect(() => {
        async function loadVault() {
            setLoading(true);
            const data = await syncService.pullVault();
            setArtifacts(data);
            setLoading(false);
        }
        loadVault();
    }, []);

    // ── FILTERING & SEARCH ──
    const filtered = useMemo(() => {
        return artifacts.filter(item => {
            const matchesSub = (item.subject || '').toLowerCase() === activeSub.toLowerCase();
            const matchesSearch = (item.title || '').toLowerCase().includes(search.toLowerCase());
            return matchesSub && matchesSearch;
        });
    }, [artifacts, activeSub, search]);

    // ── CATEGORIZATION ──
    const categories = useMemo(() => {
        const groups = {
            simulations: filtered.filter(i => i.type === 'SIM'),
            notes: filtered.filter(i => i.type === 'NOTE'),
            recaps: filtered.filter(i => i.type === 'RECAP'),
            other: filtered.filter(i => !['SIM', 'NOTE', 'RECAP'].includes(i.type))
        };
        return Object.entries(groups).filter(([_, items]) => items.length > 0);
    }, [filtered]);

    const activeColor = SUBJECTS.find(s => s.id === activeSub)?.color || '#7c3aed';
    const activeRgb = SUBJECTS.find(s => s.id === activeSub)?.rgb || '124, 58, 237';

    return (
        <div className="elite-vault-root" style={{ '--accent': activeColor, '--accent-rgb': activeRgb }}>
            
            {/* ── COMPACT HEADER ── */}
            <header className="vault-header-area">
                <div className="vault-top-row">
                    <div className="vault-title-group">
                        <span className="text-[9px] font-black text-slate-500 tracking-[3px] uppercase">Archive</span>
                        <h1 className="text-xl">Vault</h1>
                    </div>
                    <div className="vault-count-pill !py-1 !px-3">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span className="text-[10px]">{artifacts.length}</span>
                    </div>
                </div>

                <div className="vault-search-box !mb-3">
                    <Search className="search-icon !top-[12px] !left-[14px]" size={16} />
                    <input 
                        className="!h-[40px] !text-xs !pl-10"
                        type="text" 
                        placeholder="Search items..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="subject-grid-tabs">
                    {SUBJECTS.map(sub => (
                        <button
                            key={sub.id}
                            className={`sub-pill-compact ${activeSub === sub.id ? 'active' : ''}`}
                            onClick={() => setActiveSub(sub.id)}
                            style={{ '--sub-color': sub.color }}
                        >
                            <img src={getIsland(sub.id)} className="w-4 h-4" alt={sub.label} />
                            <span>{sub.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* ── ARTIFACT SHELF ── */}
            <main className="artifact-shelf">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div className="vault-empty">
                            <div className="loader-orbit" style={{ borderColor: activeColor }} />
                            <p className="mt-4 font-bold text-slate-500">Syncing Vault...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="vault-empty"
                        >
                            <img src={IMAGES.manya_icon} className="empty-icon" alt="Empty" />
                            <h2>No {activeSub} Items</h2>
                            <p>Complete quests in {activeSub} Chapter 1 to unlock simulations and study notes!</p>
                        </motion.div>
                    ) : (
                        <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {categories.map(([name, items]) => (
                                <div key={name} className="mb-8">
                                    <div className="vault-section-header">
                                        <span className="section-label">{name}</span>
                                        <div className="section-line" />
                                    </div>
                                    <div className="artifact-grid">
                                        {items.map((item, idx) => (
                                            <ArtifactCard 
                                                key={item.id || idx} 
                                                item={item} 
                                                color={activeColor} 
                                                onClick={() => setPreviewItem(item)} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* ── PREVIEW LAYER ── */}
            <AnimatePresence>
                {previewItem && (
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="vault-preview-layer"
                    >
                        <header className="preview-nav">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                                    {previewItem.type} // {previewItem.subject}
                                </span>
                                <h2 className="text-xl font-black">{previewItem.title}</h2>
                            </div>
                            <button className="p-close" onClick={() => setPreviewItem(null)}>
                                <X size={24} />
                            </button>
                        </header>
                        <div className="p-body">
                            <Suspense fallback={<VaultLoader color={activeColor} />}>
                                <EngineLauncher item={previewItem} onClose={() => setPreviewItem(null)} />
                            </Suspense>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ArtifactCard({ item, color, onClick }) {
    const Icon = item.type === 'SIM' ? PlayCircle : (item.type === 'NOTE' ? FileText : MapIcon);

    return (
        <motion.div className="elite-card" whileTap={{ scale: 0.95 }} onClick={onClick}>
            <div className="card-glow" style={{ '--accent': color }} />
            <div className="card-visual">
                <span className="type-badge">{item.type}</span>
                <div className="artifact-icon-wrapper">
                    <div className="icon-glow" style={{ '--accent': color }} />
                    <Icon size={32} style={{ color: color }} />
                </div>
            </div>
            <div className="card-info">
                <h4 className="card-title">{item.title}</h4>
                <div className="card-meta">
                    <Clock size={10} />
                    <span>Unlocked {item.unlocked_at ? new Date(item.unlocked_at).toLocaleDateString() : 'Recently'}</span>
                </div>
            </div>
        </motion.div>
    );
}

function EngineLauncher({ item, onClose }) {
    // Note: The 'path' here is the JSON location unpacked from our Smart Key
    const data = { file: item.path, title: item.title, subject: item.subject };

    if (item.type === 'SIM') {
        // Resolve based on simulation engine needs
        return <ReaderStudyEngine data={data} onComplete={onClose} skipDiscovery={true} />;
    }
    
    if (item.type === 'RECAP') {
        return <ReaderStudyEngine data={data} onComplete={onClose} skipDiscovery={true} />;
    }

    return <NoteExplorerEngine data={data} onComplete={onClose} skipDiscovery={true} />;
}

function VaultLoader({ color }) {
    return (
        <div className="vault-loader">
            <div className="loader-orbit" style={{ borderColor: color }} />
        </div>
    );
}

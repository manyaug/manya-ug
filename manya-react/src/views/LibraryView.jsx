import React, { useState, useMemo, useEffect, Suspense, lazy, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, X, Zap, Search, Clock, Box, FileText, Map as MapIcon, PlayCircle, Trash2, AlertTriangle, Layers, RotateCcw, Check
} from 'lucide-react';
import { syncService } from '../infrastructure/sync/syncService.js';
import { IMAGES, getIsland } from '../config/assetUrls';
import { useNavigate } from 'react-router-dom';
import { loadQuestSteps } from '../utils/questLoader';
import { getEngineMetadata } from '../utils/engineRouter';
import '../styles/library.css';

// Lazy Load Engines for Preview
const NoteExplorerEngine = lazy(() => import('../engines/shared-engines/NoteExplorerEngine.jsx'));
const ThreeDStudyEngine = lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'));
const ReaderStudyEngine = lazy(() => import('../engines/shared-engines/ReaderStudyEngine.jsx'));
const ImageHotspotsEngine = lazy(() => import('../engines/shared-engines/ImageHotspotsEngine.jsx'));
const UniversalGlobeEngine = lazy(() => import('../engines/sst/UniversalGlobeEngine.jsx'));

const SUBJECTS = [
    { id: 'math', label: 'Math', color: 'var(--subject-math)', rgb: '124, 58, 237' },
    { id: 'science', label: 'Sci', color: 'var(--subject-science)', rgb: '16, 185, 129' },
    { id: 'english', label: 'Eng', color: 'var(--subject-english)', rgb: '219, 39, 119' },
    { id: 'sst', label: 'SST', color: 'var(--subject-sst)', rgb: '245, 158, 11' },
];

const TYPES = [
    { id: 'ALL', label: 'All Assets', icon: Layers },
    { id: 'SIM', label: 'Simulations 🎮', icon: PlayCircle },
    { id: 'NOTE', label: 'Study Notes 📝', icon: FileText },
    { id: 'RECAP', label: 'Recaps 🏆', icon: MapIcon },
];

export default function LibraryView() {
    const [artifacts, setArtifacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeSub, setActiveSub] = useState('math');
    const [activeType, setActiveType] = useState('ALL');
    const [previewItem, setPreviewItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── INITIAL FETCH ──
    useEffect(() => {
        async function loadVault() {
            setLoading(true);
            const data = await syncService.pullVault();
            
            // Deduplicate items based on compound key (type, title, path, subject) to ensure real numbers
            const seen = new Set();
            const uniqueData = (data || []).filter(item => {
                if (!item.type || !item.title) return true;
                const key = `${item.type.toUpperCase()}|${item.title.toLowerCase()}|${(item.path || '').toLowerCase()}|${(item.subject || '').toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            setArtifacts(uniqueData);
            setLoading(false);
        }
        loadVault();
    }, []);

    // ── FILTERING & SEARCH ──
    const filtered = useMemo(() => {
        return artifacts.filter(item => {
            const matchesSub = (item.subject || '').toLowerCase() === activeSub.toLowerCase();
            const matchesType = activeType === 'ALL' || item.type === activeType;
            const matchesSearch = (item.title || '').toLowerCase().includes(search.toLowerCase());
            return matchesSub && matchesType && matchesSearch;
        });
    }, [artifacts, activeSub, activeType, search]);

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

    // ── DELETE TRANSACTION ──
    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        setDeleting(true);
        const success = await syncService.deleteVaultItem(itemToDelete.id);
        if (success) {
            setArtifacts(prev => prev.filter(item => item.id !== itemToDelete.id));
            // Trigger feedback sound/effect
            if (window.triggerToast) {
                window.triggerToast({
                    message: `Removed "${itemToDelete.title}" from Vault`,
                    type: 'warning'
                });
            }
        }
        setDeleting(false);
        setItemToDelete(null);
    };

    const activeColor = SUBJECTS.find(s => s.id === activeSub)?.color || '#7c3aed';
    const activeRgb = SUBJECTS.find(s => s.id === activeSub)?.rgb || '124, 58, 237';

    // ── STATS BREAKDOWN FOR CURRENT SUBJECT ──
    const stats = useMemo(() => {
        const subItems = artifacts.filter(item => (item.subject || '').toLowerCase() === activeSub.toLowerCase());
        return {
            total: subItems.length,
            sims: subItems.filter(i => i.type === 'SIM').length,
            notes: subItems.filter(i => i.type === 'NOTE').length,
            recaps: subItems.filter(i => i.type === 'RECAP').length,
        };
    }, [artifacts, activeSub]);

    return (
        <div className="elite-vault-root" style={{ '--accent': activeColor, '--accent-rgb': activeRgb }}>
            
            {/* ── COMPACT HEADER ── */}
            <header className="vault-header-area">
                <div className="vault-top-row">
                    <div className="vault-title-group">
                        <span className="text-[9px] font-black text-slate-500 tracking-[3px] uppercase">Archive</span>
                        <h1 className="text-xl font-black">Vault</h1>
                    </div>
                    <div className="vault-count-pill !py-1 !px-3">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span className="text-[10px] font-bold">{stats.total} unlocked</span>
                    </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="vault-search-box">
                    <Search className="search-icon" size={16} />
                    <input 
                        className="!h-[36px] !text-xs !pl-10 !pr-10"
                        type="text" 
                        placeholder={`Search ${activeSub} assets...`} 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="search-clear-btn" onClick={() => setSearch('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* SUBJECT PILLS */}
                <div className="subject-grid-tabs">
                    {SUBJECTS.map(sub => (
                        <button
                            key={sub.id}
                            className={`sub-pill-compact ${activeSub === sub.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveSub(sub.id);
                                // Auto clear search if switching subjects
                                setSearch('');
                            }}
                            style={{ '--sub-color': sub.color }}
                        >
                            <img src={getIsland(sub.id)} className="w-4 h-4" alt={sub.label} />
                            <span>{sub.label}</span>
                        </button>
                    ))}
                </div>

                {/* TYPE FILTERS */}
                <div className="type-filter-bar">
                    {TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.id}
                                className={`type-filter-pill ${activeType === type.id ? 'active' : ''}`}
                                onClick={() => setActiveType(type.id)}
                            >
                                <Icon size={12} />
                                <span>{type.label}</span>
                            </button>
                        );
                    })}
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
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="vault-empty"
                        >
                            <img src={IMAGES.manya_icon} className="empty-icon" alt="Empty" />
                            <h2>No Matching Items</h2>
                            {search || activeType !== 'ALL' ? (
                                <>
                                    <p>No results matching your filters. Try clearing your search or category filters.</p>
                                    <button 
                                        className="clear-all-filters-btn"
                                        onClick={() => {
                                            setSearch('');
                                            setActiveType('ALL');
                                        }}
                                    >
                                        <RotateCcw size={12} /> Reset Filters
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2>No {activeSub} Items</h2>
                                    <p>Complete quests in {activeSub} Chapter 1 to unlock simulations and study notes!</p>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {categories.map(([name, items]) => (
                                <div key={name} className="mb-8">
                                    <div className="vault-section-header">
                                        <span className="section-label">{name}</span>
                                        <span className="section-count">{items.length} items</span>
                                        <div className="section-line" />
                                    </div>
                                    <div className="artifact-grid">
                                        <AnimatePresence>
                                            {items.map((item, idx) => (
                                                <ArtifactCard 
                                                    key={item.id || idx} 
                                                    item={item} 
                                                    color={activeColor} 
                                                    onClick={() => setPreviewItem(item)} 
                                                    onDelete={() => setItemToDelete(item)}
                                                />
                                            ))}
                                        </AnimatePresence>
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
                                <X size={20} />
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

            {/* ── STUNNING GLASS DELETE CONFIRMATION DIALOG ── */}
            <AnimatePresence>
                {itemToDelete && (
                    <motion.div 
                        className="delete-confirm-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="delete-confirm-card"
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        >
                            <div className="warning-icon-wrapper">
                                <AlertTriangle size={32} className="text-rose-500 animate-pulse" />
                            </div>
                            <h3>Remove Asset?</h3>
                            <p className="delete-info-text">
                                Are you sure you want to remove <strong>"{itemToDelete.title}"</strong> from your Library?
                            </p>
                            <p className="delete-warning-sub">
                                This will remove it from your offline and online backup. You must complete the related quest node again to re-unlock it.
                            </p>
                            
                            <div className="delete-confirm-actions">
                                <button 
                                    className="cancel-delete-btn" 
                                    onClick={() => setItemToDelete(null)}
                                    disabled={deleting}
                                >
                                    Keep Asset
                                </button>
                                <button 
                                    className="confirm-delete-btn" 
                                    onClick={handleDeleteConfirm}
                                    disabled={deleting}
                                >
                                    {deleting ? 'Removing...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ArtifactCard({ item, color, onClick, onDelete }) {
    const Icon = item.type === 'SIM' ? PlayCircle : (item.type === 'NOTE' ? FileText : MapIcon);

    return (
        <motion.div 
            className="elite-card" 
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }} 
            onClick={onClick}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
            <div className="card-glow" style={{ '--accent': color }} />
            
            {/* Trash button on card */}
            <button 
                className="card-delete-btn"
                onClick={(e) => {
                    e.stopPropagation(); // Avoid opening preview
                    onDelete();
                }}
                aria-label="Remove asset"
            >
                <Trash2 size={12} />
            </button>

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
                    <span>Unlocked {item.unlocked_at ? new Date(item.unlocked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}</span>
                </div>
            </div>
        </motion.div>
    );
}

function EngineLauncher({ item, onClose }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulations are fully interactive quests, so jump into the QuestRunner!
        if (item.type === 'SIM') {
            navigate('/quest', { state: { questKey: item.path, subject: item.subject, nodeType: 'EXPLORE' } });
            onClose();
            return;
        }

        async function fetchContent() {
             try {
                 const res = await loadQuestSteps(item.subject || 'general', 'vault', 'vault', item.path);
                 if (res && res.steps && res.steps.length > 0) {
                     setStep(res.steps[0]);
                 } else {
                     setStep({ engineType: 'NOTE_EXPLORER', data: { file: item.path, title: item.title, subject: item.subject } });
                 }
             } catch(e) {
                 console.error('[LibraryView] EngineLauncher error:', e);
                 setStep({ engineType: 'NOTE_EXPLORER', data: { file: item.path, title: item.title, subject: item.subject } });
             }
             setLoading(false);
        }
        fetchContent();
    }, [item, navigate, onClose]);

    if (item.type === 'SIM') return null; // handled by navigate
    if (loading) return <div className="flex flex-col items-center justify-center h-full text-[var(--text-sub)]"><div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin mb-4" />Loading...</div>;
    if (!step) return <div className="p-8 text-center opacity-50">No content available.</div>;

    const data = step.data || { file: item.path, title: item.title, subject: item.subject };
    const eType = step.engineType || (item.type === 'RECAP' ? 'READER_STUDY' : 'NOTE_EXPLORER');
    
    const meta = getEngineMetadata(eType);
    if (meta && meta.component) {
        const DynamicEngine = meta.component;
        return <DynamicEngine data={data} onComplete={onClose} skipDiscovery={true} />;
    }

    // Fallback if engine missing
    return <NoteExplorerEngine data={data} onComplete={onClose} skipDiscovery={true} />;
}

function VaultLoader({ color }) {
    return (
        <div className="vault-loader">
            <div className="loader-orbit" style={{ borderColor: color }} />
        </div>
    );
}


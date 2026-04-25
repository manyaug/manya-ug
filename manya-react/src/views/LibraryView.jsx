import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, X, Zap, ChevronRight,
    Search, Filter, LayoutGrid, List
} from 'lucide-react';
import '../styles/library.css';
import { IMAGES, getIsland } from '../config/assetUrls';

// Lazy Load Engines for Preview
const NoteExplorerEngine = lazy(() => import('../engines/shared-engines/NoteExplorerEngine.jsx'));
const ThreeDStudyEngine = lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'));
const ReaderStudyEngine = lazy(() => import('../engines/shared-engines/ReaderStudyEngine.jsx'));
const ImageHotspotsEngine = lazy(() => import('../engines/shared-engines/ImageHotspotsEngine.jsx'));
const UniversalGlobeEngine = lazy(() => import('../engines/sst/UniversalGlobeEngine.jsx'));
const SetStudyEngine = lazy(() => import('../engines/math/SetStudyEngine.jsx'));

const SUBJECTS = [
    { id: 'math', label: 'Math', color: '#7c3aed', icon: 'math' },
    { id: 'science', label: 'Sci', color: '#10b981', icon: 'science' },
    { id: 'english', label: 'Eng', color: '#db2777', icon: 'english' },
    { id: 'sst', label: 'SST', color: '#f59e0b', icon: 'sst' },
];

function LibraryView() {
    const user = useSelector(s => s.user.data);
    const discovered = useMemo(() => user.vaultArtifacts || [], [user.vaultArtifacts]);
    
    const [activeSub, setActiveSub] = useState('science');
    const [previewItem, setPreviewItem] = useState(null);

    // Only allow pure study/archival materials, exclude interactive engines here
    const STUDY_TYPES = ['3d', 'glb', 'note', 'dictionary', 'recap', 'map', 'set_study'];

    // Filter by Subject & Type
    const filteredItems = useMemo(() => {
        return discovered.filter(item => 
            item.subject?.toLowerCase() === activeSub && 
            STUDY_TYPES.includes(item.type?.toLowerCase())
        );
    }, [discovered, activeSub]);

    // Group by Grade -> Topic
    const groupedItems = useMemo(() => {
        const groups = {};
        const sortedItems = [...filteredItems].sort((a, b) => new Date(b.discoveredAt || 0) - new Date(a.discoveredAt || 0));
        
        sortedItems.forEach(item => {
            const grade = item.grade || 'General';
            const topic = item.topic || 'Uncategorized';
            
            if (!groups[grade]) groups[grade] = {};
            if (!groups[grade][topic]) groups[grade][topic] = [];
            groups[grade][topic].push(item);
        });
        
        return groups;
    }, [filteredItems]);

    const activeColor = SUBJECTS.find(s => s.id === activeSub)?.color || '#7c3aed';

    return (
        <div className="elite-vault-root">
            {/* 💎 ULTRA-COMPACT HUD */}
            <header className="vault-minimal-header !mb-3">
                <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-black text-slate-400 tracking-[4px] uppercase">Knowledge Archive</span>
                    <div className="vault-count-pill !m-0 !py-1.5">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span className="text-[10px]">{filteredItems.length} TOTAL</span>
                    </div>
                </div>
            </header>

            {/* 📑 SUBJECT SCROLLER */}
            <div className="subject-scroller-container">
                <div className="subject-scroller">
                    {SUBJECTS.map(sub => (
                        <button
                            key={sub.id}
                            className={`sub-tab ${activeSub === sub.id ? 'active' : ''}`}
                            onClick={() => setActiveSub(sub.id)}
                            style={{ '--sub-color': sub.color }}
                        >
                            <img src={getIsland(sub.id)} alt={sub.label} className="sub-tab-icon" />
                            <span>{sub.label.toUpperCase()}</span>
                            {activeSub === sub.id && (
                                <motion.div layoutId="active-pill" className="sub-active-indicator" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 📦 ARTIFACT SHELF */}
            <main className="artifact-shelf">
                <AnimatePresence mode="wait">
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="shelf-empty-state"
                        >
                            <div className="empty-mascot-orb">
                                <img src={IMAGES.manya_icon} alt="Manya" />
                                <div className="orb-glow" style={{ background: activeColor }} />
                            </div>
                            <h3 style={{ color: activeColor }}>NO {activeSub.toUpperCase()} DISCOVERIES</h3>
                            <p>Complete quests in {activeSub} to populate this shelf with 3D relics and recaps.</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="grid"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full pb-8"
                        >
                            {Object.entries(groupedItems)
                                // Sort grades so younger grades come first
                                .sort(([gradeA], [gradeB]) => {
                                    const numA = parseInt(gradeA); const numB = parseInt(gradeB);
                                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                    return gradeA.localeCompare(gradeB);
                                })
                                .map(([grade, topics]) => (
                                <div key={grade} className="mb-8">
                                    <h3 className="vault-group-header">Grade {grade} Archive</h3>
                                    {Object.entries(topics).map(([topic, items]) => (
                                        <div key={topic} className="mb-6">
                                            <h4 className="vault-topic-header">{topic}</h4>
                                            <div className="artifact-grid">
                                                {items.map((item) => (
                                                    <motion.div 
                                                        key={item.id}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="elite-artifact-card"
                                                        onClick={() => setPreviewItem(item)}
                                                    >
                                                        <div className="artifact-strip" style={{ background: activeColor }} />
                                                        <div className="artifact-visual-box">
                                                            {(item.type === '3d' || item.type === 'glb') ? <BoxWidget accent={activeColor} /> : <NoteWidget accent={activeColor} />}
                                                        </div>
                                                        <div className="artifact-details">
                                                            <span className="artifact-type-tag">
                                                                {item.type === '3d' ? '3D RELIC' : (item.type === 'set_study' ? 'INTERACTIVE' : (item.type === 'dictionary' ? 'LEXICON' : 'STUDY NOTE'))}
                                                            </span>
                                                            <h4 className="artifact-name block truncate max-w-[200px]" title={item.title}>{item.title}</h4>
                                                            <div className="artifact-meta-line">
                                                                <Zap size={10} style={{ color: activeColor }} />
                                                                <span>Gathered {new Date(item.discoveredAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={18} className="artifact-arrow" />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* 📂 PREVIEW OVERLAY */}
            <AnimatePresence>
                {previewItem && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="preview-overlay"
                    >
                        <div className="preview-stage">
                            <div className="preview-header">
                                <div className="preview-title-box">
                                    <span className="p-type" style={{ color: activeColor }}>{previewItem.type.replace('_', ' ').toUpperCase()} // ARCHIVE</span>
                                    <h2 className="p-title">{previewItem.title}</h2>
                                </div>
                                <button className="p-close-btn" onClick={() => setPreviewItem(null)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="preview-mount">
                                <Suspense fallback={<div className="vault-loader"><div className="loader-orbit" style={{ borderTopColor: activeColor }} /></div>}>
                                    {(() => {
                                        const d = previewItem.data || {};
                                        // 🔮 UNIVERSAL ENGINE RESOLVER
                                        // 1. Set Theory / Visual Math Simulations
                                        if (d.slides?.[0]?.visualType || d.engine === 'SET_STUDY') {
                                            return <SetStudyEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                        }
                                        // 2. 3D & Binary Relics
                                        if (previewItem.type === '3d' || previewItem.type === 'glb' || d.modelUrl) {
                                            return <ThreeDStudyEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                        }
                                        // 3. Narrative Recaps
                                        if (previewItem.type === 'recap' || d.storySteps || d.mode === 'reader') {
                                            return <ReaderStudyEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                        }
                                        // 4. SST / Geo Simulation Globes
                                        if (previewItem.type === 'map' || d.globeConfig) {
                                            return <UniversalGlobeEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                        }
                                        // 5. Image Interactive Hotspots
                                        if (previewItem.type === 'image_hotspots' || d.hotspots) {
                                            return <ImageHotspotsEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                        }
                                        // Default: Standard Note Explorer
                                        return <NoteExplorerEngine data={d} onComplete={() => setPreviewItem(null)} skipDiscovery={true} />;
                                    })()}
                                </Suspense>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const BoxWidget = ({ accent }) => (
    <div className="widget-box" style={{ '--accent': accent }}>
        <div className="w-inner" />
        <Zap size={16} />
    </div>
);

const NoteWidget = ({ accent }) => (
    <div className="widget-note" style={{ '--accent': accent }}>
        <div className="n-inner" />
        <Sparkles size={16} />
    </div>
);

export default LibraryView;

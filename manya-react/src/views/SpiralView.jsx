/**
 * MANYA SPIRAL VIEW - v2.1 (Stability Fix)
 * Full-screen world map with alive nodes, custom floating HUD (no global HUD),
 * subject-specific gem pill, and direct quest-path routing on active node tap.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Lock, CheckCheck } from 'lucide-react';
import { setAmbientMode, setRainy, setNightMode } from '../store/audioSlice';
import { getPathImage, getGem } from '../config/assetUrls';
import { getQuestKey, loadAllProgress } from '../domain/progress/questProgressService.js';
import { fetchDynamicCurriculum, preloadCurriculum } from '../services/curriculumService';
import { getTopicAlias } from '../config/topicAliases';
import '../styles/spiral.css';

// ---- HOTSPOT POSITIONS (exact from original engine) ----
const ROAD_PATH = [
    { id: "point_1", x: 47.28, y: 85.79 },
    { id: "point_2", x: 50.68, y: 69.21 },
    { id: "point_3", x: 49.32, y: 54.19 },
    { id: "point_4", x: 54.15, y: 39.96 }, // Refined: 57 -> 54
    { id: "point_5", x: 45.19, y: 25.92 }, // Refined: 43 -> 45
    { id: "point_6", x: 53.47, y: 10.9  }, // Refined: 56 -> 53
];

const BIOMES = {
    math: {
        color: 'var(--manya-purple)',
        alpha: 'hsla(var(--manya-purple-h), 80%, 60%, 0.2)',
        bg: 'var(--subject-math-light)',
        icon: '📐',
        gemFile: 'math_gem.svg',
        folder: 'math_path',
        weather: 'snowflake',
        label: 'Mathematics World',
        progKey: 'prog_math',
        gemsKey: 'mathGems',
    },
    science: {
        color: 'var(--manya-green)',
        alpha: 'hsla(var(--manya-green-h), 80%, 40%, 0.2)',
        bg: 'var(--subject-science-light)',
        icon: '🌱',
        gemFile: 'science_svg.svg',
        folder: 'science_path',
        weather: 'rain-drop',
        label: 'Science World',
        progKey: 'prog_science',
        gemsKey: 'scienceGems',
    },
    sst: {
        color: 'var(--manya-gold)',
        alpha: 'hsla(var(--manya-gold-h), 80%, 50%, 0.2)',
        bg: 'var(--subject-sst-light)',
        icon: '🌍',
        gemFile: 'sst_gem.svg',
        folder: 'sst_path',
        weather: 'sand-wind',
        label: 'SST World',
        progKey: 'prog_sst',
        gemsKey: 'sstGems',
    },
    english: {
        color: 'var(--manya-pink)',
        alpha: 'hsla(var(--manya-pink-h), 80%, 50%, 0.2)',
        bg: 'var(--subject-english-light)',
        icon: '📖',
        gemFile: 'english_gem.svg',
        folder: 'english_path',
        weather: 'floating-symbol',
        label: 'English World',
        progKey: 'prog_english',
        gemsKey: 'englishGems',
    }
};

// ---- WEATHER PARTICLES ----
function WeatherLayer({ type, count = 50 }) {
    const particles = useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`, // Start anywhere on page
            duration: `${(Math.random() * 5 + 8).toFixed(2)}s`, // Slower
            delay: `-${(Math.random() * 10).toFixed(2)}s`,
            char: ['A', 'Ω', 'Σ', '!', '?', 'M', 'π'][Math.floor(Math.random() * 7)], // For English
        })),
    [count]);

    return (
        <div className="weather-mount">
            {particles.map(p => (
                <div
                    key={p.id}
                    className={`weather-particle ${type}`}
                    style={{ 
                        left: p.left, 
                        top: type === 'firefly' || type === 'floating-symbol' ? p.top : 'unset',
                        animationDuration: p.duration, 
                        animationDelay: p.delay 
                    }}
                >
                    {type === 'floating-symbol' ? p.char : null}
                </div>
            ))}
        </div>
    );
}

// ---- NODE COMPONENT ----
function GameNode({ unit, index, label, isCompleted, isActive, isUnlocked, biome, onTap, style }) {
    const stateClass = isActive ? 'active-node' : isCompleted ? 'completed-node' : 'locked-node';

    return (
        // OUTER DIV: Only handles absolute positioning and centering.
        // MUST NOT be a motion element — Framer Motion would wipe out translate(-50%, -50%).
        <div
            style={style}
            className={`game-node ${stateClass}`}
            onClick={() => onTap(unit, index, isUnlocked)}
        >
            {/* INNER motion element: Only controls hover/tap scale. No position transform conflict. */}
            <motion.div
                className="game-node-inner"
                whileHover={isUnlocked ? { scale: 1.1, y: -5 } : {}}
                whileTap={isUnlocked ? { scale: 0.9 } : {}}
            >
                {/* Stars above */}
                <AnimatePresence>
                    {isCompleted && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="node-star-rating"
                        >
                            <span className="earned">★</span>
                            <span className="earned">★</span>
                            <span className="earned">★</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main circle */}
                <div className="node-cap">
                    <div className="btn-toy-gloss" />
                    {isCompleted ? (
                        <CheckCheck size={26} strokeWidth={3} />
                    ) : isUnlocked ? (
                        <span className="node-cap-icon">{unit.nodeIcon || biome.icon}</span>
                    ) : (
                        <Lock size={21} strokeWidth={2.5} />
                    )}
                </div>

                {/* Label below */}
                <div className="node-label-elite">{label}</div>
            </motion.div>
        </div>
    );
}

// ---- MAIN SPIRAL VIEW ----
function SpiralView() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const { isNightMode } = useSelector(state => state.audio);
    const [curriculum, setCurriculum] = useState(null);
    const [failedTiles, setFailedTiles] = useState({});
    const containerRef = useRef(null);

    const sub = (subjectId || 'math').toLowerCase();
    const biome = BIOMES[sub] || BIOMES.math;
    const gemCount = user?.[biome.gemsKey] || 0;
    const progress = user?.[biome.progKey] || 0;

    // Reset failed tiles on subject switch
    useEffect(() => {
        setFailedTiles({});
    }, [sub]);

    // Set CSS variables for biome theme colours
    useEffect(() => {
        document.documentElement.style.setProperty('--biome-color', biome.color);
        document.documentElement.style.setProperty('--biome-bg', biome.bg);
        document.documentElement.style.setProperty('--biome-color-alpha', biome.alpha);
        return () => {
            document.documentElement.style.removeProperty('--biome-color');
            document.documentElement.style.removeProperty('--biome-bg');
            document.documentElement.style.removeProperty('--biome-color-alpha');
        };
    }, [biome]);

    // ---- 1. TIMED DAY/NIGHT CYCLE (45s cycle) ----
    useEffect(() => {
        const timer = setInterval(() => {
            dispatch(setNightMode(!isNightMode));
        }, 45000); 
        return () => clearInterval(timer);
    }, [dispatch, isNightMode]);

    // ---- 2. AMBIENT AUDIO & INITIAL WHOOSH ----
    useEffect(() => {
        // Only whoosh on entry
        dispatch(setAmbientMode(isNightMode ? 'night' : 'day'));
        
        if (sub === 'science' && !isNightMode) {
            dispatch(setRainy(true));
        } else {
            dispatch(setRainy(false));
        }

        return () => { dispatch(setRainy(false)); };
    }, [dispatch, isNightMode, sub]);

    // ---- 3. SEPARATE ENTRY EFFECT ----
    useEffect(() => {
        const whooshTimer = setTimeout(() => {
            audioService.whoosh();
        }, 600);
        return () => clearTimeout(whooshTimer);
    }, []);

    // Load curriculum JSON or Dynamic DB content
    useEffect(() => {
        const load = async () => {
            try {
                if (sub === 'english') {
                    // Level 1.0: Dynamic DB-Driven World
                    const dynamic = await fetchDynamicCurriculum('english');
                    setCurriculum(prev => ({ ...prev, english: dynamic }));
                } else {
                    // Legacy: JSON-Driven World
                    const data = await preloadCurriculum();
                    setCurriculum(prev => ({ ...prev, ...data }));
                }
            } catch (e) {
                console.error('Spiral curriculum load failed:', e);
            }
        };
        load();
    }, [sub]);

    // ---- 4. UNIT DISCOVERY & STABILITY ----
    const units = useMemo(() => {
        if (!curriculum || !curriculum[sub]) return [];
        
        return curriculum[sub].units.flatMap(u =>
            u.quests?.map((q, qIdx) => ({ 
                ...q, 
                unitId: u.id,
                uniqueKey: `${sub}-${u.id}-${q.folder || q.title || qIdx}`
            })) || []
        );
    }, [curriculum, sub]);

    // Scroll to active node after curriculum loaded
    useEffect(() => {
        if (!curriculum) return;
        setTimeout(() => {
            const el = document.querySelector('.game-node.active-node');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 350);
    }, [curriculum]);

    const handleNodeTap = (unit, index, isUnlocked) => {
        if (!isUnlocked) return;
        
        const biome = curriculum[sub] || {};

        navigate('/quest-path', {
            state: {
                subject: sub,
                unitId: unit.unitId,
                title: unit.title,
                gemFile: biome.gemFile || 'math_gem.svg',
                biomeColor: biome.theme || 'var(--manya-purple)',
            }
        });
    };

    // Layout constants matching original engine
    const TILE_HEIGHT = 850;
    const OVERLAP = 85;
    const EFFECTIVE_HEIGHT = TILE_HEIGHT - OVERLAP;
    const nodesPerTile = ROAD_PATH.length;
    const BOTTOM_BUFFER = -10; // Let the texture sink perfectly behind the nav bar
    const TOP_BUFFER = 20;


    const totalTiles = Math.max(1, Math.ceil(units.length / nodesPerTile));
    const totalHeight = BOTTOM_BUFFER + TILE_HEIGHT + ((totalTiles > 1 ? totalTiles - 1 : 0) * EFFECTIVE_HEIGHT) + TOP_BUFFER;

    const tiles = Array.from({ length: totalTiles }, (_, i) => ({
        i,
        src: getPathImage(sub, `way-${(i % 10) + 1}.webp`),
        bottom: BOTTOM_BUFFER + i * EFFECTIVE_HEIGHT,
        zIndex: i,
    }));

    const allQuestProgress = useMemo(() => loadAllProgress(sub), [sub]);

    // MEMOIZE NODES FOR STABILITY
    const nodes = useMemo(() => {
        return units.map((unit, i) => {
            const coord = ROAD_PATH[i % nodesPerTile];
            const tileIdx = Math.floor(i / nodesPerTile);
            const yPxFromTileBottom = ((100 - coord.y) / 100) * TILE_HEIGHT;
            const bottomOffset = BOTTOM_BUFFER + (tileIdx * EFFECTIVE_HEIGHT) + yPxFromTileBottom;

            // Check actual completion status from questProgressService
            const qKey = getQuestKey(sub, unit.unitId, unit.folder || unit.title);
            const qProg = allQuestProgress[qKey] || {};
            const isFinished = qProg.MASTERY?.status === 'completed';

            // Visual Variety: Alternate icons if nodes feel "repeating"
            // Use different icons based on quest order or title (e.g. check for "Final")
            const isFinal = (unit.title || unit.folder || "").toLowerCase().includes("final");
            const nodeIcon = isFinal ? '🏆' : (i % 2 === 0 ? biome.icon : '✨');

            // Resolve modern child-friendly short name
            const rawTitle = unit.title || `Node ${i + 1}`;
            const displayName = getTopicAlias(sub, rawTitle);

            return {
                unit, i,
                coord,
                bottomOffset,
                isUnlocked: true, // ALL QUESTS OPEN (as requested)
                isActive: i === progress, // suggested/linear pointer
                isCompleted: isFinished,
                uniqueKey: unit.uniqueKey,
                nodeIcon,
                displayName
            };
        });
    }, [units, allQuestProgress, progress, biome.icon, sub]);

    return (
        <div className={`spiral-view animate-in ${isNightMode ? 'is-night' : ''}`}>
            {/* VIGNETTE MIST */}
            <div className="spiral-mist-vignette" />

            {/* AMBIENT WEATHER / FIREFLIES */}
            {isNightMode ? (
                <WeatherLayer type="firefly" count={30} />
            ) : (
                <WeatherLayer type={biome.weather} count={45} />
            )}

            {/* FLOATING SUBJECT HUD — replaces global HUD on this page */}
            <div className="spiral-hud">
                <div className="spiral-hud-shell">
                    <div className="btn-toy-gloss" />
                    <button className="spiral-back-btn" onClick={() => navigate('/home')}>
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>

                    <span className="spiral-hud-title">{biome.label}</span>

                    <div
                        className="spiral-gem-pill"
                        onClick={() => navigate('/achievements')}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="btn-toy-gloss" />
                        <img
                            src={getGem(biome.gemFile)}
                            alt="gem"
                            className="spiral-gem-img"
                        />
                        <span className="spiral-gem-count">{gemCount}</span>
                    </div>
                </div>
            </div>

            {/* SCROLLABLE MAP */}
            <div className="spiral-map-container" ref={containerRef}>
                <div className="map-canvas" style={{ height: `${totalHeight}px` }}>

                    {/* PATH TILES */}
                    {curriculum && tiles.map(tile => (
                        <img
                            key={tile.i}
                            src={tile.src}
                            className="physical-tile"
                            alt=""
                            style={{
                                bottom: `${tile.bottom}px`,
                                zIndex: tile.zIndex,
                                opacity: failedTiles[tile.i] ? 0 : 1
                            }}
                            onError={() => {
                                console.error(`[SpiralView] Background tile ${tile.i} failed to load from: ${tile.src}`);
                                setFailedTiles(prev => ({ ...prev, [tile.i]: true }));
                            }}
                        />
                    ))}

                    {/* NODES */}
                    {nodes.map((node) => (
                        <GameNode
                            key={node.uniqueKey}
                            unit={node.unit}
                            index={node.i}
                            label={node.displayName}
                            isUnlocked={node.isUnlocked}
                            isActive={node.isActive}
                            isCompleted={node.isCompleted}
                            biome={biome}
                            onTap={handleNodeTap}
                            style={{
                                position: 'absolute',
                                bottom: `${node.bottomOffset}px`,
                                left: `${node.coord.x}%`,
                                zIndex: 20,
                            }}
                        />
                    ))}

                    {/* LOADING SCREEN */}
                    {!curriculum && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            zIndex: 200,
                        }}>
                            <div style={{ fontSize: '52px', animation: 'activePulse 2s infinite' }}>{biome.icon}</div>
                            <p style={{ fontWeight: 900, color: biome.color, marginTop: 12 }}>Loading the world…</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SpiralView;

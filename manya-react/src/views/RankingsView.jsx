import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { getGem, IMAGES } from '../config/assetUrls';
import '../styles/ranking.css';

function RankingsView() {
    const user = useSelector((state) => state.user.data);
    const [activeTabId, setActiveTabId] = useState('Overall');

    const subjects = [
        { id: 'Overall', label: 'TOP', gem: getGem('master'), color: '#7c3aed' },
        { id: 'Math', label: 'MATH', gem: getGem('math'), color: '#6366F1' },
        { id: 'Science', label: 'SCI', gem: getGem('science'), color: '#10B981' },
        { id: 'SST', label: 'SST', gem: getGem('sst'), color: '#F59E0B' },
        { id: 'English', label: 'ENG', gem: getGem('english'), color: '#DB2777' }
    ];

    const activeSub = subjects.find(s => s.id === activeTabId) || subjects[0];
    const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`;

    const competitors = [4, 5, 6, 7, 8, 9, 10];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="rank-view"
        >

            {/* 1. HEADER AREA */}
            <div className="rank-arena-header">
                <div className="live-pulse-dot"></div>
                <h2 className="arena-title">National Arena</h2>
                <p className="arena-subtitle">Uganda P.7 Hero Rankings</p>
            </div>

            {/* 2. LEAGUE HUD - SLIM HORIZONTAL BENTO */}
            <motion.div variants={itemVariants} className="px-5 mb-5">
                <div className="bento-card-elite !p-3 !flex !flex-row !items-center !justify-between relative">
                    <div className="toy-card-gloss" />
                    
                    {/* SEGMENT 1: MEDAL */}
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/10 dark:bg-white/5 flex items-center justify-center text-3xl border border-slate-900/5 dark:border-white/10">
                            🥈
                        </div>
                        <div className="text-left">
                            <h3 className="text-[14px] font-black text-slate-700 dark:text-white leading-none">{user?.league || 'Silver'} League</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1.5">Top 10 promote to Gold</p>
                        </div>
                    </div>

                    {/* SEGMENT 2: PROGRESS (CENTER HUD) */}
                    <div className="hidden sm:flex flex-col flex-1 mx-8 relative z-10">
                        <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: '65%', background: activeSub.color }}></div>
                        </div>
                    </div>

                    {/* SEGMENT 3: RANK */}
                    <div className="flex items-center gap-4 relative z-10 pl-4 border-l border-slate-100 dark:border-white/10">
                        <div className="text-right">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Current Rank</div>
                             <div className="text-[14px] font-black text-white px-3 py-1 rounded-lg" style={{ background: activeSub.color }}>#24</div>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Progress Bar (Shown below HUD if screen is small) */}
                <div className="sm:hidden mt-3 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mx-1">
                    <div className="h-full rounded-full" style={{ width: '65%', background: activeSub.color }}></div>
                </div>
            </motion.div>

            {/* 3. CANDY SUBJECT ORBS */}
            <div className="rank-tabs-row">
                {subjects.map(s => (
                    <div
                        key={s.id}
                        className={`rank-tab-pill ${activeTabId === s.id ? 'active' : ''}`}
                        onClick={() => setActiveTabId(s.id)}
                        style={{ 
                            '--tab-color': s.color,
                            '--shadow-color': `${s.color}66`
                        }}
                    >
                        <div className="btn-toy-gloss" style={{ height: '30%' }} />
                        <img src={s.gem} className="tab-gem-icon" alt={s.label} />
                        <span>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* 4. THE SUBJECT PODIUM */}
            <div className="podium-section">
                {/* Thor Glow removed to eliminate all background gradients */}

                <motion.div variants={itemVariants} className="pod-card pod-rank-2">
                    <div className="btn-toy-gloss" style={{ height: '30%' }} />
                    <div className="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah" />
                    </div>
                    <p className="pod-name" style={{ zIndex: 2 }}>Sarah .A</p>
                    <div className="pod-score-pill" style={{ zIndex: 2 }}>
                        <img src={activeSub.gem} className="pod-gem" alt="gem" />
                        <span>14.2k</span>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="pod-card pod-rank-1">
                    <div className="btn-toy-gloss" style={{ height: '30%' }} />
                    <div className="crown-badge">👑</div>
                    <div className="pod-avatar-wrap">
                        <img src={userAvatar} alt="You" />
                    </div>
                    <p className="pod-name" style={{ zIndex: 2 }}>YOU</p>
                    <div className="pod-score-pill" style={{ zIndex: 2 }}>
                        <img src={activeSub.gem} className="pod-gem" alt="gem" />
                        <span>{((user?.xp || 15000) / 1000).toFixed(1)}k</span>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="pod-card pod-rank-3">
                    <div className="btn-toy-gloss" style={{ height: '30%' }} />
                    <div className="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" alt="Musa" />
                    </div>
                    <p className="pod-name" style={{ zIndex: 2 }}>Musa .O</p>
                    <div className="pod-score-pill" style={{ zIndex: 2 }}>
                        <img src={activeSub.gem} className="pod-gem" alt="gem" />
                        <span>12.8k</span>
                    </div>
                </motion.div>
            </div>

            {/* 5. LEADERBOARD LIST */}
            <motion.div variants={itemVariants} className="leaderboard-card-elite">
                <div className="list-header">
                    <span>ELITE COMPETITORS</span>
                    <span>GEMS EARNED</span>
                </div>

                {competitors.map((r, idx) => (
                    <motion.div
                        variants={itemVariants}
                        key={r}
                        className="rank-row-elite"
                    >
                        <span className="r-pos">#{r}</span>
                        <div className="r-avatar">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=P7Candidate${r}`} alt={`Hero ${r}`} />
                        </div>
                        <div className="r-info">
                            <span className="r-name">Scholar Hero {r}</span>
                            <span className="r-xp">{(12000 - (r * 750)).toLocaleString()} XP</span>
                        </div>
                        <div className="r-stat">
                            <img src={activeSub.gem} className="r-gem" alt="gem" />
                            <span className="r-gem-count">{35 - r}</span>
                        </div>
                    </motion.div>
                ))}

                <motion.div
                    variants={itemVariants}
                    className="rank-row-elite is-user"
                    style={{ '--tab-color': activeSub.color }}
                >
                    <div className="btn-toy-gloss" style={{ height: '30%' }} />
                    <span className="r-pos" style={{ zIndex: 2 }}>#24</span>
                    <div className="r-count-glow" style={{ background: activeSub.color }}></div>
                    <div className="r-avatar" style={{ zIndex: 2 }}>
                        <img src={userAvatar} alt="You" />
                    </div>
                    <div className="r-info" style={{ zIndex: 2 }}>
                        <span className="r-name">{user?.nickname || 'You'} (YOU)</span>
                        <span className="r-xp">{(user?.xp || 0).toLocaleString()} XP</span>
                    </div>
                    <div className="r-stat" style={{ zIndex: 2 }}>
                        <img src={activeSub.gem} className="r-gem" alt="gem" />
                        <span className="r-gem-count">{user?.diamonds || 12}</span>
                    </div>
                </motion.div>
            </motion.div>



        </motion.div>
    );
}

export default RankingsView;

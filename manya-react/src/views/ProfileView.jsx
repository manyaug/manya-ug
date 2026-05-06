import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Sliders,
    UserCog,
    Crown,
    Flame,
    Target,
    Trophy,
    ChevronRight,
    BrainCircuit
} from 'lucide-react';
import { getIsland, IMAGES } from '../config/assetUrls';
import '../styles/profile.css';

function ProfileView() {
    const user = useSelector((state) => state.user.data);
    const navigate = useNavigate();

    // --- NATIONAL ARENA VARIANTS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const stats = { rank: "Advanced Hero", league: "Bronze League", leagueColor: "#CD7F32" };

    const subjectProgress = [
        { name: 'Mathematics', val: 78, color: '#7c3aed', icon: getIsland('math') },
        { name: 'Science', val: 45, color: '#10b981', icon: getIsland('science') },
        { name: 'SST', val: 62, color: '#f59e0b', icon: getIsland('sst') },
        { name: 'English', val: 90, color: '#db2777', icon: getIsland('english') }
    ];

    const past7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const days = past7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#818cf8', '#a78bfa', '#f472b6'];

    const rawEngagementsHours = past7Days.map(d => {
        const dateStr = d.toISOString().split('T')[0];
        return (user?.engagement_stats?.[dateStr] || 0) / (1000 * 60 * 60);
    });

    const totalWeeklyHours = rawEngagementsHours.reduce((a, b) => a + b, 0);
    const totalWeeklyFormat = `${Math.floor(totalWeeklyHours)}hr ${Math.floor((totalWeeklyHours % 1) * 60)}min`;

    const maxHours = Math.max(...rawEngagementsHours, 1);
    const heights = rawEngagementsHours.map(h => (h / maxHours) * 95);

    const maxIdx = heights.indexOf(Math.max(...heights));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="profile-page"
        >
            {/* Aurora Engine removed for Opaque style */}

            <motion.div variants={itemVariants} className="hero-passport-header">
                <div className="avatar-preview-halo">
                    <div className="avatar-circle">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="Avatar" />
                        <div className="orb-thor-glow"></div>
                    </div>
                </div>
                <h2 className="hero-display-name">{(user?.nickname || 'Hero').toUpperCase()}</h2>
                <div className="hero-rank-pill">{stats.rank.toUpperCase()}</div>
                <div className="hero-title-tag">Elite Manya Explorer</div>
            </motion.div>

            {/* GEM TREASURY (Phase 1 💎) */}
            <motion.div variants={itemVariants} className="px-4 mb-4">
                <div className="bento-card-elite p-4">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gem Treasury</span>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <img src={IMAGES.coin_gem} className="w-3 h-3" />
                            <span className="text-[10px] font-black text-amber-600">{(user?.coins || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 relative z-10">
                        {[
                            { name: 'Math', val: user?.mathGems || 0, img: IMAGES.math_gem, color: 'var(--manya-purple)' },
                            { name: 'Science', val: user?.scienceGems || 0, img: IMAGES.science_gem, color: '#10b981' },
                            { name: 'SST', val: user?.sstGems || 0, img: IMAGES.sst_gem, color: '#f59e0b' },
                            { name: 'English', val: user?.englishGems || 0, img: IMAGES.english_gem, color: '#f43f5e' }
                        ].map(gem => (
                            <div key={gem.name} className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-white dark:border-white/10 shadow-sm flex items-center justify-center group overflow-hidden relative">
                                    <img src={gem.img} className="w-7 h-7 object-contain group-hover:scale-110 transition-transform" alt={gem.name} />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
                                </div>
                                <span className="text-[14px] font-black" style={{ color: gem.color }}>{gem.val}</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{gem.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 2. FORCED HORIZONTAL HUD */}
            <motion.div variants={itemVariants} className="px-4 mb-3">
                <div className="bento-card-elite bento-card-wide !p-3 !flex !flex-row !items-center !justify-around">
                    <div className="toy-card-gloss" />
                    
                    {/* STREAK SEGMENT */}
                    <div className="flex items-center gap-3 relative z-10 flex-1 justify-center">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                            <Flame size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Streak</p>
                            <p className="text-[12px] font-black text-slate-700 dark:text-white leading-none whitespace-nowrap">{user?.current_streak || 0} Days</p>
                        </div>
                    </div>

                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10 relative z-10" />

                    {/* LEAGUE SEGMENT */}
                    <div className="flex items-center gap-3 relative z-10 flex-1 justify-center" onClick={() => navigate('/rankings')}>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <Trophy size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">League</p>
                            <p className="text-[12px] font-black text-amber-600 leading-none whitespace-nowrap">{user?.league || 'Bronze'}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* 3. LEARNING ACTIVITY (GLASS) */}
            <motion.div variants={itemVariants} className="activity-card-national">
                <div className="toy-card-gloss" />
                <div className="activity-header">
                    <div className="activity-icon-halo">
                        <BrainCircuit size={20} color="#7c3aed" />
                    </div>
                    <div>
                        <div className="activity-title">Matrix Engagement</div>
                        <div className="activity-sub">{totalWeeklyFormat} focused this week</div>
                    </div>
                </div>
                <div className="bar-chart-national">
                    {days.map((day, i) => (
                        <div key={day} className="chart-column">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heights[i]}px` }}
                                transition={{ delay: 0.5 + (i * 0.05), duration: 1, ease: "easeOut" }}
                                className={`bar-pillar ${i === maxIdx && heights[i] > 0 ? 'active' : ''}`}
                                style={{ background: colors[i] }}
                            >
                                {i === maxIdx && heights[i] > 0 && <div className="bar-callout">{rawEngagementsHours[i].toFixed(1)}h</div>}
                            </motion.div>
                            <span className="pillar-label">{day}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* 4. ACADEMIC PULSE (CONSOLIDATED) */}
            <motion.h4 variants={itemVariants} className="section-label">Academic Pulse</motion.h4>
            <motion.div variants={itemVariants} className="px-4 mb-6">
                <div className="sub-progress-elite academic-mini-matrix p-5">
                    <div className="toy-card-gloss" />
                    
                    {[
                        { name: 'Mathematics', val: 78, color: 'var(--manya-purple)', img: IMAGES.math_gem },
                        { name: 'Science', val: 45, color: '#10b981', img: IMAGES.science_gem },
                        { name: 'SST', val: 62, color: '#f59e0b', img: IMAGES.sst_gem },
                        { name: 'English', val: 90, color: '#f43f5e', img: IMAGES.english_gem }
                    ].map((subj, idx) => (
                        <div key={idx} className="mb-4 last:mb-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <img src={subj.img} alt={subj.name} className="w-5 h-5 object-contain" />
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{subj.name}</span>
                                </div>
                                <span className="text-[11px] font-black text-slate-500">{subj.val}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${subj.val}%` }}
                                    className="h-full"
                                    style={{ background: subj.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
            <motion.h4 variants={itemVariants} className="section-label">Hero Management</motion.h4>
            <motion.div variants={itemVariants} className="service-list-national">
                <div className="service-row-elite btn-toy btn-toy-purple" onClick={() => navigate('/settings')}>
                    <div className="toy-card-gloss" />
                    <div className="s-icon-box" style={{ background: 'white', color: 'var(--manya-purple)' }}>
                        <UserCog size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">Profile Settings</span>
                        <span className="s-desc" style={{ color: 'white', opacity: 0.9 }}>Nickname, DNA & Academic Grade</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>

                <div className="service-row-elite btn-toy btn-toy-purple" onClick={() => navigate('/preferences')}>
                    <div className="toy-card-gloss" />
                    <div className="s-icon-box" style={{ background: 'white', color: 'var(--manya-purple)' }}>
                        <Sliders size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">App Preferences</span>
                        <span className="s-desc" style={{ color: 'white', opacity: 0.9 }}>Audio, Theme & Matrix Sync</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>

                <div className="service-row-elite btn-toy btn-toy-purple" onClick={() => navigate('/membership')}>
                    <div className="toy-card-gloss" />
                    <div className="s-icon-box" style={{ background: 'white', color: 'var(--manya-purple)' }}>
                        <Crown size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">Elite Hero Status</span>
                        <span className="s-desc" style={{ color: 'white', fontWeight: 900 }}>{user?.status || 'Free Scholar'}</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>
            </motion.div>


        </motion.div>
    );
}

export default ProfileView;

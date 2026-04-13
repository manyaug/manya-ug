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

    // --- LEAGUE & LEVEL LOGIC ---
    const xpToLevel = (xp) => {
        const level = Math.floor((xp || 0) / 1000) + 1;
        const progress = (xp % 1000) / 10;
        const offset = 339.29 - (339.29 * (progress / 100));

        let rank = "Novice Hero";
        let league = "Bronze League";
        let leagueColor = "#CD7F32";

        if (level > 2) { rank = "Rising Scholar"; league = "Silver League"; leagueColor = "#94a3b8"; }
        if (level > 5) { rank = "Elite Hero"; league = "Gold League"; leagueColor = "#f59e0b"; }
        if (level > 10) { rank = "Manya Legend"; league = "Crystal League"; leagueColor = "#06b6d4"; }

        return { level, progress, offset, rank, league, leagueColor };
    };

    const stats = xpToLevel(user?.xp || 150);

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
            {/* 0. DYNAMIC AURORA ENGINE */}
            <div className="aurora-engine">
                <div className="blob aurora-1"></div>
                <div className="blob aurora-2"></div>
            </div>

            {/* 1. HERO IDENTITY (XP RING) */}
            <motion.div variants={itemVariants} className="hero-passport-header">
                <div className="xp-ring-container">
                    <svg className="xp-ring-svg" viewBox="0 0 120 120">
                        <circle className="ring-bg" cx="60" cy="60" r="54"></circle>
                        <motion.circle
                            initial={{ strokeDashoffset: 339.29 }}
                            animate={{ strokeDashoffset: stats.offset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="ring-fill"
                            cx="60" cy="60" r="54"
                            style={{ strokeDasharray: 339.29 }}
                        />
                    </svg>
                    <div className="avatar-circle">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="Avatar" />
                        <div className="orb-thor-glow"></div>
                    </div>
                    <div className="level-badge">LVL {stats.level}</div>
                </div>
                <h2 className="hero-display-name">{(user?.nickname || 'Hero').toUpperCase()}</h2>
                <div className="hero-rank-pill">{stats.rank.toUpperCase()}</div>
                <div className="hero-title-tag">System Administrator</div>
            </motion.div>

            {/* 2. ANALYTICS BENTO GRID (UPGRADED) */}
            <motion.div variants={itemVariants} className="bento-grid">
                <div className="bento-card-elite streak">
                    <div className="card-glass-glow"></div>
                    <div className="bento-icon-box">
                        <Flame size={20} color="#f97316" />
                    </div>
                    <span className="bento-label">HERO STREAK</span>
                    <div className="bento-val">{user?.current_streak || 0} DAYS</div>
                </div>

                <div className="bento-card-elite league">
                    <div className="card-glass-glow" style={{ background: stats.leagueColor, opacity: 0.1 }}></div>
                    <div className="bento-icon-box" style={{ background: `${stats.leagueColor}20` }}>
                        <Trophy size={20} color={stats.leagueColor} />
                    </div>
                    <span className="bento-label">LEAGUE STATUS</span>
                    <div className="bento-val" style={{ color: stats.leagueColor }}>{stats.league.toUpperCase()}</div>
                </div>
            </motion.div>

            {/* 3. LEARNING ACTIVITY (GLASS) */}
            <motion.div variants={itemVariants} className="activity-card-national">
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
                                style={{ background: i === maxIdx && heights[i] > 0 ? undefined : colors[i] }}
                            >
                                {i === maxIdx && heights[i] > 0 && <div className="bar-callout">{rawEngagementsHours[i].toFixed(1)}h</div>}
                                <div className="pillar-glow" style={{ background: colors[i], opacity: 0.3 }}></div>
                            </motion.div>
                            <span className="pillar-label">{day}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* 4. SUBJECT PROGRESS (GLASS STACK) */}
            <motion.h4 variants={itemVariants} className="section-label">Curriculum Matrix</motion.h4>
            <motion.div variants={itemVariants} className="subject-stack-national">
                {subjectProgress.map((sub, idx) => (
                    <motion.div
                        key={sub.name}
                        variants={itemVariants}
                        className="sub-progress-elite"
                    >
                        <div className="sub-row">
                            <div className="sub-meta">
                                <img src={sub.icon} className="sub-avatar-tiny" alt={sub.name} />
                                <span className="sub-name">{sub.name}</span>
                            </div>
                            <span className="sub-value">{sub.val}%</span>
                        </div>
                        <div className="matrix-track">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${sub.val}%` }}
                                transition={{ delay: 0.8 + (idx * 0.1), duration: 1.2 }}
                                className="matrix-fill"
                                style={{ backgroundColor: sub.color }}
                            >
                                <div className="fill-shine"></div>
                            </motion.div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* 5. HERO MANAGEMENT SERVICES */}
            {/* 5. HERO MANAGEMENT SERVICES */}
            <motion.h4 variants={itemVariants} className="section-label">Hero Management</motion.h4>
            <motion.div variants={itemVariants} className="service-list-national">
                <div className="service-row-elite btn-toy btn-toy-slate" onClick={() => navigate('/settings')}>
                    <div className="btn-toy-gloss"></div>
                    <div className="s-icon-box" style={{ background: '#f8fafc', color: '#475569' }}>
                        <UserCog size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">Profile Settings</span>
                        <span className="s-desc" style={{ color: 'rgba(255,255,255,0.7)' }}>Nickname, DNA & Academic Grade</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>

                <div className="service-row-elite btn-toy btn-toy-green" onClick={() => navigate('/preferences')}>
                    <div className="btn-toy-gloss"></div>
                    <div className="s-icon-box" style={{ background: '#f0fdf4', color: '#166534' }}>
                        <Sliders size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">App Preferences</span>
                        <span className="s-desc" style={{ color: 'rgba(255,255,255,0.7)' }}>Audio, Theme & Matrix Sync</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>

                <div className="service-row-elite btn-toy btn-toy-gold" onClick={() => navigate('/membership')}>
                    <div className="btn-toy-gloss"></div>
                    <div className="s-icon-box" style={{ background: '#fffbeb', color: '#92400e' }}>
                        <Crown size={20} />
                    </div>
                    <div className="s-content" style={{ zIndex: 2 }}>
                        <span className="s-name">Elite Hero Status</span>
                        <span className="s-desc" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 900 }}>{user?.status || 'Free Scholar'}</span>
                    </div>
                    <ChevronRight size={18} className="s-chevron" style={{ zIndex: 2 }} />
                </div>
            </motion.div>


        </motion.div>
    );
}

export default ProfileView;

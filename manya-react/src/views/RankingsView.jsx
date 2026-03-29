import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/ranking.css';

function RankingsView() {
  const user = useSelector((state) => state.user.data);
  const [activeTabId, setActiveTabId] = useState('Overall');

  const subjects = [
    { id: 'Overall', label: 'Overall', gem: 'master_gem.svg', color: '#7c3aed' },
    { id: 'Math', label: 'Math', gem: 'math_gem.svg', color: '#6366F1' },
    { id: 'Science', label: 'Science', gem: 'science_svg.svg', color: '#10B981' },
    { id: 'SST', label: 'SST', gem: 'sst_gem.svg', color: '#F59E0B' },
    { id: 'English', label: 'English', gem: 'english_gem.svg', color: '#DB2777' }
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
        {/* DYNAMIC AURORA BLOBS */}
        <div className="aurora-engine">
            <div className="blob aurora-1"></div>
            <div className="blob aurora-2"></div>
        </div>
        
        {/* 1. HEADER AREA */}
        <div className="rank-arena-header">
            <div className="live-pulse-dot"></div>
            <h2 className="arena-title">National Arena</h2>
            <p className="arena-subtitle">Uganda P.7 Hero Rankings</p>
        </div>

        {/* 2. LEAGUE STATUS BANNER */}
        <motion.div variants={itemVariants} className="league-banner-elite">
            <div className="league-medal-orb" style={{ borderColor: activeSub.color }}>
                <span>🥈</span>
            </div>
            <div className="league-content">
                <div className="league-name-row">
                    <span className="l-title">{user?.league || 'Silver'} League</span>
                    <span className="l-timer" style={{ color: activeSub.color, background: `${activeSub.color}22` }}>
                        2d 14h
                    </span>
                </div>
                <div className="league-promo-track">
                    <div className="promo-fill" style={{ width: '65%', background: activeSub.color }}></div>
                </div>
                <div className="league-status-msg">Top 10 promote to <b>Gold</b></div>
            </div>
            <div className="league-rank-badge" style={{ background: activeSub.color }}>#24</div>
        </motion.div>

        {/* 3. GEM SUBJECT TABS */}
        <div className="rank-tabs-row">
            {subjects.map(s => (
                <div 
                    key={s.id}
                    className={`rank-tab-pill ${activeTabId === s.id ? 'active' : ''}`} 
                    onClick={() => setActiveTabId(s.id)}
                    style={activeTabId === s.id ? { '--tab-color': s.color } : {}}
                >
                    <img src={`/assets/images/gems/${s.gem}`} className="tab-gem-icon" alt={s.label} />
                    <span>{s.label}</span>
                </div>
            ))}
        </div>

        {/* 4. THE SUBJECT PODIUM */}
        <div className="podium-section">
            <div className="pod-thor-glow" style={{ background: activeSub.color }}></div>
            
            {/* RANK 2 (Silver) */}
            <motion.div variants={itemVariants} className="pod-card pod-rank-2">
                <div className="pod-avatar-wrap">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah" />
                </div>
                <p className="pod-name">Sarah .A</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
                    <span>14.2k</span>
                </div>
            </motion.div>

            {/* RANK 1 (Gold) */}
            <motion.div variants={itemVariants} className="pod-card pod-rank-1">
                <div className="crown-badge">👑</div>
                <div className="pod-avatar-wrap">
                    <img src={userAvatar} alt="You" />
                </div>
                <p className="pod-name">YOU</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
                    <span>{((user?.xp || 15000) / 1000).toFixed(1)}k</span>
                </div>
            </motion.div>

            {/* RANK 3 (Bronze) */}
            <motion.div variants={itemVariants} className="pod-card pod-rank-3">
                <div className="pod-avatar-wrap">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" alt="Musa" />
                </div>
                <p className="pod-name">Musa .O</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
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
                        <img src={`/assets/images/gems/${activeSub.gem}`} className="r-gem" alt="gem" />
                        <span className="r-gem-count">{35 - r}</span>
                    </div>
                </motion.div>
            ))}

            {/* STICKY USER POSITION */}
            <motion.div 
                variants={itemVariants}
                className="rank-row-elite is-user" 
                style={{ '--tab-color': activeSub.color }}
            >
                <span className="r-pos">#24</span>
                <div className="r-avatar">
                    <img src={userAvatar} alt="You" />
                </div>
                <div className="r-info">
                    <span className="r-name">{user?.nickname || 'You'} (YOU)</span>
                    <span className="r-xp">{(user?.xp || 0).toLocaleString()} XP</span>
                </div>
                <div className="r-stat">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="r-gem" alt="gem" />
                    <span className="r-gem-count">{user?.diamonds || 12}</span>
                </div>
            </motion.div>
        </motion.div>
        
        <div className="rank-footer">
            <img src="/assets/images/manya_icon.png" alt="Manya Council" />
            <p>Manya National Hero Council</p>
        </div>
    </motion.div>
  );
}

export default RankingsView;

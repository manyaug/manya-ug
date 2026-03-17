import { useState } from 'react';
import { useSelector } from 'react-redux';
import '../styles/ranking.css';

function RankingsView() {
  const user = useSelector((state) => state.user.data);
  const [activeTabId, setActiveTabId] = useState('Overall');

  const subjects = [
    { id: 'Overall', label: 'Overall', gem: 'master_gem.svg', color: 'var(--manya-purple)' },
    { id: 'Math', label: 'Math', gem: 'math_gem.svg', color: '#6366F1' },
    { id: 'Science', label: 'Science', gem: 'science_svg.svg', color: '#10B981' },
    { id: 'SST', label: 'SST', gem: 'sst_gem.svg', color: '#F59E0B' },
    { id: 'English', label: 'English', gem: 'english_gem.svg', color: '#DB2777' }
  ];

  const activeSub = subjects.find(s => s.id === activeTabId) || subjects[0];
  const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`;
  
  // Fake competitors list matching original JS loop [4..10]
  const competitors = [4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="rank-view animate-in">
        
        {/* 1. HEADER AREA */}
        <div className="rank-arena-header">
            <div className="live-pulse-dot"></div>
            <h2 className="arena-title">National Arena</h2>
            <p className="arena-subtitle">Uganda P.7 Hero Rankings</p>
        </div>

        {/* 2. LEAGUE STATUS BANNER */}
        <div className="league-banner-elite">
            <div className="league-medal-orb" style={{ borderColor: activeSub.color }}>
                <span>🥈</span>
            </div>
            <div className="league-content">
                <div className="league-name-row">
                    <span className="l-title">{user?.league || 'Silver'} League</span>
                    <span className="l-timer" style={{ color: activeSub.color, background: `${activeSub.color}22` }}>
                        <i className="far fa-clock"></i> 2d 14h
                    </span>
                </div>
                <div className="league-promo-track">
                    <div className="promo-fill" style={{ width: '65%', background: activeSub.color }}></div>
                </div>
                <div className="league-status-msg">Top 10 promote to <b>Gold</b></div>
            </div>
            <div className="league-rank-badge" style={{ background: activeSub.color, boxShadow: `0 5px 15px ${activeSub.color}44` }}>#24</div>
        </div>

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
        <div className="podium-section" style={{ '--sub-glow': activeSub.color }}>
            
            {/* RANK 2 (Silver) */}
            <div className="pod-card pod-rank-2">
                <div className="pod-avatar-wrap">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah" />
                </div>
                <p className="pod-name">Sarah .A</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
                    <span>14.2k</span>
                </div>
            </div>

            {/* RANK 1 (Gold) */}
            <div className="pod-card pod-rank-1">
                <div className="pod-avatar-wrap">
                    <img src={userAvatar} alt="You" />
                </div>
                <p className="pod-name">YOU</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
                    <span>{((user?.xp || 15000) / 1000).toFixed(1)}k</span>
                </div>
            </div>

            {/* RANK 3 (Bronze) */}
            <div className="pod-card pod-rank-3">
                <div className="pod-avatar-wrap">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" alt="Musa" />
                </div>
                <p className="pod-name">Musa .O</p>
                <div className="pod-score-pill">
                    <img src={`/assets/images/gems/${activeSub.gem}`} className="pod-gem" alt="gem" />
                    <span>12.8k</span>
                </div>
            </div>
        </div>

        {/* 5. LEADERBOARD LIST */}
        <div className="leaderboard-card-elite">
            <div className="list-header">
                <span>ELITE COMPETITORS</span>
                <span>GEMS EARNED</span>
            </div>
            
            {competitors.map(r => (
                <div key={r} className="rank-row-elite">
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
                </div>
            ))}

            {/* STICKY USER POSITION */}
            <div className="rank-row-elite is-user" style={{ borderLeftColor: activeSub.color }}>
                <span className="r-pos">#24</span>
                <div className="r-avatar" style={{ borderColor: activeSub.color }}>
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
            </div>
        </div>
        
        <div className="rank-footer">
            <img src="/assets/images/manya_icon.png" alt="Manya Council" />
            <p>Manya National Hero Council</p>
        </div>
    </div>
  );
}

export default RankingsView;

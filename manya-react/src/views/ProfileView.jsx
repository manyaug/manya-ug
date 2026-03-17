import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import '../styles/profile.css';

function ProfileView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  // --- ELITE LEVEL CALCULATOR ---
  const xpToLevel = (xp) => {
      const level = Math.floor((xp || 0) / 1000) + 1;
      const progress = (xp % 1000) / 10; // Percentage of current level
      const offset = 339.29 - (339.29 * (progress / 100)); // SVG Circumference
      let rank = "Novice Hero";
      if (level > 5) rank = "Elite Scholar";
      if (level > 10) rank = "Manya Legend";
      return { level, progress, offset, rank };
  };

  const stats = xpToLevel(user?.xp || 150);

  const subjectProgress = [
      { name: 'Mathematics', val: 78, color: '#7c3aed', icon: '/assets/images/math_island.png' },
      { name: 'Science', val: 45, color: '#10b981', icon: '/assets/images/science_island.png' },
      { name: 'SST', val: 62, color: '#f59e0b', icon: '/assets/images/sst_island.png' },
      { name: 'English', val: 90, color: '#db2777', icon: '/assets/images/english_island.png' }
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat'];
  const heights = [30, 20, 50, 70, 95, 60, 40];

  return (
    <div className="profile-page animate-in">
        
        {/* 1. HERO IDENTITY (XP RING) */}
        <div className="hero-passport-header">
            <div className="xp-ring-container">
                <svg className="xp-ring-svg" viewBox="0 0 120 120">
                    <circle className="ring-bg" cx="60" cy="60" r="54"></circle>
                    <circle 
                        className="ring-fill" 
                        cx="60" cy="60" r="54" 
                        style={{ strokeDasharray: 339.29, strokeDashoffset: stats.offset }}
                    ></circle>
                </svg>
                <div className="avatar-circle">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="level-badge">LVL {stats.level}</div>
            </div>
            <h2 className="hero-name-display">{(user?.nickname || 'Hero').toUpperCase()}</h2>
            <div className="hero-rank-pill">{stats.rank === "Novice Hero" && (user?.xp || 0) === 0 ? "MANYA LEGEND" : stats.rank.toUpperCase()}</div>
        </div>

        {/* 2. ANALYTICS BENTO GRID */}
        <div className="bento-grid">
            <div className="bento-card" style={{ background: 'rgba(124, 58, 237, 0.1)', borderColor: 'var(--manya-purple)' }}>
                <span className="card-icon">🔥</span>
                <span className="card-label">Streak</span>
                <div className="card-val">12 Days</div>
            </div>
            <div className="bento-card" style={{ background: 'rgba(6, 182, 212, 0.1)', borderColor: '#06B6D4' }}>
                <span className="card-icon">🎯</span>
                <span className="card-label">PLE Target</span>
                <div className="card-val">{user?.goal || 'Agg 4'}</div>
            </div>
        </div>

        {/* 3. LEARNING ACTIVITY */}
        <div className="activity-card-elite">
            <div className="activity-header">
                <span className="card-icon">🧠</span>
                <div>
                    <div className="activity-title">Learning Activity</div>
                    <div className="activity-sub">04hr 54min this week</div>
                </div>
            </div>
            <div className="bar-chart-container">
                {days.map((day, i) => (
                    <div key={day} className="chart-bar-wrapper">
                        <div className={`bar-fill ${day === 'Thr' ? 'active' : ''}`} style={{ height: `${heights[i]}px` }}>
                            {day === 'Thr' && <div className="bar-tooltip">4.5h</div>}
                        </div>
                        <span className="bar-day-label">{day}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* 4. SUBJECT PROGRESS */}
        <h4 className="section-label">Curriculum Progress</h4>
        <div className="subject-stack">
            {subjectProgress.map(sub => (
                <div key={sub.name} className="sub-progress-card">
                    <div className="sub-row">
                        <div className="sub-identity">
                            <img src={sub.icon} className="sub-icon-tiny" alt={sub.name} />
                            <span>{sub.name}</span>
                        </div>
                        <span className="sub-pct">{sub.val}%</span>
                    </div>
                    <div className="striped-track">
                        <div className="striped-fill" style={{ width: `${sub.val}%`, backgroundColor: sub.color }}></div>
                    </div>
                </div>
            ))}
        </div>

        {/* 5. HERO MANAGEMENT SERVICES */}
        <h4 className="section-label">Hero Management</h4>
        <div className="service-list-elite">
            <div className="service-row" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
                <div className="service-icon" style={{ background: '#F5F3FF', color: '#7c3aed' }}>⚙️</div>
                <div className="service-text">
                    <span className="s-title">Hero Settings</span>
                    <span className="s-sub">DNA, Nickname, and School</span>
                </div>
                <span className="s-arrow">›</span>
            </div>

            <div className="service-row" onClick={() => navigate('/membership')} style={{ cursor: 'pointer' }}>
                <div className="service-icon" style={{ background: '#FFF1F2', color: '#db2777' }}>👑</div>
                <div className="service-text">
                    <span className="s-title">Elite Hero Status</span>
                    <span className="s-sub">{user?.status || 'Free Scholar'}</span>
                </div>
                <span className="s-arrow">›</span>
            </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', opacity: 0.2, paddingBottom: '50px' }}>
            <img src="/assets/images/manya_icon.png" style={{ width: '50px' }} alt="Manya Council" />
        </div>
    </div>
  );
}

export default ProfileView;

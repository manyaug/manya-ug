import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import '../styles/home.css';

function HomeView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();
  const subjects = [
    { id: 'math', name: 'Mathematics', progress: user.prog_math || 45, gems: user.mathGems || 12, gemFile: '/assets/images/gems/math_gem.svg', icon: '/assets/images/math_island.png', color: '#6366F1' },
    { id: 'science', name: 'Science', progress: user.prog_science || 20, gems: user.scienceGems || 5, gemFile: '/assets/images/gems/science_svg.svg', icon: '/assets/images/science_island.png', color: '#10B981' },
    { id: 'sst', name: 'SST', progress: user.prog_sst || 10, gems: user.sstGems || 2, gemFile: '/assets/images/gems/sst_gem.svg', icon: '/assets/images/sst_island.png', color: '#F59E0B' },
    { id: 'english', name: 'English', progress: user.prog_english || 80, gems: user.englishGems || 24, gemFile: '/assets/images/gems/english_gem.svg', icon: '/assets/images/english_island.png', color: '#DB2777' }
  ];
  const handleOpenSpiral = (subjectId) => {
    navigate(`/spiral/${subjectId}`);
  };

  return (
    <div className="manya-hub animate-in">


      {/* DYNAMIC AURORA BLOBS */}
      <div className="aurora-engine" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div className="blob aurora-1"></div>
        <div className="blob aurora-2"></div>
      </div>

      {/* HERO RESUME CARD */}
      <div className="resume-mission-card" onClick={() => handleOpenSpiral('math')}>
        <img src="/assets/images/gems/math_gem.svg" className="hero-bg-gem-watermark" alt="watermark" />

        <div className="mission-visual">
          <div className="hero-avatar-mini-glow">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="Avatar" />
          </div>
        </div>

        <div className="mission-details">
          <span className="mission-kicker">CURRENT BOUNTY</span>
          <h3 className="mission-title">Set Theory Mastery</h3>
          <div className="mission-tags">
            <span className="tag">
              <img src="/assets/images/gems/math_gem.svg" style={{ width: '12px', height: '12px', marginRight: '4px' }} alt="loot" />
              +3 Loot
            </span>
            <span className="tag">🔥 12d Streak</span>
          </div>
        </div>

        <div className="play-pill-neon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '3px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* 2x2 GRID */}
      <div className="subject-grid-elite">
        {subjects.map(sub => (
          <div key={sub.id} className={`world-card-elite ${sub.id}`} onClick={() => handleOpenSpiral(sub.id)}>
            <div className="card-gem-bounty">
              <img src={sub.gemFile} className="bounty-gem-icon" alt={`${sub.name} Gem`} />
              <span className="bounty-gem-count" style={{ color: sub.color }}>{sub.gems}</span>
            </div>

            <div className="island-stage">
              <div className="island-halo" style={{ background: sub.color }}></div>
              <img src={sub.icon} className="floating-island" alt={sub.name} />
            </div>

            <div className="card-footer-info">
              <h4>{sub.name}</h4>
              <div className="mini-striped-track">
                <div className="mini-striped-fill" style={{ width: `${sub.progress}%`, backgroundColor: sub.color }}></div>
              </div>
              <span className="pct-text">{sub.progress}% EXPLORED</span>
            </div>
          </div>
        ))}
      </div>

      {/* SIMULATION LAB BUTTON */}
      <button
        onClick={() => navigate('/sim-test')}
        className="mb-6 w-full flex items-center justify-between p-4 bg-white rounded-2xl border-4 border-[#7c3aed]/10 hover:border-[#7c3aed]/30 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#7c3aed] rounded-xl flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
            <FlaskConical size={20} />
          </div>
          <div className="text-left">
            <h4 className="font-black text-slate-800 leading-none">Simulation Lab</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Test new experiments</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#7c3aed] group-hover:text-white transition-colors">
          →
        </div>
      </button>
    </div>
  );


}

export default HomeView;

import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Zap, Trophy, FlaskConical } from 'lucide-react';
import { setAmbientMode } from '../store/audioSlice';
import { updateStreak } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { getIsland, getGem, IMAGES } from '../config/assetUrls';
import '../styles/home.css';

function HomeView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [curriculum, setCurriculum] = useState(null);
  const [streakChecked, setStreakChecked] = useState(false);

  // ─── STREAK CHECK ───
  useEffect(() => {
     if (user?.uid && !streakChecked) {
         setStreakChecked(true);
         const oldStreak = user.current_streak || 0;
         const lastStr = user.last_active_at ? new Date(user.last_active_at).toDateString() : null;
         const todayStr = new Date().toDateString();

         if (lastStr !== todayStr) {
             const yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             const isYesterday = lastStr === yesterday.toDateString();
             const newStreak = isYesterday ? oldStreak + 1 : 1;

             dispatch(updateStreak());
             
             setTimeout(() => {
                 dispatch(addToast({ 
                     message: newStreak > 1 ? `🔥 Streak preserved! You're on a ${newStreak} day streak!` : `🔥 Start of a new streak! Log in tomorrow to keep it burning!`, 
                     type: 'success' 
                 }));
             }, 800);
         }
     }
  }, [user, streakChecked, dispatch]);

  // Set Ambient Audio
  useEffect(() => {
    const theme = user?.theme || 'light';
    dispatch(setAmbientMode(theme === 'dark' ? 'night' : 'day'));
  }, [dispatch, user?.theme]);

  // Load Curriculum
  useEffect(() => {
    fetch('/curriculum-master.json')
      .then(res => res.json())
      .then(data => {
          const norm = {};
          Object.keys(data).forEach(k => { norm[k.toLowerCase()] = data[k]; });
          setCurriculum(norm);
      })
      .catch(console.error);
  }, []);

  // Determine Active Bounty
  const activeBounty = useMemo(() => {
    if (!curriculum || !user) return null;

    const subjects = ['math', 'science', 'sst', 'english'];
    let bestMatch = { sub: 'math', quest: null, index: 0 };

    // Find the subject with the most progress (highest index)
    subjects.forEach(s => {
        const progKey = `prog_${s}`;
        const currentIdx = user[progKey] || 0;
        
        const units = curriculum[s]?.units || [];
        const flatQuests = units.flatMap(u => u.quests || []);
        const quest = flatQuests[currentIdx] || flatQuests[flatQuests.length - 1];

        if (currentIdx >= bestMatch.index) {
            bestMatch = { sub: s, quest, index: currentIdx };
        }
    });

    return bestMatch;
  }, [curriculum, user]);

  const subjects = [
    { id: 'math', name: 'Mathematics', progress: user.prog_math || 0, gems: user.mathGems || 0, gemFile: getGem('math_gem.svg'), icon: getIsland('math'), hue: 262, color: 'var(--manya-purple)' },
    { id: 'science', name: 'Science', progress: user.prog_science || 0, gems: user.scienceGems || 0, gemFile: getGem('science_svg.svg'), icon: getIsland('science'), hue: 161, color: 'var(--manya-green)' },
    { id: 'sst', name: 'SST', progress: user.prog_sst || 0, gems: user.sstGems || 0, gemFile: getGem('sst_gem.svg'), icon: getIsland('sst'), hue: 38, color: 'var(--manya-gold)' },
    { id: 'english', name: 'English', progress: user.prog_english || 0, gems: user.englishGems || 0, gemFile: getGem('english_gem.svg'), icon: getIsland('english'), hue: 330, color: 'var(--manya-pink)' }
  ];

  const handleOpenSpiral = (subjectId) => {
    window.ManyaAudio?.click?.();
    navigate(`/spiral/${subjectId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { type: 'spring', stiffness: 300, damping: 24 } 
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="manya-hub"
    >
      {/* DYNAMIC AURORA BLOBS */}
      <div className="aurora-engine" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div className="blob aurora-1"></div>
        <div className="blob aurora-2"></div>
      </div>

      {/* PREMIUM STATUS HEADER */}
      <motion.div 
        variants={itemVariants} 
        className="home-status-header-glass"
      >
          <div className="status-user-info">
              <span className="hi-text">Hi, {user.nickname || "Hero"} 👋</span>
              <p className="status-subtext">Ready for today's mission?</p>
          </div>
          
          <div className="status-streak-pill">
             <div className="streak-flame-glow">
                <Zap size={16} fill="currentColor" />
             </div>
             <div className="streak-stats">
                 <span className="val">{user.current_streak || 0}</span>
                 <span className="lab uppercase">Streak</span>
             </div>
          </div>
      </motion.div>

      {/* HERO RESUME CARD */}
      <motion.div 
        variants={itemVariants} 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="resume-mission-card" 
        onClick={() => handleOpenSpiral(activeBounty?.sub || 'math')}
      >
        <img 
            src={getGem(activeBounty?.sub || 'math')} 
            className="hero-bg-gem-watermark" 
            alt="watermark" 
        />

        <div className="mission-visual">
          <div className="hero-avatar-mini-glow">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="Avatar" />
          </div>
        </div>

        <div className="mission-details">
          <span className="mission-kicker flex items-center gap-1">
            <Target size={12} className="text-white/70" />
            CURRENT BOUNTY
          </span>
          <h3 className="mission-title">
            {activeBounty?.quest?.title || "Starting the Journey"}
          </h3>
        </div>

        <div className="play-pill-neon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '3px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </motion.div>

      {/* 2x2 GRID */}
      <div className="subject-grid-elite">
        {subjects.map(sub => (
          <motion.div 
            key={sub.id} 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            className={`world-card-elite ${sub.id}`} 
            onClick={() => handleOpenSpiral(sub.id)}
          >
            <div className="card-gem-bounty">
              <img src={sub.gemFile} className="bounty-gem-icon" alt={`${sub.name} Gem`} />
              <span className="bounty-gem-count" style={{ color: sub.color }}>{sub.gems}</span>
            </div>

            {/* INTENSIVE GLOW SYSTEM */}
            <div className="island-stage">
              {/* THE "THOR" HALO - VIVID radial glow */}
              <div 
                className="island-halo" 
                style={{ 
                  background: `radial-gradient(circle, hsla(${sub.hue}, 90%, 65%, 0.8) 0%, hsla(${sub.hue}, 90%, 65%, 0) 70%)`,
                }}
              />
              
              <img 
                src={sub.icon} 
                alt={sub.name} 
                className="floating-island"
                style={{
                  filter: `drop-shadow(0 0 35px hsla(${sub.hue}, 90%, 60%, 0.5))`
                }}
              />
            </div>

            <div className="card-footer-info">
              <h4>{sub.name}</h4>
              <div className="mini-striped-track">
                <div className="mini-striped-fill" style={{ width: `${sub.progress > 0 ? (sub.progress / 50 * 100) : 5}%`, backgroundColor: sub.color }}></div>
              </div>
              <span className="pct-text uppercase">Explore World</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SIMULATION LAB BUTTON */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate('/sim-test')}
        className="mb-10 w-full flex items-center justify-between p-4 bg-white rounded-2xl border-4 border-[#7c3aed]/10 hover:border-[#7c3aed]/30 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#7c3aed] rounded-xl flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform shadow-lg shadow-purple-200">
            <FlaskConical size={20} />
          </div>
          <div className="text-left">
            <h4 className="font-black text-slate-800 leading-none">Simulation Lab</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Experimental Access</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#7c3aed] group-hover:text-white transition-colors">
          →
        </div>
      </motion.button>
    </motion.div>
  );
}

export default HomeView;

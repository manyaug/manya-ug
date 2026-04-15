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
    { id: 'math',    name: 'Mathematics', progress: user.prog_math    || 0, gems: user.mathGems    || 0, gemFile: getGem('math_gem.svg'),    icon: getIsland('math'),    color: 'var(--manya-purple)' },
    { id: 'science', name: 'Science',     progress: user.prog_science || 0, gems: user.scienceGems || 0, gemFile: getGem('science_svg.svg'), icon: getIsland('science'), color: 'var(--manya-green)'  },
    { id: 'sst',     name: 'SST',         progress: user.prog_sst     || 0, gems: user.sstGems     || 0, gemFile: getGem('sst_gem.svg'),     icon: getIsland('sst'),     color: 'var(--manya-gold)'   },
    { id: 'english', name: 'English',     progress: user.prog_english || 0, gems: user.englishGems || 0, gemFile: getGem('english_gem.svg'), icon: getIsland('english'), color: 'var(--manya-pink)'   },
  ];

  const handleOpenSpiral = (subjectId) => {
    window.ManyaAudio?.click?.();
    navigate(`/spiral/${subjectId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 450, damping: 16 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="manya-hub"
    >
      {/* Aurora Engine removed for Solid Opaque style */}

      {/* PREMIUM STATUS HEADER */}
      <motion.div variants={itemVariants} className="home-status-header-glass">
        <div className="toy-card-gloss" />
        <div className="status-user-info" style={{ zIndex: 2 }}>
          <span className="hi-text">Hi, {user.nickname || 'Hero'} 👋</span>
          <p className="status-subtext">Ready for today's mission?</p>
        </div>
        <div className="status-streak-pill" style={{ zIndex: 2 }}>
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
        whileHover={{ scale: 1.025 }}
        whileTap={{ scale: 0.97 }}
        className={`resume-mission-card btn-toy bounty-card-${activeBounty?.sub || 'math'}`}
        onClick={() => handleOpenSpiral(activeBounty?.sub || 'math')}
      >
        <div className="toy-card-gloss" />
        <img src={getGem(activeBounty?.sub || 'math')} className="hero-bg-gem-watermark" alt="watermark" />
        <div className="mission-visual">
          <div className="hero-avatar-mini-glow">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="Avatar" />
          </div>
        </div>
        <div className="mission-details" style={{ zIndex: 2 }}>
          <span className="mission-kicker flex items-center gap-1">
            <Target size={12} className="text-white/70" />
            DAILY MISSION!
          </span>
          <h3 className="mission-title">
            {activeBounty?.quest?.title || 'Starting the Journey'}
          </h3>
        </div>
        <div className="play-pill-neon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '3px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </motion.div>

      {/* ── CRYSTAL BALL WORLD GRID ── */}
      <div className="subject-grid-elite">
        {subjects.map(sub => (
          <motion.div
            key={sub.id}
            variants={itemVariants}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            className={`world-card-elite ${sub.id}`}
            onClick={() => handleOpenSpiral(sub.id)}
          >
            {/* ORB */}
            <div className="orb-wrap">
              {/* Ambient halo (visible on hover via CSS) */}
              <div className="orb-halo" />

              {/* CRYSTAL LUXURY GEM BADGE (Floating) */}
              <div className="card-gem-bounty">
                <img src={sub.gemFile} className="bounty-gem-icon" alt={`${sub.name} Gem`} />
                <span className="bounty-gem-count">{sub.gems}</span>
              </div>

              {/* Crystal ring with floating island */}
              <div className="crystal-ball">
                <img src={sub.icon} alt={sub.name} className="crystal-island" />
              </div>

              {/* Glow pool beneath orb */}
              <div className="orb-glow" />
            </div>

            {/* Nameplate consolidated into a button style footer */}
            <div className="card-footer-info">
              <div className={`subject-name-row btn-toy btn-toy-${sub.id === 'math' ? 'purple' : sub.id === 'science' ? 'green' : sub.id === 'sst' ? 'gold' : 'pink'}`}>
                <div className="btn-toy-gloss" />
                <span>{sub.name}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* COMPACT SIMULATION LAB FOOTER */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate('/sim-test')}
        className="home-sim-lab-cta group btn-toy btn-toy-purple"
      >
        <div className="toy-card-gloss" />
        <div className="sim-lab-left" style={{ zIndex: 2 }}>
          <div className="sim-lab-icon-box">
            <FlaskConical size={18} />
          </div>
          <div className="sim-lab-text">
            <h4>Simulation Lab</h4>
            <p style={{ color: 'white', opacity: 0.8 }}>Experimental Access</p>
          </div>
        </div>
        <div className="sim-lab-arrow" style={{ zIndex: 2 }}>
          →
        </div>
      </motion.button>
    </motion.div>
  );
}

export default HomeView;

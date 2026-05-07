import { useEffect, useState, useMemo } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
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
    import('../infrastructure/storage/storageFacade.js').then(({ storageFacade }) => {
      storageFacade.get('file:/curriculum-master.json')
        .then(data => {
            const norm = {};
            Object.keys(data).forEach(k => { norm[k.toLowerCase()] = data[k]; });
            setCurriculum(norm);
        })
        .catch(console.error);
    });
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
    audioService.click?.();
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

      {/* 🚀 UNIFIED COMMAND CENTER */}
      <motion.div variants={itemVariants} className="home-command-center">
        <div className="toy-card-gloss" />
        
        {/* Top Row: User & Streak */}
        <div className="command-header">
          <div className="user-profile-mini" onClick={() => navigate('/profile')}>
            <div className="avatar-ring">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="Avatar" />
            </div>
            <div className="user-text">
               <span className="hi-msg">Hi, {user.nickname || 'Hero'} 👋</span>
               <span className="status-msg">Level 1 Voyager</span>
            </div>
          </div>

          <div className="streak-badge-premium" onClick={() => navigate('/achievements')}>
             <Zap size={16} fill="var(--manya-gold)" color="var(--manya-gold)" />
             <span>{user.current_streak || 0}</span>
          </div>
        </div>

        {/* Bottom Row: Active Quest (Live Activity Style) */}
        <div 
          className="command-mission-bar"
          onClick={() => handleOpenSpiral(activeBounty?.sub || 'math')}
        >
          <div className="mission-info">
             <span className="mission-label">RESUME DISCOVERY</span>
             <h3 className="mission-name">
                {activeBounty?.sub?.toUpperCase()}: {activeBounty?.quest?.title || 'Kickoff'}
             </h3>
          </div>
          <button className="mission-play-btn">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
             </svg>
          </button>
        </div>
      </motion.div>

      {/* ── ZEN GRID 2.0: SUBJECT SQUARES ── */}
      <div className="subject-grid-modern">
        {subjects.map(sub => (
          <motion.div
            key={sub.id}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`subject-square-card ${sub.id}`}
            onClick={() => handleOpenSpiral(sub.id)}
          >
            {/* Gem Badge Overlay */}
            <div className="square-gem-badge">
              <img src={sub.gemFile} alt="Gem" />
              <span>{sub.gems}</span>
            </div>

            {/* Glowing Floating Icon */}
            <div className="square-icon-wrap">
              <img src={sub.icon} alt={sub.name} className="square-subject-icon" />
              <div className="square-glow-ring" />
            </div>

            {/* Subject Label */}
            <div className="square-footer">
              <span className="square-subject-name">{sub.name}</span>
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

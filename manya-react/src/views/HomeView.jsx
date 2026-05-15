import { useEffect, useState, useMemo } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Zap, Trophy, FlaskConical, ArrowRight, Rocket, ChevronRight } from 'lucide-react';
import { setAmbientMode } from '../store/audioSlice';
import { updateStreak } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { getIsland, getGem, IMAGES } from '../config/assetUrls';
import { challengeService } from '../domain/gamification/challengeService.js';
import ChallengesModal from '../components/ChallengesModal/ChallengesModal.jsx';
import '../styles/home.css';

function HomeView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [curriculum, setCurriculum] = useState(null);
  const [streakChecked, setStreakChecked] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [challengeData, setChallengeData] = useState(null);

  // Fetch active challenge for home card
  useEffect(() => {
    challengeService.fetchActive().then(d => d && setChallengeData(d));
    const unsub = challengeService.onChange(({ challenge, progress }) => {
      if (challenge) setChallengeData({ challenge, progress });
    });
    return unsub;
  }, []);

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
             challengeService.tick('STREAK', newStreak);

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

      {/* 🧭 TOP NAVIGATION BAR (Sleek & Sticky) */}
      <div className="top-navigation-bar">
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

      {/* 🏆 DAILY CHALLENGE — Engaging Teaser */}
      <motion.div
        variants={itemVariants}
        className="challenge-home-card"
        onClick={() => setShowChallenges(true)}
      >
        <div className="chc-icon-wrap">
          <Rocket size={20} className="chc-rocket" />
        </div>
        <div className="chc-content">
          <span className="chc-label">DAY {challengeData?.challenge?.day_number || user.challenge_day || 1} CHALLENGE</span>
          <h3 className="chc-name">{challengeData?.challenge?.title || 'Daily Quest'}</h3>
        </div>
        <div className="chc-cta">
          <span>START</span>
          <ChevronRight size={16} />
        </div>
      </motion.div>

      {/* Challenges Modal */}
      <ChallengesModal isOpen={showChallenges} onClose={() => setShowChallenges(false)} />

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

    </motion.div>
  );
}

export default HomeView;

import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGem } from '../config/assetUrls';
import '../styles/globalHud.css';

function GlobalHUD() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  if (!user) return null;

  const xpProgress = (user.xp % 1000) / 10;

  return (
    <header className="app-header-master">
      <motion.div 
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="hud-master-shell"
      >
        {/* LEFT: PROFILE & XP */}
        <div className="hud-left-content" onClick={() => navigate('/profile')}>
          <div className="hud-avatar-wrapper">
            <img src="/assets/icons/pwa-192x192.png" alt="Manya" className="hud-avatar-img" />
            <div className="hud-level-badge">7</div>
          </div>
          <div className="hud-user-text">
            <span className="hud-nickname-text">{user.nickname.split(' ')[0]}</span>
            <div className="hud-xp-line">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                className="hud-xp-fill"
              >
                <div className="btn-toy-gloss" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* RIGHT: TREASURY (STREAK & GEMS) */}
        <div className="hud-right-content">
          <div className="hud-treasury-pill">
            <div className="btn-toy-gloss" />
            <div className="hud-stat-item streak">
              <span className="hud-icon">🔥</span>
              <span className="hud-value">{user.currentStreak || 0}</span>
            </div>
            <div className="hud-stat-divider" />
            <div className="hud-stat-item gems" onClick={() => navigate('/achievements')}>
              <img src={getGem('master_gem.svg')} className="hud-gem-icon" alt="Gem" />
              <span className="hud-value">{user.diamonds}</span>
            </div>
          </div>
        </div>

      </motion.div>
    </header>
  );
}

export default GlobalHUD;

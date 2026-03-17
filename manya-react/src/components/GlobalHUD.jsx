import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Diamond } from 'lucide-react';
import '../styles/globalHud.css';

function GlobalHUD() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="app-header-master">
      <div className="header-shell" id="hud-content">
        
        {/* Brand Logo/Badge */}
        <div className="hud-brand-peek" onClick={() => navigate('/home')}>
          <img src="/assets/icons/pwa-192x192.png" alt="Manya" className="brand-logo-img" />
        </div>

        <div className="hud-center-stack">
          <span className="manya-brand-text">{user.nickname.toUpperCase()}</span>
          <div className="hero-status-p7">
            <div className="pulse-dot"></div>
            <span className="manya-p7-tag">P.7 HERO</span>
          </div>
        </div>

        <div className="hud-pill-diamond" onClick={() => navigate('/achievements')} style={{ cursor: 'pointer' }}>
          <img src="/assets/images/gems/master_gem.svg" className="hud-gem-img" alt="Gem" />
          <span className="count">{user.diamonds}</span>
        </div>

      </div>
    </header>
  );
}

export default GlobalHUD;

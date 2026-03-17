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
      <div className="header-shell" id="hud-content" style={{ borderColor: 'white' }}>
        
        <div className="hud-avatar-peek">
          <div className="peek-circle">
            <img 
               src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} 
               alt="Avatar" 
               style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        <div className="hud-logo-wrap">
          <span className="manya-brand-text">{user.nickname.toUpperCase()}</span>
          <span className="manya-p7-tag">P.7 HERO</span>
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

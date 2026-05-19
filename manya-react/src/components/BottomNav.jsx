import { NavLink, useLocation } from 'react-router-dom';
import { audioService } from '../infrastructure/audio/audioService.js';
import { motion } from 'framer-motion';
import { Home, Library, Trophy, User } from 'lucide-react';
import '../styles/bottomNav.css';

const TreasuryChest = ({ size, strokeWidth }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Body of the chest */}
    <path d="M3 11v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8" />
    {/* Open Lid - Rounded and lifted */}
    <path d="M2.5 11c0-4 4-7 9.5-7s9.5 3 9.5 7" />
    {/* Rim of the opening */}
    <path d="M2 11h20" />
    {/* Decorative Lock bit */}
    <rect x="10.5" y="9.5" width="3" height="3" rx="0.5" fill="currentColor" />
  </svg>
);

function BottomNav() {
  const navItems = [
    { id: 'home',     to: '/home',     icon: Home,          label: 'Home',     color: '#818cf8' },
    { id: 'library',  to: '/library',  icon: TreasuryChest, label: 'Vault',    color: '#34d399' },
    { id: 'rankings', to: '/rankings', icon: Trophy,        label: 'Rankings', color: '#fbbf24' },
    { id: 'profile',  to: '/profile',  icon: User,          label: 'Profile',  color: '#f472b6' },
  ];

  const location = useLocation();
  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.to));
  const activeColor = 'var(--manya-purple)';

  return (
    <nav className="bottom-nav">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bottom-nav-shell"
        style={{ '--active-color': activeColor }}
      >
        {/* TACTILE TOY INDICATOR SQUIRCLE */}
        {activeIndex !== -1 && (
          <motion.div 
            className="nav-toy-indicator"
            layoutId="toy-nav-marker"
            animate={{ left: `${(activeIndex * 25) + 12.5}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <div className="btn-toy-gloss" />
          </motion.div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${item.id}-tab ${isActive ? 'active' : ''}`}
              onClick={() => audioService.click?.()}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: [1, 1.3, 1.15], y: -4 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                    className="icon-wrapper"
                  >
                    <Icon size={24} strokeWidth={isActive ? 3 : 2} />
                  </motion.div>
                  <span className="nav-label">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </motion.div>
    </nav>
  );
}

export default BottomNav;

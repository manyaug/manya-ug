import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Library, Trophy, User } from 'lucide-react';
import '../styles/bottomNav.css';

function BottomNav() {
  const navItems = [
    { id: 'home',     to: '/home',     icon: Home,    label: 'Home',     color: '#818cf8' },
    { id: 'library',  to: '/library',  icon: Library, label: 'Library',  color: '#34d399' },
    { id: 'rankings', to: '/rankings', icon: Trophy,  label: 'Rankings', color: '#fbbf24' },
    { id: 'profile',  to: '/profile',  icon: User,    label: 'Profile',  color: '#f472b6' },
  ];

  const location = useLocation();
  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.to));
  const activeColor = activeIndex !== -1 ? navItems[activeIndex].color : '#818cf8';

  return (
    <nav className="bottom-nav">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bottom-nav-shell"
        style={{ '--active-color': activeColor }}
      >
        {/* LIQUID SLIDING INDICATOR */}
        {activeIndex !== -1 && (
          <motion.div 
            className="nav-liquid-indicator"
            animate={{ left: `${(activeIndex * 25) + 12.5}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
          >
            <div className="liquid-drop" />
          </motion.div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${item.id}-tab ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: [1, 1.25, 1], y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="icon-wrapper"
                  >
                    <Icon size={22} strokeWidth={isActive ? 3 : 2} />
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

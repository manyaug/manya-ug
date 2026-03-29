import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Library, Trophy, User } from 'lucide-react';
import '../styles/bottomNav.css';

function BottomNav() {
  const navItems = [
    { to: '/home',     icon: Home,    label: 'Home'     },
    { to: '/library',  icon: Library, label: 'Library'  },
    { to: '/rankings', icon: Trophy,  label: 'Rankings' },
    { to: '/profile',  icon: User,    label: 'Profile'  },
  ];

  return (
    <nav className="bottom-nav">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bottom-nav-shell"
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <motion.div
                  animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="icon-wrapper"
                >
                  <Icon size={22} strokeWidth={isActive ? 2.8 : 2.2} />
                  {isActive && <motion.span layoutId="nav-dot" className="nav-item-dot" />}
                </motion.div>
                <span className="nav-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </motion.div>
    </nav>
  );
}

export default BottomNav;

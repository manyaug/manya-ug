import { NavLink } from 'react-router-dom';
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
      <div className="bottom-nav-shell">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {/* Active indicator dot */}
            <span className="nav-item-dot" />
            <Icon size={22} strokeWidth={2.3} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;

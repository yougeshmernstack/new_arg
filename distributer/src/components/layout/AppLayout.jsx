import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../common/BrandLogo';
import '../../styles/layout.css';

const links = [
  { to: '/', label: 'Overview', icon: 'grid', end: true },
  { to: '/profile', label: 'Business profile', icon: 'user' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
];

const titles = {
  '/': ['Overview', 'Track your distribution business at a glance'],
  '/profile': ['Business profile', 'Manage your account and contact details'],
  '/notifications': ['Notifications', 'Stay updated with your latest activity'],
};

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, subtitle] = titles[location.pathname] || titles['/'];
  const displayName = user?.name || user?.username || 'Distributor';
  const initial = displayName.charAt(0).toUpperCase();

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.classList.toggle('sidebar-locked', menuOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('sidebar-locked');
    };
  }, [menuOpen]);

  return (
    <div className={`app-shell ${menuOpen ? 'menu-open' : ''}`}>
      <div
        className={`sidebar-backdrop ${menuOpen ? 'show' : ''}`}
        role="presentation"
        onClick={closeMenu}
      />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen && undefined}>
        <div className="sidebar-top">
          <div className="brand">
            <BrandLogo className="brand-logo brand-logo-full" />
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <Icon name="close" />
          </button>
        </div>

        <p className="nav-label">Workspace</p>
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-label">Partner portal</span>
          <strong>Grow your network</strong>
          <p>Manage orders, earnings and account activity in one place.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
            <div className="topbar-title">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-chip">
              <span className="user-avatar">{initial}</span>
              <span>
                <strong>{displayName}</strong>
                <small>Distributor</small>
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Logout"
              title="Logout"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../utils/constants';
import '../../styles/layout.css';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inventory', label: 'Inventory' },
  {
    label: 'Stock Purchase',
    children: [
      { to: '/products', label: 'Products' },
      { to: '/cart', label: 'Cart' },
      { to: '/orders', label: 'Purchase History' },
    ],
  },
  { to: '/profile', label: 'Profile' },
  { to: '/change-password', label: 'Change Password' },
  { to: '/notifications', label: 'Notifications' },
];

function NavGroup({ item }) {
  const location = useLocation();
  const childActive = item.children.some(
    (child) =>
      location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
  );
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div className={`nav-group${open ? ' open' : ''}${childActive ? ' has-active' : ''}`}>
      <button
        type="button"
        className={`nav-group-toggle${childActive ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{item.label}</span>
        <span className="nav-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="nav-sub">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) => (isActive ? 'nav-link sub active' : 'nav-link sub')}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">{APP_NAME}</div>
        <nav className="nav">
          {links.map((link) =>
            link.children ? (
              <NavGroup key={link.label} item={link} />
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div />
          <div className="topbar-right">
            <span className="user-chip">{user?.username || user?.name || 'Franchise'}</span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
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

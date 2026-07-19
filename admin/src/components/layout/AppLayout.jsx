import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../utils/constants';
import '../../styles/layout.css';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/franchises', label: 'Franchises' },
  { to: '/distributors', label: 'Distributors' },
  { to: '/products', label: 'Products' },
  { to: '/packages', label: 'Packages' },
  { to: '/inventory', label: 'Inventory' },
  {
    label: 'Orders',
    match: '/orders',
    children: [
      { to: '/orders/franchise', label: 'Franchise Orders' },
      { to: '/orders/distributor', label: 'Distributor Orders' },
      { to: '/orders/theme', label: 'Theme Orders' },
    ],
  },
  { to: '/stock-history', label: 'Stock History' },
  {
    label: 'Funds',
    children: [
      { to: '/payment-settings', label: 'Payment Settings' },
      { to: '/fund-deposits', label: 'Fund Deposits' },
      { to: '/fund-deposit-history', label: 'Deposit History' },
      { to: '/send-fund', label: 'Send Fund' },
      { to: '/send-fund-history', label: 'Send Fund History' },
    ],
  },

  { to: '/audit-logs', label: 'Audit Logs' },
  { to: '/change-password', label: 'Change Password' },
];

function Icon({ name }) {
  const paths = {
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),
  };

  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function NavGroup({ item, onNavigate }) {
  const location = useLocation();
  const childActive =
    item.children.some(
      (child) =>
        location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
    ) || Boolean(item.match && location.pathname.startsWith(item.match));
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
              onClick={onNavigate}
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <div
        className={`sidebar-backdrop${menuOpen ? ' show' : ''}`}
        role="presentation"
        onClick={closeMenu}
      />

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">{APP_NAME}</div>
          <button type="button" className="sidebar-close" aria-label="Close menu" onClick={closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="nav">
          {links.map((link) =>
            link.children ? (
              <NavGroup key={link.label} item={link} onNavigate={closeMenu} />
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>
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
            <span className="topbar-brand">{APP_NAME}</span>
          </div>
          <div className="topbar-right">
            <span className="user-chip">{user?.username || user?.name || 'Admin'}</span>
            <button type="button" className="btn ghost" onClick={handleLogout}>
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

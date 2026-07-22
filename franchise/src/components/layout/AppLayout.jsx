import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../utils/constants';
import '../../styles/layout.css';

const links = [
  {
    section: 'Main',
    items: [
      { to: '/', label: 'Dashboard', end: true, icon: 'dashboard' },
      { to: '/inventory', label: 'Inventory', icon: 'inventory' },
      {
        label: 'Stock Purchase',
        icon: 'cart',
        children: [
          { to: '/products', label: 'Products', icon: 'box' },
          { to: '/cart', label: 'Cart', icon: 'bag' },
          { to: '/orders', label: 'Purchase History', icon: 'orders' },
        ],
      },
    ],
  },
  {
    section: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: 'user' },
      { to: '/change-password', label: 'Change Password', icon: 'lock' },
      { to: '/notifications', label: 'Notifications', icon: 'bell' },
    ],
  },
];

const titles = {
  '/': 'Dashboard',
  '/inventory': 'Inventory',
  '/products': 'Products',
  '/cart': 'Cart',
  '/orders': 'Purchase History',
  '/profile': 'Profile',
  '/change-password': 'Change Password',
  '/notifications': 'Notifications',
};

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
    dashboard: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 8.5h16v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V8.5z" />
        <path d="M8 8.5V6.5A4 4 0 0 1 16 6.5v2" />
      </>
    ),
    cart: (
      <>
        <path d="M3.5 5h1.8l1.4 11.2h10.8l1.6-7.6H7" />
        <circle cx="9.5" cy="19.2" r="1.2" />
        <circle cx="16.2" cy="19.2" r="1.2" />
      </>
    ),
    box: (
      <>
        <path d="M12 3.5l8 4.2v8.6l-8 4.2-8-4.2V7.7z" />
        <path d="M12 12v8.5" />
        <path d="M12 12L4.2 7.9" />
        <path d="M12 12l7.8-4.1" />
      </>
    ),
    bag: (
      <>
        <path d="M6 8.5h12l-.8 10.2a1.5 1.5 0 0 1-1.5 1.3H8.3a1.5 1.5 0 0 1-1.5-1.3z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </>
    ),
    orders: (
      <>
        <path d="M8 5.5h9.5A1.5 1.5 0 0 1 19 7v12.5a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19.5V7A1.5 1.5 0 0 1 8 5.5z" />
        <path d="M9.5 9.5h7" />
        <path d="M9.5 13h7" />
        <path d="M9.5 16.5h4.5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="10.5" width="12" height="9" rx="2" />
        <path d="M9 10.5V8a3 3 0 0 1 6 0v2.5" />
      </>
    ),
    bell: (
      <>
        <path d="M6.5 16.5h11" />
        <path d="M8 16.5V11a4 4 0 0 1 8 0v5.5" />
        <path d="M10.5 16.5a1.5 1.5 0 0 0 3 0" />
        <path d="M12 5.5v1.2" />
      </>
    ),
    chevron: <path d="M9 7.5l4.5 4.5L9 16.5" />,
    logout: (
      <>
        <path d="M10 12h9" />
        <path d="M15.5 8.5L19 12l-3.5 3.5" />
        <path d="M13 19.5H7.5A2.5 2.5 0 0 1 5 17V7a2.5 2.5 0 0 1 2.5-2.5H13" />
      </>
    ),
  };

  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
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
        <span className="nav-link-inner">
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </span>
        <Icon name="chevron" />
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
              <span className="nav-link-inner">
                <Icon name={child.icon} />
                <span>{child.label}</span>
              </span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function pageTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/orders/')) return 'Order Detail';
  if (pathname.startsWith('/products/')) return 'Product Detail';
  return 'Franchise Desk';
}

export default function AppLayout() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.username || user?.name || profile?.owner_name || 'Franchise';
  const initial = String(displayName).trim().charAt(0).toUpperCase() || 'F';
  const business = profile?.business_name || 'Store operations';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('sidebar-locked', menuOpen);
    return () => document.body.classList.remove('sidebar-locked');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop${menuOpen ? ' show' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <BrandLogo />
            <div className="brand-text">
              <span className="brand-name">{APP_NAME}</span>
              <span className="brand-tag">Operations</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav">
          {links.map((group) => (
            <div key={group.section} className="nav-section">
              <p className="nav-section-label">{group.section}</p>
              <div className="nav-section-items">
                {group.items.map((link) =>
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
                      <span className="nav-link-inner">
                        <Icon name={link.icon} />
                        <span>{link.label}</span>
                      </span>
                    </NavLink>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="sidebar-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="sidebar-user-meta">
              <strong>{displayName}</strong>
              <span>{business}</span>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <span className="topbar-brand">{APP_NAME}</span>
            <div className="topbar-title">
              <strong>{pageTitle(location.pathname)}</strong>
              <span>{business}</span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="user-chip">
              <span className="user-avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="user-chip-name">{displayName}</span>
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

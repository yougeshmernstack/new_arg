import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { commerceApi } from '../../api';
import { APP_NAME } from '../../utils/constants';
import '../../styles/layout.css';

const links = [
  { to: '/', label: 'Dashboard', end: true, section: 'Overview', icon: 'dashboard' },
  { to: '/franchises', label: 'Franchises', section: 'Network', icon: 'franchise' },
  { to: '/distributors', label: 'Distributors', icon: 'users' },
  { to: '/kyc', label: 'KYC Requests', icon: 'shield' },
  { to: '/products', label: 'Products', section: 'Catalog', icon: 'box' },
  { to: '/packages', label: 'Packages', icon: 'package' },
  { to: '/inventory', label: 'Inventory', icon: 'layers' },
  {
    label: 'Orders',
    match: '/orders',
    icon: 'cart',
    children: [
      { to: '/orders/franchise', label: 'Franchise Orders', badgeKey: 'franchise' },
      { to: '/orders/distributor', label: 'Distributor Orders', badgeKey: 'distributor' },
      { to: '/orders/theme', label: 'Theme Orders', badgeKey: 'theme' },
    ],
  },
  { to: '/stock-history', label: 'Stock History', icon: 'history' },
  {
    label: 'Funds',
    section: 'Finance',
    icon: 'wallet',
    children: [
      { to: '/payment-settings', label: 'Payment Settings' },
      { to: '/fund-deposits', label: 'Fund Deposits' },
      { to: '/fund-deposit-history', label: 'Deposit History' },
      { to: '/send-fund', label: 'Send Fund' },
      { to: '/send-fund-history', label: 'Send Fund History' },
      { to: '/withdrawals', label: 'Withdrawals' },
    ],
  },
  { to: '/payout-report', label: 'Payout Report', icon: 'chart' },
  {
    label: 'Team / BV',
    section: 'Operations',
    icon: 'team',
    children: [
      { to: '/dummy-business', label: 'Dummy Business' },
      { to: '/dummy-business-history', label: 'Dummy Business History' },
    ],
  },
  {
    label: 'Ranks',
    icon: 'gift',
    children: [
      { to: '/reward-achievements', label: 'Reward List' },
      { to: '/royality-achievements', label: 'Royality List' },
      { to: '/traveling-achievements', label: 'Traveling List' },
    ],
  },
  {
    label: 'Website',
    match: '/website',
    icon: 'globe',
    children: [
      { to: '/website/company', label: 'Company / Brand' },
      { to: '/website/hero', label: 'Hero Background' },
      { to: '/website/about', label: 'About & Founders' },
      { to: '/website/legal', label: 'Legal Documents' },
      { to: '/website/banners', label: 'Dashboard Banners' },
    ],
  },
  { to: '/audit-logs', label: 'Audit Logs', section: 'System', icon: 'audit' },
  { to: '/change-password', label: 'Change Password', icon: 'lock' },
];

function Icon({ name, className = 'ui-icon' }) {
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
    chevron: <path d="M9 6l6 6-6 6" />,
    dashboard: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    franchise: (
      <>
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3.5" />
        <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.35" />
        <path d="M16.5 3.7a3.5 3.5 0 0 1 0 6.6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l8 3.5v5.2c0 4.4-3.1 8.2-8 9.3-4.9-1.1-8-4.9-8-9.3V6.5L12 3z" />
        <path d="M9.5 12l1.8 1.8L15 10" />
      </>
    ),
    box: (
      <>
        <path d="M21 8.5 12 3.5 3 8.5v7l9 5 9-5v-7z" />
        <path d="M3 8.5l9 5 9-5" />
        <path d="M12 13.5V22" />
      </>
    ),
    package: (
      <>
        <path d="M16.5 9.4 7.5 4.2" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    layers: (
      <>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 12l10 5 10-5" />
        <path d="M2 17l10 5 10-5" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" />
        <path d="M16 3H6a2 2 0 0 0-2 2" />
        <circle cx="16.5" cy="13.5" r="1.2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19h16" />
        <path d="M7 16V10" />
        <path d="M12 16V6" />
        <path d="M17 16v-4" />
      </>
    ),
    team: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16.5" cy="9" r="2.5" />
        <path d="M2.5 19c.6-3 2.8-4.5 5.5-4.5S13 16 13.5 19" />
        <path d="M14 14.5c2 .2 3.7 1.3 4.5 4.5" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13" />
        <path d="M3 12h18" />
        <path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8z" />
        <path d="M12 8h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    audit: (
      <>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  };

  return (
    <svg
      className={className}
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

function initialsFrom(name) {
  const parts = String(name || 'A')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function NavBadge({ count }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return (
    <span className="nav-badge" aria-label={`${n} awaiting verification`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

function NavGroup({ item, onNavigate, badges = {} }) {
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

  const groupBadge = item.children.reduce((sum, child) => {
    if (!child.badgeKey) return sum;
    return sum + (Number(badges[child.badgeKey]) || 0);
  }, 0);

  return (
    <div className={`nav-group${open ? ' open' : ''}${childActive ? ' has-active' : ''}`}>
      <button
        type="button"
        className={`nav-group-toggle${childActive ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="nav-item-main">
          {item.icon ? <Icon name={item.icon} className="nav-icon" /> : null}
          <span>{item.label}</span>
          <NavBadge count={groupBadge} />
        </span>
        <Icon name="chevron" className={`nav-caret-icon${open ? ' open' : ''}`} />
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
              <span className="nav-sub-label">{child.label}</span>
              <NavBadge count={child.badgeKey ? badges[child.badgeKey] : 0} />
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
  const [orderBadges, setOrderBadges] = useState({
    franchise: 0,
    distributor: 0,
    theme: 0,
  });

  const displayName = user?.username || user?.name || 'Admin';
  const brandInitial = String(APP_NAME || 'A').trim().charAt(0).toUpperCase() || 'A';

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadOrderBadges = async () => {
    try {
      const roles = ['franchise', 'distributor', 'theme'];
      const results = await Promise.all(
        roles.map((role) =>
          commerceApi.getOrders({
            buyer_role: role,
            payment_status: 'submitted',
            limit: 1,
          }),
        ),
      );
      const next = {};
      roles.forEach((role, idx) => {
        next[role] = Number(results[idx]?.data?.pagination?.total) || 0;
      });
      setOrderBadges(next);
    } catch {
      /* keep last known counts */
    }
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadOrderBadges();
    const timer = window.setInterval(loadOrderBadges, 30000);
    return () => window.clearInterval(timer);
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
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              {brandInitial}
            </div>
            <div className="brand-text">
              <span className="brand-name">{APP_NAME}</span>
              <span className="brand-tag">Control Center</span>
            </div>
          </div>
          <button type="button" className="sidebar-close" aria-label="Close menu" onClick={closeMenu}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav" aria-label="Main">
          {links.map((link) => (
            <div key={link.to || link.label} className="nav-block">
              {link.section ? <div className="nav-section-label">{link.section}</div> : null}
              {link.children ? (
                <NavGroup
                  item={link}
                  onNavigate={closeMenu}
                  badges={link.match === '/orders' ? orderBadges : {}}
                />
              ) : (
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={closeMenu}
                >
                  <span className="nav-item-main">
                    {link.icon ? <Icon name={link.icon} className="nav-icon" /> : null}
                    <span>{link.label}</span>
                  </span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar" aria-hidden="true">
              {initialsFrom(displayName)}
            </span>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
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
            <span className="topbar-brand">{APP_NAME}</span>
          </div>
          <div className="topbar-right">
            <div className="user-chip topbar-user-chip" title={displayName}>
              <span className="user-avatar" aria-hidden="true">
                {initialsFrom(displayName)}
              </span>
              <span className="user-meta">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Administrator</span>
              </span>
            </div>
            <button type="button" className="btn ghost topbar-logout" onClick={handleLogout}>
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

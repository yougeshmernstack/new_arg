import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { distributorApi, storeApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../utils/storage';
import BrandLogo from '../common/BrandLogo';
import '../../styles/layout.css';

const links = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/fund-wallet', label: 'Fund Wallet', icon: 'wallet' },
  { to: '/withdraw', label: 'Withdraw', icon: 'wallet' },
  { to: '/kyc', label: 'KYC', icon: 'user' },
  { to: '/packages', label: 'Packages', icon: 'box' },
  { to: '/products', label: 'Products', icon: 'box' },
  { to: '/cart', label: 'Cart', icon: 'cart' },
  { to: '/orders', label: 'Orders', icon: 'list' },
  {
    label: 'Team',
    icon: 'users',
    children: [
      { to: '/team/direct', label: 'Direct Team' },
      { to: '/team/generation', label: 'Generation Team' },
      { to: '/team/left', label: 'Left Team' },
      { to: '/team/right', label: 'Right Team' },
      { to: '/team/binary', label: 'Binary Team' },
    ],
  },
  {
    label: 'Rewards',
    icon: 'gift',
    children: [
      { to: '/rewards', label: 'Reward' },
      { to: '/royality', label: 'Royality' },
      { to: '/traveling', label: 'Traveling Allowance' },
    ],
  },
  { to: '/profile', label: 'Business Profile', icon: 'user' },
  { to: '/change-password', label: 'Change Password', icon: 'user' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
];

const bottomTabs = [
  { to: '/', label: 'Home', icon: 'grid', end: true },
  { to: '/packages', label: 'Packages', icon: 'box' },
  { to: '/cart', label: 'Cart', icon: 'cart' },
  { to: '/orders', label: 'Orders', icon: 'list' },
];

const titles = {
  '/': ['Dashboard', 'Track your business, earnings and team performance.'],
  '/fund-wallet': ['Fund Wallet', 'Deposit funds via UPI/bank and track approval status'],
  '/withdraw': ['Withdraw', 'Claim income from Main Wallet (KYC approved required)'],
  '/kyc': ['KYC Verification', 'Submit and track PAN, Bank, Aadhaar and Nominee KYC'],
  '/packages': ['Packages', 'Buy a package to activate your account'],
  '/products': ['Products', 'Browse available products and add to cart'],
  '/cart': ['Cart', 'Review items before checkout'],
  '/checkout': ['Checkout', 'Confirm address and place your order'],
  '/orders': ['Orders', 'Track and review your orders'],
  '/team/direct': ['Direct Team', 'Distributors you personally sponsored'],
  '/team/generation': ['Generation Team', 'Your full downline across all levels'],
  '/team/left': ['Left Team', 'Members on your left binary leg'],
  '/team/right': ['Right Team', 'Members on your right binary leg'],
  '/team/binary': ['Binary Team', 'Your binary tree by parent placement'],
  '/rewards': ['Reward', 'Ranks unlocked by lifetime matched business'],
  '/royality': ['Royality', 'Royality ranks based on matched business'],
  '/traveling': ['Traveling Allowance', 'Traveling bonus based on matched business'],
  '/profile': ['Business Profile', 'Manage your account and contact details'],
  '/notifications': ['Notifications', 'Stay updated with your latest activity'],
};

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    box: <><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3.3 7.5L12 12l8.7-4.5" /><path d="M12 12v9" /></>,
    cart: <><circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L21 8H7" /></>,
    list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H5a2 2 0 0 0 0 4h14v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M17 12h.01" /></>,
    gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13" /><path d="M3 12h18" /><path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8z" /><path d="M12 8h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8z" /></>,
    chevron: <><path d="M6 9l6 6 6-6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
    more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  };
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function isTabActive(pathname, tab) {
  if (tab.end) return pathname === tab.to;
  if (tab.to === '/packages') return pathname.startsWith('/packages');
  if (tab.to === '/products') return pathname.startsWith('/products');
  if (tab.to === '/orders') return pathname.startsWith('/orders');
  if (tab.to === '/cart') return pathname === '/cart' || pathname === '/checkout';
  return pathname === tab.to || pathname.startsWith(`${tab.to}/`);
}

function resolveTitle(pathname) {
  if (pathname.match(/^\/packages\/\d+\/checkout$/)) {
    return ['Package checkout', 'Confirm address and activate your account'];
  }
  if (pathname.startsWith('/products/') && pathname !== '/products') {
    return ['Product details', 'View images, description and add to cart'];
  }
  if (pathname.startsWith('/orders/') && pathname !== '/orders') {
    return ['Order details', 'Track status and items for this order'];
  }
  if (pathname.startsWith('/income/')) {
    const slug = decodeURIComponent(pathname.split('/')[2] || '');
    const label = slug
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return [label || 'Income History', 'Credit history for this income type'];
  }
  return titles[pathname] || titles['/'];
}

export default function AppLayout() {
  const { user, profile, setProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const teamActive = location.pathname.startsWith('/team');
  const rewardsActive =
    location.pathname.startsWith('/rewards')
    || location.pathname.startsWith('/royality')
    || location.pathname.startsWith('/traveling');
  const moreActive = teamActive
    || rewardsActive
    || location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/notifications')
    || location.pathname.startsWith('/fund-wallet')
    || location.pathname.startsWith('/withdraw');
  const [teamOpen, setTeamOpen] = useState(teamActive);
  const [rewardsOpen, setRewardsOpen] = useState(rewardsActive);
  const isDashboard = location.pathname === '/';
  const [title, subtitle] = resolveTitle(location.pathname);
  const accountId = user?.username || profile?.username || '';
  const displayName = profile?.name || user?.name || accountId || 'Distributor';
  const initial = displayName.charAt(0).toUpperCase();
  const accountStatus = String(profile?.status || 'active').toLowerCase();
  const isActive = accountStatus === 'active' && Number(profile?.blockStatus || 0) !== 1;
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const headerTitle = isDashboard ? `${greetingForNow()}, ${displayName}!` : title;
  const headerSubtitle = isDashboard
    ? 'Track your business, earnings and team performance.'
    : subtitle;

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);
  const closeProfile = () => setProfileOpen(false);

  const openProfile = async () => {
    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const res = await distributorApi.getProfile();
      const distributor = res.data?.distributor;
      if (distributor) {
        setProfile(distributor);
        storage.setProfile(distributor);
      }
    } catch {
      // keep cached profile in the panel
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (teamActive) setTeamOpen(true);
  }, [teamActive]);

  useEffect(() => {
    if (rewardsActive) setRewardsOpen(true);
  }, [rewardsActive]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getCart();
        if (!active) return;
        const items = res.data?.data?.items || [];
        setCartCount(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
      } catch {
        if (active) setCartCount(0);
      }
    })();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.classList.toggle('sidebar-locked', menuOpen || profileOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('sidebar-locked');
    };
  }, [menuOpen, profileOpen]);

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <button type="button" className="sidebar-close" aria-label="Close menu" onClick={closeMenu}>
            <Icon name="close" />
          </button>
        </div>

        <p className="nav-label">Workspace</p>
        <nav className="side-nav">
          {links.map((link) => {
            if (link.children) {
              const isTeam = link.label === 'Team';
              const isRewards = link.label === 'Rewards';
              const groupOpen = isTeam ? teamOpen : isRewards ? rewardsOpen : false;
              const groupActive = isTeam ? teamActive : isRewards ? rewardsActive : false;
              const toggleOpen = isTeam
                ? () => setTeamOpen((open) => !open)
                : isRewards
                  ? () => setRewardsOpen((open) => !open)
                  : () => {};

              return (
                <div key={link.label} className={`nav-group ${groupOpen || groupActive ? 'open' : ''}`}>
                  <button
                    type="button"
                    className={`side-link nav-group-toggle ${groupActive ? 'active' : ''}`}
                    aria-expanded={groupOpen}
                    onClick={toggleOpen}
                  >
                    <Icon name={link.icon} />
                    <span>{link.label}</span>
                    <Icon name="chevron" />
                  </button>
                  <div className="nav-sub">
                    {link.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => (isActive ? 'nav-sub-link active' : 'nav-sub-link')}
                        onClick={closeMenu}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
                onClick={closeMenu}
              >
                <Icon name={link.icon} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="sidebar-user-card" onClick={openProfile}>
            <span className="user-avatar">{initial}</span>
            <div className="sidebar-user-meta">
              <strong>{displayName}</strong>
              <small>{accountId ? `ID: ${accountId}` : 'Distributor'}</small>
            </div>
          </button>

          <div className="sidebar-promo">
            <span>Live Healthy</span>
            <strong>Live Better</strong>
            <NavLink to="/products" className="sidebar-promo-btn" onClick={closeMenu}>
              Explore Products
            </NavLink>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="d-flex align-items-center gap-2 topbar-left min-w-0">
            <button
              type="button"
              className="menu-toggle d-lg-none"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
            <div className="topbar-title min-w-0">
              <h1 className={`text-truncate ${isDashboard ? 'is-greeting' : ''}`}>
                {headerTitle}
                {isDashboard ? <span className="greeting-leaf" aria-hidden="true"> 🌿</span> : null}
              </h1>
              <p className="d-none d-sm-block text-truncate mb-0">{headerSubtitle}</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 topbar-right flex-shrink-0">
            <span className="topbar-date d-none d-md-inline">{todayLabel}</span>
            <NavLink
              to="/notifications"
              className="icon-button topbar-bell"
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" />
            </NavLink>
            <button
              type="button"
              className="user-chip"
              title={accountId ? `ID: ${accountId}` : 'View profile'}
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={openProfile}
            >
              <span className="user-avatar">{initial}</span>
              <span className="d-none d-lg-grid">
                <strong>{displayName}</strong>
                <small>{accountId ? `ID: ${accountId}` : 'Distributor'}</small>
              </span>
            </button>
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

      {profileOpen ? (
        <div className="profile-popover-backdrop" role="presentation" onClick={closeProfile}>
          <div
            className="profile-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Account profile"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-popover-head">
              <div className="profile-popover-identity">
                <span className="user-avatar">{initial}</span>
                <div>
                  <strong>{displayName}</strong>
                  <small>{accountId ? `ID: ${accountId}` : 'Distributor'}</small>
                </div>
              </div>
              <button type="button" className="icon-button" aria-label="Close profile" onClick={closeProfile}>
                <Icon name="close" />
              </button>
            </div>

            <div className="profile-popover-body">
              <div className="profile-popover-status">
                <span>Account status</span>
                <em className={isActive ? 'is-active' : 'is-inactive'}>
                  {isActive ? 'Active' : accountStatus === 'disabled' ? 'Disabled' : 'Inactive'}
                </em>
              </div>

              {profileLoading ? (
                <p className="profile-popover-loading">Loading details...</p>
              ) : (
                <dl className="profile-popover-details">
                  <div>
                    <dt>Name</dt>
                    <dd>{profile?.name || displayName || '—'}</dd>
                  </div>
                  <div>
                    <dt>Username</dt>
                    <dd>{profile?.username || accountId || '—'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile?.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>{profile?.mobile || '—'}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{formatDate(profile?.joining_date)}</dd>
                  </div>
                  <div>
                    <dt>Position</dt>
                    <dd>{profile?.position || '—'}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="profile-popover-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  closeProfile();
                  navigate('/profile');
                }}
              >
                Edit profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="mobile-tabbar d-lg-none" aria-label="Primary">
        {bottomTabs.map((tab) => {
          const active = isTabActive(location.pathname, tab);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={`mobile-tab ${active ? 'active' : ''}`}
            >
              <span className="mobile-tab-icon">
                <Icon name={tab.icon} />
                {tab.to === '/cart' && cartCount > 0 ? (
                  <span className="mobile-tab-badge">{cartCount > 99 ? '99+' : cartCount}</span>
                ) : null}
              </span>
              <span className="mobile-tab-label">{tab.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`mobile-tab ${moreActive || menuOpen ? 'active' : ''}`}
          aria-label="More menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span className="mobile-tab-icon">
            <Icon name="more" />
          </span>
          <span className="mobile-tab-label">More</span>
        </button>
      </nav>
    </div>
  );
}

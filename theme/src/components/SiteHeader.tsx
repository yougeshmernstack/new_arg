'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeaderAuthLinks } from '@/components/HeaderAuthLinks';
import { clearThemeToken, getThemeToken } from '@/lib/themeApi';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/packages', label: 'Packages' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/shop', label: 'Shop' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SiteHeaderProps = {
  brandName: string;
  brandLogo: string;
};

export function SiteHeader({ brandName, brandLogo }: SiteHeaderProps) {
  const pathname = usePathname() || '/';
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getThemeToken()));
  }, [pathname]);

  useEffect(() => {
    document.body.classList.remove('nav-menu-open');
    document.querySelector('[data-site-header]')?.classList.remove('is-nav-open');
    const panel = document.querySelector('[data-nav-panel]');
    if (panel instanceof HTMLElement) {
      panel.hidden = true;
      panel.classList.remove('is-open');
    }
    const toggle = document.querySelector('[data-nav-toggle]');
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      toggle.classList.remove('is-open');
    }
  }, [pathname]);

  return (
    <header className="site-header site-header-3d" data-site-header>
      <nav className="navbar-3d" aria-label="Primary">
        <div className="navbar-3d-inner">
          <Link className="navbar-brand brand" href="/">
            <span className="brand-logo">
              <Image
                src={brandLogo}
                alt={brandName}
                width={160}
                height={160}
                priority
                unoptimized={brandLogo.startsWith('http')}
              />
            </span>
            <span className="brand-wordmark">{brandName}</span>
          </Link>

          <ul className="nav-links-3d nav-links-desktop">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  className={`nav-link${isActive(pathname, item.href) ? ' active' : ''}`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="navbar-actions-desktop">
            <HeaderAuthLinks />
            <Link className="header-cart" href="/shop/cart" aria-label="Cart">
              <CartIcon />
            </Link>
            <Link className="btn btn-nav-3d" href="/products">
              Shop now
            </Link>
          </div>

          <button
            className="nav-toggler-3d"
            type="button"
            data-nav-toggle
            aria-controls="mobile-nav-panel"
            aria-expanded="false"
            aria-label="Open menu"
          >
            <span className="nav-toggler-bars" aria-hidden="true" />
          </button>
        </div>

        <div
          id="mobile-nav-panel"
          className="nav-panel-mobile"
          data-nav-panel
          hidden
        >
          <ul className="nav-links-3d">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  className={`nav-link${isActive(pathname, item.href) ? ' active' : ''}`}
                  href={item.href}
                  data-nav-close
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-mobile-extra">
            <Link className="nav-link" href="/shop/cart" data-nav-close>
              Cart
            </Link>
            {loggedIn ? (
              <>
                <Link className="nav-link" href="/account/change-password" data-nav-close>
                  Account
                </Link>
                <button
                  type="button"
                  className="nav-link nav-logout-btn"
                  data-nav-close
                  onClick={() => {
                    clearThemeToken();
                    setLoggedIn(false);
                    window.location.href = '/login';
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="nav-link" href="/login" data-nav-close>
                  Sign in
                </Link>
                <Link className="btn btn-nav-3d" href="/signup" data-nav-close>
                  Sign up
                </Link>
              </>
            )}
            <Link className="btn btn-nav-3d" href="/products" data-nav-close>
              Shop now
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M6 7h14l-1.4 9.2a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.6L5.2 4.5A1.5 1.5 0 0 0 3.7 3.3H2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearThemeToken, getThemeToken } from '@/lib/themeApi';

export function HeaderAuthLinks() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getThemeToken()));
    const sync = () => setLoggedIn(Boolean(getThemeToken()));
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  if (!loggedIn) {
    return (
      <div className="header-auth">
        <Link className="header-link" href="/login">
          Sign in
        </Link>
        <Link className="button button-soft header-signup" href="/signup">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link className="header-link header-link-muted" href="/account/change-password">
        Account
      </Link>
      <button
        type="button"
        className="header-link"
        onClick={() => {
          clearThemeToken();
          setLoggedIn(false);
          window.location.href = '/login';
        }}
      >
        Logout
      </button>
    </>
  );
}

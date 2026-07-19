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
      <Link className="header-link" href="/login">
        Login
      </Link>
    );
  }

  return (
    <>
      <Link className="header-link" href="/account/change-password">
        Change Password
      </Link>
      <button
        type="button"
        className="header-link"
        style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}
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

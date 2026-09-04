'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Reset window scroll on every App Router navigation (nav links, etc.). */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Restore CSS smooth scroll for in-page anchors after paint
    const id = window.requestAnimationFrame(() => {
      html.style.scrollBehavior = previous;
    });

    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

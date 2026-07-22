'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

type HeroBleedProps = {
  brandName: string;
  slogan: string;
  lede: string;
  heroSrc: string;
};

function splitBrand(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      primary: parts[0],
      secondary: parts.slice(1).join(' '),
    };
  }
  return { primary: name, secondary: '' };
}

export function HeroBleed({ brandName, slogan, lede, heroSrc }: HeroBleedProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const { primary, secondary } = splitBrand(brandName);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const onScroll = () => {
      const y = Math.min(window.scrollY, 420);
      media.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1.04 + y * 0.00012})`;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="hero-bleed">
      <div className="hero-media" ref={mediaRef} aria-hidden="true">
        <Image
          src={heroSrc}
          alt=""
          fill
          priority
          className="hero-media-img"
          unoptimized={heroSrc.startsWith('http')}
          sizes="100vw"
        />
      </div>

      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker reveal-line">Natural wellness</p>

          <h1 className="hero-brand-stack" aria-label={brandName}>
            <span className="hero-brand-line reveal-line delay-brand-1">{primary}</span>
            {secondary ? (
              <span className="hero-brand-line hero-brand-accent reveal-line delay-brand-2">
                {secondary}
              </span>
            ) : null}
          </h1>

          <span className="hero-rule reveal-rule" aria-hidden="true" />

          <p className="hero-title reveal-fade">{slogan}</p>
          <p className="hero-lede reveal-fade delay-lede">{lede}</p>

          <div className="hero-cta reveal-fade delay-cta">
            <Link className="button button-hero" href="/products">
              <span>Shop products</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link className="hero-link" href="/packages">
              View packages
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <a className="hero-scroll" href="#catalog" aria-label="Scroll to products">
        <span className="hero-scroll-dot" />
        <span>Discover</span>
      </a>
    </section>
  );
}

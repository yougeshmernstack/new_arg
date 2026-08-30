'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NatureAmbient } from '@/components/NatureAmbient';
import type { HeroSlide } from '@/lib/siteContent';

const HERO_INTERVAL_MS = 1500;
const SWIPE_THRESHOLD_PX = 48;

type HeroBleedProps = {
  brandName: string;
  slogan: string;
  lede: string;
  heroSrc: string;
  slides?: HeroSlide[];
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

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function HeroBleed({ brandName, slogan, lede, heroSrc, slides }: HeroBleedProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  // Kept for feature re-enable (hero brand copy box below)
  const { primary, secondary } = splitBrand(brandName);
  void primary;
  void secondary;
  void slogan;
  void lede;

  const slideList: HeroSlide[] =
    slides && slides.length > 0
      ? slides
      : heroSrc
        ? [{ id: 'solo', imageUrl: heroSrc, linkUrl: '', title: '' }]
        : [];

  const count = slideList.length;
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    setIndex(0);
    setAnimate(true);
  }, [count]);

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

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + HERO_INTERVAL_MS * 2;
  }, []);

  const goTo = useCallback(
    (next: number, manual = false) => {
      if (count <= 1) return;
      setAnimate(true);
      setIndex(next);
      if (manual) pauseAutoplay();
    },
    [count, pauseAutoplay],
  );

  const manualNext = useCallback(() => {
    if (count <= 1) return;
    setAnimate(true);
    setIndex((prev) => {
      const visual = ((prev % count) + count) % count;
      return visual + 1;
    });
    pauseAutoplay();
  }, [count, pauseAutoplay]);

  const manualPrev = useCallback(() => {
    if (count <= 1) return;
    setAnimate(true);
    setIndex((prev) => {
      const visual = ((prev % count) + count) % count;
      return visual - 1;
    });
    pauseAutoplay();
  }, [count, pauseAutoplay]);

  // Autoplay: advance so slides move right → left
  useEffect(() => {
    if (count <= 1) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setAnimate(true);
      setIndex((prev) => (prev >= count ? prev : prev + 1));
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== track) return;
      if (index >= count) {
        setAnimate(false);
        setIndex(0);
      } else if (index < 0) {
        setAnimate(false);
        setIndex(count - 1);
      }
    };

    track.addEventListener('transitionend', onEnd);
    return () => track.removeEventListener('transitionend', onEnd);
  }, [index, count]);

  useEffect(() => {
    if (animate) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, index]);

  // Keyboard ← →
  useEffect(() => {
    if (count <= 1) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        manualNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        manualPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, manualNext, manualPrev]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null || count <= 1) return;
    const end = event.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) manualNext();
    else manualPrev();
  };

  const visualIndex = count > 0 ? ((index % count) + count) % count : 0;
  const loopSlides =
    count > 1 ? [slideList[count - 1], ...slideList, slideList[0]] : slideList;
  const trackIndex = count > 1 ? index + 1 : 0;

  const renderSlideMedia = (slide: HeroSlide, key: string, priority: boolean) => {
    const image = (
      <Image
        src={slide.imageUrl}
        alt={slide.title || ''}
        fill
        priority={priority}
        className="hero-media-img"
        unoptimized={slide.imageUrl.startsWith('http')}
        sizes="100vw"
      />
    );

    if (!slide.linkUrl) {
      return (
        <div className="hero-slide" key={key}>
          {image}
        </div>
      );
    }

    if (isExternalUrl(slide.linkUrl)) {
      return (
        <div className="hero-slide" key={key}>
          <a className="hero-slide-link" href={slide.linkUrl} target="_blank" rel="noreferrer">
            {image}
          </a>
        </div>
      );
    }

    return (
      <div className="hero-slide" key={key}>
        <Link className="hero-slide-link" href={slide.linkUrl}>
          {image}
        </Link>
      </div>
    );
  };

  return (
    <section
      className="hero-bleed"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-media" ref={mediaRef} aria-hidden={count > 1 ? undefined : true}>
        {count <= 1 ? (
          renderSlideMedia(slideList[0] || { id: 'empty', imageUrl: heroSrc, linkUrl: '', title: '' }, 'solo', true)
        ) : (
          <div
            ref={trackRef}
            className={`hero-slider-track${animate ? ' is-animated' : ''}`}
            style={{ transform: `translate3d(-${trackIndex * 100}%, 0, 0)` }}
          >
            {loopSlides.map((slide, i) =>
              renderSlideMedia(slide, `${slide.id}-${i}`, i === trackIndex)
            )}
          </div>
        )}
      </div>

      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />

      {/* Feature: hero brand copy box — uncomment to re-enable
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
      */}

      <NatureAmbient />

      {count > 1 ? (
        <>
          <button
            type="button"
            className="hero-slider-nav hero-slider-prev"
            aria-label="Previous slide"
            onClick={manualPrev}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="hero-slider-nav hero-slider-next"
            aria-label="Next slide"
            onClick={manualNext}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="hero-slider-dots" role="tablist" aria-label="Hero slides">
            {slideList.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === visualIndex}
                className={`hero-slider-dot${i === visualIndex ? ' is-active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i, true)}
              />
            ))}
          </div>
        </>
      ) : null}

      <a className="hero-scroll" href="#catalog" aria-label="Scroll to products">
        <span className="hero-scroll-dot" />
        <span>Discover</span>
      </a>
    </section>
  );
}

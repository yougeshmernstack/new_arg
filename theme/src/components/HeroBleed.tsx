'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
} from 'react';
import type { HeroSlide } from '@/lib/siteContent';

const HERO_INTERVAL_MS = 5500;
const SWIPE_THRESHOLD_PX = 48;

/** Gen-Z transition pack — cycles so each change feels different */
const FX = ['blinds', 'slices', 'tiles', 'swipe', 'zoom'] as const;
type HeroFx = (typeof FX)[number];

const FX_MS: Record<HeroFx, number> = {
  blinds: 1850,
  slices: 1750,
  tiles: 1950,
  swipe: 1450,
  zoom: 1550,
};

const STRIP_COUNT = 12;
const SLICE_COUNT = 8;
const TILE_COLS = 6;
const TILE_ROWS = 4;

type HeroBleedProps = {
  brandName: string;
  slogan: string;
  lede: string;
  heroSrc: string;
  slides?: HeroSlide[];
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function SlideImage({
  slide,
  priority = false,
  className = 'hero-media-img',
}: {
  slide: HeroSlide;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={slide.imageUrl}
      alt={slide.title || 'Hero banner'}
      fill
      priority={priority}
      className={className}
      unoptimized={slide.imageUrl.startsWith('http')}
      sizes="100vw"
      draggable={false}
    />
  );
}

function SlideLink({
  slide,
  children,
  className = 'hero-slide-link',
}: {
  slide: HeroSlide;
  children: ReactNode;
  className?: string;
}) {
  if (!slide.linkUrl) return <>{children}</>;

  if (isExternalUrl(slide.linkUrl)) {
    return (
      <a className={className} href={slide.linkUrl} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={slide.linkUrl}>
      {children}
    </Link>
  );
}

function FxOverlay({ slide, fx }: { slide: HeroSlide; fx: HeroFx }) {
  if (fx === 'blinds') {
    return (
      <div className="hero-fx hero-fx-blinds is-run" aria-hidden="true">
        {Array.from({ length: STRIP_COUNT }, (_, i) => (
          <div
            key={`b-${i}`}
            className="hero-fx-cell"
            style={{ '--i': i, '--n': STRIP_COUNT } as CSSProperties}
          >
            <div className="hero-fx-pane hero-fx-pane-x">
              <SlideImage slide={slide} className="hero-media-img hero-fx-img" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fx === 'slices') {
    return (
      <div className="hero-fx hero-fx-slices is-run" aria-hidden="true">
        {Array.from({ length: SLICE_COUNT }, (_, i) => (
          <div
            key={`s-${i}`}
            className="hero-fx-row"
            style={{ '--i': i, '--n': SLICE_COUNT } as CSSProperties}
          >
            <div className="hero-fx-pane hero-fx-pane-y">
              <SlideImage slide={slide} className="hero-media-img hero-fx-img" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fx === 'tiles') {
    const total = TILE_COLS * TILE_ROWS;
    return (
      <div
        className="hero-fx hero-fx-tiles is-run"
        style={{ '--cols': TILE_COLS, '--rows': TILE_ROWS } as CSSProperties}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, i) => {
          const col = i % TILE_COLS;
          const row = Math.floor(i / TILE_COLS);
          return (
            <div
              key={`t-${i}`}
              className="hero-fx-tile"
              style={
                {
                  '--i': i,
                  '--col': col,
                  '--row': row,
                  '--cols': TILE_COLS,
                  '--rows': TILE_ROWS,
                } as CSSProperties
              }
            >
              <div className="hero-fx-pane hero-fx-pane-tile">
                <SlideImage slide={slide} className="hero-media-img hero-fx-img" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (fx === 'swipe') {
    return (
      <div className="hero-fx hero-fx-swipe is-run" aria-hidden="true">
        <div className="hero-fx-swipe-sheet">
          <SlideImage slide={slide} className="hero-media-img hero-fx-img" />
        </div>
      </div>
    );
  }

  // zoom + soft flash
  return (
    <div className="hero-fx hero-fx-zoom is-run" aria-hidden="true">
      <div className="hero-fx-zoom-sheet">
        <SlideImage slide={slide} className="hero-media-img hero-fx-img" />
      </div>
      <span className="hero-fx-flash" />
    </div>
  );
}

export function HeroBleed({ brandName, slogan, lede, heroSrc, slides }: HeroBleedProps) {
  void brandName;
  void slogan;
  void lede;

  const mediaRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const lockRef = useRef(false);
  const activeIndexRef = useRef(0);
  const fxIndexRef = useRef(0);
  const autoplayTimerRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);

  const slideList: HeroSlide[] =
    slides && slides.length > 0
      ? slides
      : heroSrc
        ? [{ id: 'solo', imageUrl: heroSrc, linkUrl: '', title: '' }]
        : [];

  const count = slideList.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'out'>('idle');
  const [activeFx, setActiveFx] = useState<HeroFx>('blinds');
  const [incomingFx, setIncomingFx] = useState<HeroFx>('blinds');

  activeIndexRef.current = activeIndex;

  const clearUnlockTimer = useCallback(() => {
    if (unlockTimerRef.current != null) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
  }, []);

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current != null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + HERO_INTERVAL_MS * 2;
  }, []);

  const finishTransition = useCallback(() => {
    clearUnlockTimer();
    setOutgoingIndex(null);
    setPhase('idle');
    lockRef.current = false;
  }, [clearUnlockTimer]);

  const nextFx = useCallback(() => {
    const fx = FX[fxIndexRef.current % FX.length];
    fxIndexRef.current += 1;
    return fx;
  }, []);

  const changeTo = useCallback(
    (nextIndex: number, manual = false) => {
      if (count <= 1 || lockRef.current) return false;
      const next = ((nextIndex % count) + count) % count;
      const current = activeIndexRef.current;
      if (next === current) return false;

      if (manual) pauseAutoplay();

      if (prefersReducedMotion()) {
        setActiveIndex(next);
        setOutgoingIndex(null);
        setPhase('idle');
        return true;
      }

      const fx = nextFx();
      lockRef.current = true;
      clearUnlockTimer();
      setActiveFx(fx);
      setIncomingFx(fx);
      setOutgoingIndex(current);
      setActiveIndex(next);
      setPhase('out');

      unlockTimerRef.current = window.setTimeout(() => {
        finishTransition();
      }, FX_MS[fx]);

      return true;
    },
    [clearUnlockTimer, count, finishTransition, nextFx, pauseAutoplay],
  );

  const manualNext = useCallback(() => {
    changeTo(activeIndexRef.current + 1, true);
  }, [changeTo]);

  const manualPrev = useCallback(() => {
    changeTo(activeIndexRef.current - 1, true);
  }, [changeTo]);

  const goTo = useCallback(
    (target: number) => {
      changeTo(target, true);
    },
    [changeTo],
  );

  useEffect(() => {
    setActiveIndex(0);
    setOutgoingIndex(null);
    setPhase('idle');
    lockRef.current = false;
    fxIndexRef.current = 0;
    clearUnlockTimer();
    clearAutoplayTimer();
  }, [count, clearAutoplayTimer, clearUnlockTimer]);

  useEffect(() => {
    if (count <= 1) return undefined;

    const tick = (wait = HERO_INTERVAL_MS) => {
      clearAutoplayTimer();
      autoplayTimerRef.current = window.setTimeout(() => {
        if (Date.now() < pauseUntilRef.current || lockRef.current) {
          tick(300);
          return;
        }
        changeTo(activeIndexRef.current + 1);
        tick(HERO_INTERVAL_MS);
      }, wait);
    };

    tick(HERO_INTERVAL_MS);
    return () => clearAutoplayTimer();
  }, [changeTo, clearAutoplayTimer, count]);

  useEffect(
    () => () => {
      clearAutoplayTimer();
      clearUnlockTimer();
    },
    [clearAutoplayTimer, clearUnlockTimer],
  );

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.style.transform = '';
  }, []);

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

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null || count <= 1) return;
    const end = event.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) manualNext();
    else manualPrev();
  };

  const activeSlide = slideList[activeIndex] || slideList[0];
  const outgoingSlide = outgoingIndex != null ? slideList[outgoingIndex] : null;

  if (!activeSlide) {
    return <section className="hero-bleed hero-bleed-empty" aria-hidden="true" />;
  }

  return (
    <section
      className="hero-bleed"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Hero banners"
    >
      <div className="hero-media" ref={mediaRef}>
        <div className="hero-stage">
          <div
            className={`hero-layer is-base is-in-${incomingFx}`}
            key={activeSlide.id}
          >
            <SlideLink slide={activeSlide}>
              <SlideImage slide={activeSlide} priority />
            </SlideLink>
          </div>

          {outgoingSlide && phase === 'out' ? (
            <FxOverlay key={`${outgoingSlide.id}-${activeFx}`} slide={outgoingSlide} fx={activeFx} />
          ) : null}
        </div>
      </div>

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
                aria-selected={i === activeIndex}
                className={`hero-slider-dot${i === activeIndex ? ' is-active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
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

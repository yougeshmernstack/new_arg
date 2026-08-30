'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Always default ON — only mute for this session if user clicks mute */
const STORAGE_KEY = 'theme-nature-ambient-v3';
const AUDIO_SRC = '/audio/morning-birds.mp3';
const MASTER_VOLUME = 0.55;

export function NatureAmbient() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantedOnRef = useRef(true);
  const unlockCleanupRef = useRef<(() => void) | null>(null);
  // Optimistic "Sound on" by default (browsers may delay real audio until gesture)
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);

  const clearUnlockListeners = useCallback(() => {
    unlockCleanupRef.current?.();
    unlockCleanupRef.current = null;
  }, []);

  const armUnlockListeners = useCallback(
    (resume: () => void) => {
      clearUnlockListeners();
      const events: Array<keyof WindowEventMap> = [
        'pointerdown',
        'pointermove',
        'touchstart',
        'keydown',
        'wheel',
        'scroll',
        'click',
      ];
      const onUnlock = () => {
        clearUnlockListeners();
        resume();
      };
      for (const event of events) {
        window.addEventListener(event, onUnlock, { capture: true, passive: true });
      }
      unlockCleanupRef.current = () => {
        for (const event of events) {
          window.removeEventListener(event, onUnlock, { capture: true });
        }
      };
    },
    [clearUnlockListeners],
  );

  const getAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = MASTER_VOLUME;
    audioRef.current = audio;
    return audio;
  }, []);

  const enable = useCallback(async () => {
    wantedOnRef.current = true;
    setOn(true);
    const audio = getAudio();
    audio.volume = MASTER_VOLUME;
    audio.muted = false;

    const markPlaying = () => {
      setOn(true);
      clearUnlockListeners();
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    };

    try {
      await audio.play();
      markPlaying();
    } catch {
      // Keep UI as Sound on; start audio on first gesture
      setOn(true);
      armUnlockListeners(() => {
        if (!wantedOnRef.current) return;
        void audio.play().then(markPlaying).catch(() => undefined);
      });
    }
  }, [getAudio, armUnlockListeners, clearUnlockListeners]);

  const disable = useCallback(() => {
    wantedOnRef.current = false;
    clearUnlockListeners();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setOn(false);
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      // ignore
    }
  }, [clearUnlockListeners]);

  const toggle = useCallback(() => {
    if (wantedOnRef.current && on) {
      disable();
      return;
    }
    wantedOnRef.current = true;
    void enable();
  }, [on, enable, disable]);

  useEffect(() => {
    setReady(true);

    // Fresh visits always start ON (ignore old mute so default stays play)
    wantedOnRef.current = true;
    try {
      localStorage.removeItem('theme-nature-ambient');
      localStorage.removeItem('theme-nature-ambient-v2');
    } catch {
      // ignore
    }
    void enable();

    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !wantedOnRef.current) return;
      if (document.hidden) {
        audio.pause();
      } else {
        void audio.play().then(() => setOn(true)).catch(() => {
          setOn(true);
          armUnlockListeners(() => {
            if (!wantedOnRef.current) return;
            void audio.play().then(() => setOn(true)).catch(() => undefined);
          });
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearUnlockListeners();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once for autoplay
  }, []);

  if (!ready) return null;

  return (
    <button
      type="button"
      className={`hero-ambient${on ? ' is-on' : ''}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Mute morning birds' : 'Play morning birds'}
      title={on ? 'Sound on — click to mute' : 'Click to play morning birds'}
    >
      <span className="hero-ambient-waves" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="hero-ambient-label">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'theme-nature-ambient';
const MASTER_GAIN = 0.055;

type AmbientNodes = {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBufferSourceNode;
  chirpTimer: number;
};

function getAudioContextCtor() {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  );
}

function createNoiseBuffer(ctx: AudioContext, seconds = 4) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    // Soft brown-ish noise — gentle breeze / leaves
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

function playSoftChirp(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const startFreq = 1800 + Math.random() * 1400;
  const endFreq = startFreq * (0.72 + Math.random() * 0.18);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(400, endFreq), now + 0.18);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.02, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.25);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function startAmbient(ctx: AudioContext): AmbientNodes {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.55;
  filter.connect(master);

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.55;
  noiseGain.connect(filter);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx);
  noise.loop = true;
  noise.connect(noiseGain);
  noise.start();

  const nodes: AmbientNodes = {
    ctx,
    master,
    noise,
    chirpTimer: 0,
  };

  const scheduleChirps = () => {
    if (ctx.state === 'closed') return;
    playSoftChirp(ctx, master);
    const next = 2800 + Math.random() * 5200;
    nodes.chirpTimer = window.setTimeout(scheduleChirps, next);
  };

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(MASTER_GAIN, ctx.currentTime + 1.6);

  nodes.chirpTimer = window.setTimeout(scheduleChirps, 1600 + Math.random() * 2000);

  return nodes;
}

function stopAmbient(nodes: AmbientNodes | null) {
  if (!nodes) return;
  window.clearTimeout(nodes.chirpTimer);
  const { ctx, master, noise } = nodes;
  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    window.setTimeout(() => {
      try {
        noise.stop();
        noise.disconnect();
        master.disconnect();
        void ctx.close();
      } catch {
        // already torn down
      }
    }, 560);
  } catch {
    void ctx.close();
  }
}

function wasUserMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '0';
  } catch {
    return false;
  }
}

export function NatureAmbient() {
  const nodesRef = useRef<AmbientNodes | null>(null);
  const wantedOnRef = useRef(!wasUserMuted());
  const unlockCleanupRef = useRef<(() => void) | null>(null);
  const [on, setOn] = useState(false);
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
        'touchstart',
        'keydown',
        'wheel',
        'scroll',
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

  const enable = useCallback(async () => {
    if (nodesRef.current) {
      const { ctx } = nodesRef.current;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // still blocked
        }
      }
      if (ctx.state === 'running') {
        setOn(true);
        clearUnlockListeners();
      }
      return;
    }

    const Ctx = getAudioContextCtor();
    const ctx = new Ctx();
    nodesRef.current = startAmbient(ctx);

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
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      // browser may still block until gesture
    }

    if (ctx.state === 'running') {
      markPlaying();
      return;
    }

    // Autoplay blocked — unlock on first page interaction
    setOn(false);
    armUnlockListeners(() => {
      void ctx.resume().then(() => {
        if (ctx.state === 'running' && wantedOnRef.current) markPlaying();
      });
    });
  }, [armUnlockListeners, clearUnlockListeners]);

  const disable = useCallback(() => {
    wantedOnRef.current = false;
    clearUnlockListeners();
    stopAmbient(nodesRef.current);
    nodesRef.current = null;
    setOn(false);
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      // ignore
    }
  }, [clearUnlockListeners]);

  const toggle = useCallback(() => {
    if (on) {
      disable();
      return;
    }
    wantedOnRef.current = true;
    void enable();
  }, [on, enable, disable]);

  useEffect(() => {
    setReady(true);

    // Auto-start unless user previously muted
    if (wantedOnRef.current) {
      void enable();
    }

    const onVisibility = () => {
      const nodes = nodesRef.current;
      if (!nodes || !wantedOnRef.current) return;
      if (document.hidden) {
        void nodes.ctx.suspend();
      } else {
        void nodes.ctx.resume().then(() => {
          if (nodes.ctx.state === 'running') setOn(true);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearUnlockListeners();
      stopAmbient(nodesRef.current);
      nodesRef.current = null;
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
      aria-label={on ? 'Mute nature sound' : 'Unmute nature sound'}
      title={on ? 'Sound on — click to mute' : 'Click or scroll to start sound'}
    >
      <span className="hero-ambient-waves" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="hero-ambient-label">{on ? 'Sound on' : 'Nature'}</span>
    </button>
  );
}

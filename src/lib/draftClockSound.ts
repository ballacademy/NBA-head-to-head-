/** Draft-clock tick (Web Audio — no asset file). Same sound every second. */
let sharedAudioContext: AudioContext | null = null;
let unlockListenersAttached = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctx) {
    return null;
  }

  sharedAudioContext ??= new Ctx();
  return sharedAudioContext;
};

/** Resume AudioContext after a user gesture (required on iOS / many desktop browsers). */
export const unlockDraftClockAudio = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    // Silent buffer primes the graph so later ticks are not dropped.
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Unlock failures should never block drafting.
  }
};

/** Attach one-shot listeners so the first tap/key anywhere unlocks audio. */
export const ensureDraftClockAudioUnlocked = (): void => {
  if (typeof window === "undefined" || unlockListenersAttached) {
    return;
  }

  unlockListenersAttached = true;
  const unlock = () => {
    unlockDraftClockAudio();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
  };

  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("touchstart", unlock, true);
};

/**
 * Mid-range tick — same on every countdown beat, loud enough for phone speakers
 * without needing max device volume.
 * `secondsLeft` is kept for call-site compatibility and ignored.
 */
export const playDraftClockPing = (_secondsLeft?: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const schedule = () => {
      const t0 = ctx.currentTime;
      const duration = 0.09;
      const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < sampleCount; i += 1) {
        const t = i / sampleCount;
        // Short noise burst with a fast decay — reads as a tick, not a beep.
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 22);
      }

      // Soft limiter so stacked voices stay clear without needing max volume.
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.15, t0);
      master.connect(ctx.destination);

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      // Lower band so phone speakers can actually reproduce it.
      filter.frequency.setValueAtTime(950, t0);
      filter.Q.setValueAtTime(0.55, t0);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.95, t0 + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

      // Stronger body under the noise for mobile audibility.
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(420, t0);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, t0);
      oscGain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);

      // Harmonic for laptop speakers that roll off lows.
      const harmonic = ctx.createOscillator();
      harmonic.type = "triangle";
      harmonic.frequency.setValueAtTime(840, t0);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.0001, t0);
      harmonicGain.gain.exponentialRampToValueAtTime(0.42, t0 + 0.003);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);

      // Extra low click for phone speakers.
      const thump = ctx.createOscillator();
      thump.type = "sine";
      thump.frequency.setValueAtTime(160, t0);

      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0001, t0);
      thumpGain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.002);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);

      osc.connect(oscGain);
      oscGain.connect(master);

      harmonic.connect(harmonicGain);
      harmonicGain.connect(master);

      thump.connect(thumpGain);
      thumpGain.connect(master);

      noise.start(t0);
      noise.stop(t0 + duration);
      osc.start(t0);
      osc.stop(t0 + 0.075);
      harmonic.start(t0);
      harmonic.stop(t0 + 0.065);
      thump.start(t0);
      thump.stop(t0 + 0.055);
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(schedule).catch(() => {
        // Autoplay / AudioContext failures should never block drafting.
      });
      return;
    }

    schedule();
  } catch {
    // Autoplay / AudioContext failures should never block drafting.
  }
};

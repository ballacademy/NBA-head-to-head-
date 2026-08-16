/** Draft-clock tick (Web Audio — no asset file). Same sound every second. */
let sharedAudioContext: AudioContext | null = null;

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

/**
 * Soft mid-range tick — same on every countdown beat.
 * `secondsLeft` is kept for call-site compatibility and ignored.
 */
export const playDraftClockPing = (_secondsLeft?: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const t0 = ctx.currentTime;
    const duration = 0.055;
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / sampleCount;
      // Short noise burst with a fast decay — reads as a tick, not a beep.
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 32);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, t0);
    filter.Q.setValueAtTime(0.9, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);

    // Soft body under the noise so it isn’t thin/whiny.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, t0);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.055, t0 + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(t0);
    noise.stop(t0 + duration);
    osc.start(t0);
    osc.stop(t0 + 0.045);
  } catch {
    // Autoplay / AudioContext failures should never block drafting.
  }
};

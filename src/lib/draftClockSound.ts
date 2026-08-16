/** Short draft-clock ping (Web Audio — no asset file). */
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

export const playDraftClockPing = (secondsLeft: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Slightly higher / louder as the clock hits zero.
    const freq = 720 + (6 - Math.min(5, Math.max(1, secondsLeft))) * 70;
    const peak = 0.08 + (6 - Math.min(5, Math.max(1, secondsLeft))) * 0.018;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t0 + 0.09);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch {
    // Autoplay / AudioContext failures should never block drafting.
  }
};

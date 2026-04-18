"use client";

const STORAGE_KEY = "corvo_sound_effects";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  // Default ON if never set
  return stored === null ? true : stored === "true";
}

// Singleton AudioContext: reused across calls to avoid hitting the limit
let _ac: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ac) {
      _ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Chrome suspends AudioContext until a user gesture. Resume it silently.
    if (_ac.state === "suspended") {
      _ac.resume().catch(() => {});
    }
    return _ac;
  } catch {
    return null;
  }
}

// Call this on the first user interaction to unlock audio
export function unlockAudio(): void {
  getCtx();
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.12,
  delay = 0
): void {
  if (!isEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(gainVal, ac.currentTime + delay + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.01);
}

export function useSoundEffects() {
  /** Short sine click: for button presses */
  function click() {
    playTone(800, 0.03, "sine", 0.08);
  }

  /** Smooth whoosh: for tab switches */
  function whoosh() {
    if (!isEnabled()) return;
    const ac = getCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ac.currentTime);
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
    // Quick attack (10ms), then decay to 0 over 140ms
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.15);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.16);
  }

  /** Two-tone chime: for analysis completion */
  function success() {
    playTone(523, 0.09, "sine", 0.1, 0);
    playTone(659, 0.09, "sine", 0.1, 0.1);
  }

  /** Low tone: for errors */
  function error() {
    playTone(200, 0.1, "sine", 0.1);
  }

  return { click, whoosh, success, error };
}

export { STORAGE_KEY as SOUND_KEY };

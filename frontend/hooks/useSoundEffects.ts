"use client";

const STORAGE_KEY = "corvo_sound_effects";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Singleton AudioContext — reused across calls to avoid hitting the limit
let _ac: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ac) {
      _ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log("[sound] AudioContext created, state:", _ac.state);
    }
    // Chrome suspends AudioContext until a user gesture. Resume it silently.
    if (_ac.state === "suspended") {
      console.log("[sound] AudioContext suspended — resuming");
      _ac.resume().catch((e) => console.warn("[sound] resume failed:", e));
    }
    return _ac;
  } catch (e) {
    console.warn("[sound] AudioContext unavailable:", e);
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
  /** Short sine click — for button presses */
  function click() {
    console.log("[sound] playing sound: click", "enabled:", isEnabled());
    playTone(800, 0.03, "sine", 0.08);
  }

  /** Frequency sweep whoosh — for tab switches */
  function whoosh() {
    console.log("[sound] playing sound: whoosh", "enabled:", isEnabled());
    if (!isEnabled()) return;
    const ac = getCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
  }

  /** Two-tone chime — for analysis completion */
  function success() {
    console.log("[sound] playing sound: success", "enabled:", isEnabled());
    playTone(523, 0.09, "sine", 0.1, 0);
    playTone(659, 0.09, "sine", 0.1, 0.1);
  }

  /** Low tone — for errors */
  function error() {
    console.log("[sound] playing sound: error", "enabled:", isEnabled());
    playTone(200, 0.1, "sine", 0.1);
  }

  return { click, whoosh, success, error };
}

export { STORAGE_KEY as SOUND_KEY };

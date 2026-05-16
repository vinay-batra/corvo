const STORAGE_KEY = "corvo_recently_viewed";
const MAX_ENTRIES = 5;
const EVENT_NAME = "corvo:recently-viewed-changed";

export interface RecentlyViewedEntry {
  ticker: string;
  name?: string;
  viewedAt: number;
}

function safeRead(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e: any): e is RecentlyViewedEntry =>
        e && typeof e.ticker === "string" && typeof e.viewedAt === "number"
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function safeWrite(entries: RecentlyViewedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {}
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  return safeRead();
}

export function trackRecentlyViewed(ticker: string, name?: string) {
  if (!ticker) return;
  const upper = ticker.toUpperCase();
  const current = safeRead();
  const filtered = current.filter(e => e.ticker.toUpperCase() !== upper);
  const next: RecentlyViewedEntry[] = [
    { ticker: upper, name, viewedAt: Date.now() },
    ...filtered,
  ];
  safeWrite(next);
}

export function removeRecentlyViewed(ticker: string) {
  if (!ticker) return;
  const upper = ticker.toUpperCase();
  const next = safeRead().filter(e => e.ticker.toUpperCase() !== upper);
  safeWrite(next);
}

export function clearRecentlyViewed() {
  safeWrite([]);
}

export function subscribeRecentlyViewed(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => handler();
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) handler(); };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

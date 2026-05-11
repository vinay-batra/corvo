// Resolves CSS variable color values at runtime so we can pass them to
// libraries (like Plotly, html2canvas, jsPDF, three.js) that don't accept
// `var(--foo)` strings directly. Falls back to sensible defaults during SSR
// or before document is hydrated.

export type CorvoColorVar =
  | "--bg" | "--bg2" | "--bg3" | "--card-bg"
  | "--border" | "--border2"
  | "--text" | "--text2" | "--text3" | "--text-muted"
  | "--accent";

const FALLBACKS_DARK: Record<CorvoColorVar, string> = {
  "--bg": "#0a0e14",
  "--bg2": "#0d1117",
  "--bg3": "#111620",
  "--card-bg": "#111620",
  "--border": "rgba(232,224,204,0.10)",
  "--border2": "rgba(232,224,204,0.18)",
  "--text": "#e8e0cc",
  "--text2": "rgba(232,224,204,0.78)",
  "--text3": "rgba(232,224,204,0.55)",
  "--text-muted": "rgba(232,224,204,0.42)",
  "--accent": "#c9a84c",
};

const FALLBACKS_LIGHT: Record<CorvoColorVar, string> = {
  "--bg": "#fbfaf6",
  "--bg2": "#f5f1e6",
  "--bg3": "#ede7d5",
  "--card-bg": "#ffffff",
  "--border": "rgba(40,38,30,0.10)",
  "--border2": "rgba(40,38,30,0.18)",
  "--text": "#1a1a1a",
  "--text2": "rgba(26,26,26,0.78)",
  "--text3": "rgba(26,26,26,0.55)",
  "--text-muted": "rgba(26,26,26,0.42)",
  "--accent": "#8b6914",
};

export function currentTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export function cssVar(name: CorvoColorVar): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FALLBACKS_DARK[name];
  }
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (raw) return raw;
  } catch {
    // fall through
  }
  const fb = currentTheme() === "light" ? FALLBACKS_LIGHT : FALLBACKS_DARK;
  return fb[name];
}

// Plotly hoverlabel preset that respects the active theme.
export function plotlyHoverlabel(opts: { borderColor?: string; size?: number; family?: string } = {}) {
  return {
    bgcolor: cssVar("--bg2"),
    bordercolor: opts.borderColor ?? "rgba(201,168,76,0.4)",
    font: { color: cssVar("--text"), family: opts.family ?? "Inter", size: opts.size ?? 11 },
  };
}

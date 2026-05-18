// Demo portfolios for the "try without signing up" flow. Each preset is keyed
// by a stable slug used in URLs like /app?demo=bogleheads, so the demo banner
// + analytics can identify the demo without re-encoding the assets.
//
// The encoded ?portfolio=<base64> URL pattern (for arbitrary user-shared
// portfolios) is unchanged; ?demo=<slug> is the cleaner-URL way to load one
// of the 3 curated preset demos from the homepage cards. The dashboard
// (app/app/page.tsx) handles either form.

export type DemoAsset = { ticker: string; weight: number };

export interface DemoPortfolio {
  slug: string;
  name: string;
  /** One-line description shown on the homepage card. */
  tagline: string;
  /** Investor archetype shown as a small chip on the card. */
  archetype: string;
  assets: DemoAsset[];
}

export const DEMO_PORTFOLIOS: DemoPortfolio[] = [
  {
    slug: "bogleheads",
    name: "Bogleheads 3-Fund",
    tagline: "Classic passive index portfolio with US + international + bonds.",
    archetype: "Passive Index Investor",
    assets: [
      { ticker: "VTI",  weight: 0.60 },
      { ticker: "VXUS", weight: 0.20 },
      { ticker: "BND",  weight: 0.20 },
    ],
  },
  {
    slug: "nvda-growth",
    name: "NVDA-Concentrated Growth",
    tagline: "Megacap tech with an NVDA overweight, classic AI-bull stack.",
    archetype: "Growth / AI Bull",
    assets: [
      { ticker: "NVDA",  weight: 0.30 },
      { ticker: "MSFT",  weight: 0.20 },
      { ticker: "AAPL",  weight: 0.15 },
      { ticker: "GOOGL", weight: 0.15 },
      { ticker: "AMZN",  weight: 0.10 },
      { ticker: "META",  weight: 0.10 },
    ],
  },
  {
    slug: "dividend-income",
    name: "Dividend Income",
    tagline: "High-yield ETFs and dividend aristocrats for income generation.",
    archetype: "Income Investor",
    assets: [
      { ticker: "VYM",  weight: 0.30 },
      { ticker: "SCHD", weight: 0.25 },
      { ticker: "JNJ",  weight: 0.15 },
      { ticker: "KO",   weight: 0.15 },
      { ticker: "PG",   weight: 0.15 },
    ],
  },
];

const DEMO_MAP: Record<string, DemoPortfolio> = Object.fromEntries(
  DEMO_PORTFOLIOS.map(p => [p.slug, p]),
);

export function getDemoPortfolio(slug: string | null | undefined): DemoPortfolio | null {
  if (!slug) return null;
  return DEMO_MAP[slug] ?? null;
}

/**
 * Build the public-facing URL for a demo portfolio. The dashboard route reads
 * the `demo` query param and auto-loads + auto-analyzes the matching preset.
 *
 * `origin` is optional - omit to produce a relative URL (works inside a
 * Next.js `<Link>` without a full URL).
 */
export function demoPortfolioHref(slug: string, origin = ""): string {
  return `${origin}/app?demo=${encodeURIComponent(slug)}`;
}

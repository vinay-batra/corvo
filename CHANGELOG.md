# Changelog

All notable changes to Corvo are documented here.

---

## v0.20 — April 27, 2026

### Added
- **AI chat overhaul:** web search enabled (`web_search` tool on `claude-sonnet-4-6`), streaming responses, available on every page, context-aware portfolio data injected, confident advisor tone enforced
- **Monte Carlo overhaul:** 1-30 year horizon selector, exactly 8,500 simulation paths, monthly GBM steps, advanced settings panel (contributions, inflation, fees, tax drag), histogram distribution view, confidence intervals — state persists across tab switches and theme changes
- **Rebalance Assistant:** drift table showing current vs. target allocation, AI-generated rebalance plan, goal-aware advice, "Continue in AI chat" button
- **Options Chain Viewer:** calls and puts table with delta (Black-Scholes), IV, volume, open interest, ITM highlighting, per-column plain-English tooltips, Max Pain section
- **Transaction Log:** buy/sell trade logging, cost basis tracking, realized P&L calculation, sortable table
- **Health Score upgrade:** daily caching (`health_score_cache` table), advisor-style headline, specific action items referencing real portfolio tickers
- **"What should I do today?" upgrade:** goal-aware advice, never recommends based on single-day moves, "Continue in AI chat" button
- **Email system rebuilt:** Morning Briefing, Week in Review, Monthly Summary, Price Alerts -- all with opt-in toggles in Settings, email theme (light/dark), clean subject lines, teaser format with CTA back to app
- **Auto-load saved portfolio on mount:** returning users see their portfolio immediately, never an empty state
- **Leaderboard fix:** shows all users, RLS policy corrected, "Corvo User" fallback for unnamed users
- **InfoTooltip expansion:** every financial metric, stat, and column header now has a plain-English explanation
- **Morning briefing expand/collapse:** "Expand/Collapse" button replaces bare chevron
- **Price alert editing:** inline edit form with condition and threshold, save and delete
- **Onboarding header:** Corvo logo links to `/app`, user menu in top right

### Fixed
- **Scrolling fixed globally:** `overscroll-behavior: none` set on `html`, `body`, and all major layout containers; passive scroll listeners; no reanimation on elastic scroll
- **Supabase SSR auth:** `middleware.ts` added at repo root, singleton client enforced via `lib/supabase.ts`, inline `createClient` calls removed

---

## v0.19 — April 26, 2026

### Fixed
- **Critical auth bug:** missing `middleware.ts` caused expired JWTs on all SSR requests, silently logging users out
- **Supabase singleton:** `app/page.tsx` was instantiating a second Supabase client without `cookieOptions`, causing sessions to expire on browser close; all client creation now goes through `lib/supabase.ts`
- **Morning briefing price accuracy:** now uses exact live prices from yfinance, never inferred or approximated
- **Onboarding double-render glitch:** step transitions no longer flash or re-mount components

### Added
- **Portfolio performance pill** in dashboard ticker scroll
- **Onboarding header:** Corvo logo (links to `/app`) and user menu with My Account, Referrals, Go To App, Settings, and Logout

---

## v0.18 — April 25, 2026

### Added
- Briefing collapse shows first-sentence preview instead of fully hiding content
- Ticker chips expanded to show price, dollar change, and percent change
- Referral links generated client-side using `/signup` path with full user ID

### Fixed
- Supabase SSR middleware added; inline client creation removed
- Rules compliance audit: dark mode variables, logic safety, icon cleanup

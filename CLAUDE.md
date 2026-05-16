# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Current Focus
<!-- UPDATE THIS at the end of every session so the next one knows where to pick up -->

**Last shipped: v0.37 (May 16, 2026) - tabbed sidebar polish + close v0.34 audit follow-ups. Frontend only.**

v0.37 cleans up everything left over from v0.36 (tabbed sidebar) and closes the deferred audit items from v0.34. Five tightenings. (1) The Holdings sticky header was overlapping the v0.36 sticky tab nav - both lived at `top: 0` of the now-shared scroll container, and the Holdings header sat on top because its zIndex was higher. Fix: Holdings sticky header pinned to `top: 44px` (below the tab nav height) with zIndex 14 (below the tab nav's 15) so it stacks correctly. (2) Saving a brand-new portfolio whose ticker set matched the active assets used to leave savedPortfolioId stuck on null until the next page reload (auto-detect effect's deps were `[assets, userId]` - neither changed on save). Now a new `savedPortfolioRefreshTick` state bumps on every `corvo:portfolio-saved` window event, and the auto-detect deps include it - so a save instantly triggers re-detection and perfHistory starts ratcheting from the new portfolio's snapshots. (3) Account tab gains a small dashed-border hint under the Portfolio Value card: "Save this portfolio in the Saved tab to track day-over-day." Only renders when `!isSaved && assets.length > 0`. Explains the gap between the input seed and the live value for users who haven't saved yet. (4) Saved chip cards get a relative "Analyzed N days ago / today / yesterday / Xw ago" timestamp pulled from `updated_at`. (5) Saved chip cards now highlight the active portfolio (the one whose ticker set matches the current assets) with a gold left border, gold-tinted background, soft glow, and a green ACTIVE badge - so users always know which saved portfolio they're viewing.

v0.36 implements the tabbed sidebar redesign user picked from a 6-option brainstorm (between Mock C "tabbed sidebar" and Mock D "bottom config strip"). Three sidebar tabs now: HOLDINGS (the asset rows + add/equalize + sticky weight status), ACCOUNT (Portfolio Value card + 8-card Account Type grid + Reinvest toggle), SAVED (the SavedPortfolios chip cards). Each gets the sidebar's full width without competing with the other two. Tab nav is sticky at the top of the sidebar's scroll region so it stays visible while users scroll through long lists. PortfolioBuilder gained a new `view: "holdings" | "account"` prop so a single component instance still owns the state but only renders the active tab's section. Account type selector swapped from a native `<select>` with optgroups to a 2x4 grid of selectable cards (uses the new `chip` field in `lib/accountType.ts` for tight chip-friendly summaries like "Tax-free + match", "Kiddie tax applies") - all 8 options + their tax framing visible at once instead of hidden behind a click. The big change per user feedback: removed `flex: 1` from the tab content wrapper so the Analyze button flows immediately below the content with no awkward dead space above it; outer sidebar wrapper's overflow flipped from `hidden` to `overflow-y: auto` so the whole sidebar scrolls when content exceeds viewport (instead of the previous flex-fill-with-inner-scroll pattern). Edit-with-Corvo kept at its current location above the tabs (it's a global tool that should be reachable from any tab); could move into Holdings later if you want it more contextual.

v0.35 is a hotfix on top of v0.34. Two issues. (1) After clicking any saved portfolio in the sidebar SavedPortfolios component, the live value at the top of the dashboard ($XX,XXX +$Y · +Z%) stayed pinned to the FIRST portfolio loaded - same delta dollar + same delta pct regardless of which portfolio was actually selected. Root cause: `SavedPortfolios.onLoad` signature was `(assets, accountType)` so when the user clicked a portfolio, the dashboard's onLoad handler set assets + accountType but NEVER set `savedPortfolioId`. The async auto-detect useEffect on `[assets, userId]` (line ~1820 in app/app/page.tsx) was supposed to pick this up but the async Supabase fetch raced against the GreetingBar polling and frequently lost - so perfHistory stayed empty, liveBaseValue fell back to portfolioInputValue, and the displayed live value was `seed * (1 + todayPct)` for every portfolio using the same seed. Fix: widened `SavedPortfolios.onLoad` to `(assets, accountType, portfolioId, portfolioName)` so the dashboard sets savedPortfolioId synchronously on click → perfHistory effect fires → liveBaseValue recomputes against the new portfolio's snapshots. (2) GreetingBar's holdingPrices polling had a stale-fetch race: if user clicked portfolio A then B before A's `/watchlist-data` fetch resolved, A's response could land AFTER B's and overwrite holdingPrices with A's data, pinning portfolioToday to A's pct movements. Fixed with AbortController + cancel flag + clearing holdingPrices on assets change. (3) Removed PortfolioSwitcher entirely per user feedback - the sidebar SavedPortfolios component is the single source of truth for portfolio switching going forward.

v0.34 closes the four real follow-ups left from v0.32 / v0.33 in a single push. (1) Day-over-day persistence: the portfolio value display used to reset to the user's input seed every market open and rebuild today's pct from there - so Monday +1% to $5,100 would re-show as $5,000 on Tuesday and rebuild from scratch. Now uses the latest `portfolio_snapshots` row STRICTLY BEFORE today as the implicit base, so the live value ratchets day-over-day like Fidelity (Monday close $5,100 -> Tuesday morning $5,100 + Tuesday's pct movement). New `liveBaseValue` useMemo in `app/app/page.tsx` walks perfHistory newest-first, picks the first snapshot with date < today, falls back to the user's input seed when no snapshots exist (new portfolio, unsaved, cron hasn't run yet). Threaded into GreetingBar (as `portfolioValue`) and into PortfolioBuilder (as new `liveBaseValue` prop). PortfolioBuilder now distinguishes `portfolioSeedNum` (the localStorage user input, edited via the sidebar field when focused) from `effectiveBaseNum` (the snapshot-derived ratcheting base), and the live display + delta annotation both use the effective base. The "base $X" annotation in the delta line now shows the EOD-snapshot value, not the seed, so the math reads as "live = base x (1 + today's pct)" with both numbers traceable. (2) Per-account portfolio switcher: new `frontend/components/PortfolioSwitcher.tsx` renders an inline chip row above the tab content showing the user's saved portfolios with their account-type badges (BROKERAGE / ROTH IRA / HSA / 529 / etc). Click a chip to load that portfolio + its account type. Active portfolio chip is highlighted with a gold border + soft glow. Self-hides when the user has 0 or 1 portfolios; skipped on the Learn tab. Lives above the tab AnimatePresence so it persists across tab switches - flipping from Brokerage to Roth IRA while on the Positions tab now works inline without going back to overview. (3) 401(k) prompt tightening: the Roth/Traditional 401(k) rule blocks in `_ACCOUNT_TYPE_RULES` gained an explicit "MUST name the wrapper in the rationale at least once and frame around tax-free compounding / RMD planning / employer match" instruction - the v0.32 A/B test showed these two variants were softer than the other six because Claude defaulted to generic concentration framing. (4) health_score_cache schema migration: new `20260516010000_health_score_cache_account_type.sql` adds `account_type text not null default ''` to the cache table, drops the old `(user_id, date, tickers_hash)` unique constraint and adds `(user_id, date, tickers_hash, account_type)` instead so the same portfolio in two account types gets two cached responses. Backend `_hs_load_from_supabase` + `_hs_save_to_supabase` widened to take account_type, and the v0.32 bypass-when-account_type-is-set logic is gone - we trust the cache again.

v0.33 closes the feedback loop on v0.32. The account-type dropdown shipped yesterday lived in the sidebar but never confirmed itself anywhere in the workspace - users could pick "Roth IRA" and have no visual proof the AI was reasoning in Roth-mode. Two fixes. (1) PortfolioBuilder's bottom block (Portfolio Value + Account Type + Reinvest Dividends) is now grouped under a single gold "ACCOUNT" eyebrow header so it reads parallel to HOLDINGS / SAVED in the sidebar. PORTFOLIO VALUE got demoted from gold sub-eyebrow to a regular cream label since two stacked gold eyebrows in 80px of vertical space was visually noisy; helper copy ("Used for P&L, tax loss harvesting, and dividend calculations") moved up to sit as a sub-label under the new "Portfolio value" label so it's contextual to the field, not a footnote. (2) GreetingBar gains a small gold "ROTH IRA" / "TRAD IRA" / "529" / etc pill that sits inline next to the live portfolio value, always visible, with the full label + tagline on hover via the title attribute. Uses each account type's `short` string from `frontend/lib/accountType.ts`. Renders even when portfolio value is 0 (via a fallback render path outside the gb-live-value conditional) so the account context is visible from the very first session before any value is set. Threaded as `accountType={accountType}` from `app/app/page.tsx` (already in state from v0.32). No backend changes, no migration, frontend deploy only.

v0.32 ships two product additions. (1) The Stocks tab now renders a "Recently Viewed" chip row above the Live Market grid, populated automatically when StockDetail mounts. 5-MRU stored in `corvo_recently_viewed` localStorage (new `frontend/lib/recentlyViewed.ts` helper exposes `getRecentlyViewed` / `trackRecentlyViewed` / `removeRecentlyViewed` / `subscribeRecentlyViewed`, the last for cross-tab sync via a `corvo:recently-viewed-changed` custom event). Each chip is ticker + truncated company name + a per-chip remove X; section hides entirely when the list is empty so it's never an awkward placeholder. StockDetail hooks twice on ticker change: once immediately (ticker only, so a fast nav-away still persists), once after `info` loads (with the company name) - the helper de-dupes by ticker so it ends up as a single MRU entry with the name attached. (2) `portfolios` table gains an `account_type text default 'taxable_brokerage'` column with a CHECK constraint over 8 supported values (taxable_brokerage, roth_ira, traditional_ira, roth_401k, traditional_401k, hsa, 529, custodial). New `frontend/lib/accountType.ts` carries the canonical metadata (id / label / short / group / tagline). PortfolioBuilder gets a grouped `<select>` (Taxable / Retirement / Health / Education optgroups) under Reinvest dividends - only renders when a change handler is passed, so the onboarding callsite that doesn't care is unaffected. State lives in `app/app/page.tsx` under `accountType` + `setAccountType`, persisted to `corvo_account_type` localStorage, and threaded through every fetch site (handleAnalyze, the auto-load result, handleWhatShouldIDo, SavedPortfolios.onLoad now passes back both assets and accountType, AiChat puts it on `portfolio_context`, HealthScore puts it on the body). SavedPortfolios chip cards show a small gold "ROTH IRA" / "HSA" / etc badge when the saved portfolio isn't the default brokerage. Backend mirrors the same wiring: `_ACCOUNT_TYPE_RULES` dict + `_account_type_block(id)` helper injects a 3-5 line tax-context paragraph into all 4 AI prompts (`/chat` system prompt via portfolio_context, `/portfolio/health-score` system prompt, `/what-should-i-do` after the existing investor_rules block, `/portfolio/daily-signal` after the PRIMARY ISSUES block). Caches partition by account_type: `_hs_cache_key` gains an `account_type` arg, daily-signal cache key gains an `at_key` segment. Health-score Supabase cache is bypassed entirely when account_type is set (the persisted rows pre-date the column) - acceptable until the cache schema is migrated. `/portfolio` GET echoes `account_type` back on the response. The 8 rule blocks are opinionated: Roth/Trad IRA, Roth/Trad 401k, HSA, 529 all forbid TLH and capital-gains discussion outright; taxable + custodial keep them with custodial flagging kiddie-tax. Migration file `supabase/migrations/20260516000000_portfolios_account_type.sql` is idempotent (add column if not exists + guarded check constraint + `notify pgrst, 'reload schema'`).

**Bundled v0.31 cache-bust (was staged on 2026-05-12, not yet pushed)**: `?v=2` on every favicon + logo + OG ref + manifest icon + JSON-LD logo across 19 files (42 total stamps), plus `hooks/usePushNotifications.ts` pointing the push-notification icon at `/corvo-logo.png?v=2` instead of the deleted `.svg`. See the v0.31 section below for the full breakdown.

Long session continued past sundown. Net dashboard top-of-fold: GreetingBar (with brief preview when collapsed, privacy toggle on the live $ value, also mirrored in the sidebar Portfolio Value via a custom event) → WSID action card → ANALYSIS region (metrics + performance chart) → INTELLIGENCE region (Health Score + Retirement + vs Benchmark). Retirement / GoalTracker moved out of its own block into the Intelligence grid where AI Insights used to live - AI Insights was removed (duplicated the WSID card framing). DailySignal component + `/daily-signal` route are still in the repo but not rendered / not called - the v0.30 attempt to consolidate around DailySignal was rolled back. Logo went through three iterations: dark-tile (rejected), thickened (rejected), settled on the original thin transparent strokes; all raster assets (favicons, apple-touch, icon-{192,512}, corvo-pfp, og-image) regenerated from the single source design. Floating chat button (both authenticated dashboard + every public page) swapped from "AI" wordmark to the Corvo logo with theme-inverse fill (gold bg + black silhouette in light, dark bg + gold logo in dark). "Edit with AI" → "Edit with Corvo". Reinvest dividends Yes/No pill → iOS-style toggle switch. Math bugs fixed: PerformanceChart dollar mode anchors the right edge at portfolioValue (was treating it as start-of-period and inflating to $62k from a $50k input), GoalTracker projection CAGR clamped to a 4-10% long-horizon band (was compounding the user's 1Y CAGR for 20 years and projecting fantasy), GoalTracker layout trimmed 3 → 2 stat columns, GoalTracker chrome now matches the shared Card spec with hover lift + soft trackColor glow. Customize FAB now hides whenever any full-screen overlay (Settings / Profile / Alerts / etc.) is open. Portfolio screenshot import was 401-ing for everyone - endpoint is JWT-protected and the frontend caller wasn't sending the Bearer token; fixed + prompt sharpened to handle mutual funds + money markets, `image/jpg` MIME normalized to canonical `image/jpeg`. Backend: `eod_portfolio_snapshot_loop` runs daily at 4:15 PM ET; `/watchlist-data` rate limit bumped 30 → 600/hr; new admin `GET /admin/real-stats` returns the truth behind the floored homepage `/stats`. AiChat: "Always watching" eyebrow dropped, message avatar 20 → 28 px, "Get Actions" button finally clickable, response parser pairs short headline blocks with their long explanation blocks, `SUGGESTION_SETS` index-out-of-bounds crash fixed. PublicNav scroll hide/show belt-and-suspenders (rAF + scroll-event listener). Hero-landing fix: navigating to `/#features` from another page now lands at hero, not jumps to bento. First `/admin/real-stats` snapshot returned 9 profiles / 4 saved portfolios / 55 chat_usage rows.

**Backend deploy on Railway: ONLINE** (three manual `railway up` runs on 2026-05-12 - `eod_portfolio_snapshot_loop`, `GET /admin/real-stats`, `GET /admin/test-eod-snapshot`, `/watchlist-data` 600/hr rate limit, the sharpened image-parse prompt, all live on the running instance).

**v0.31 cache-bust (staged, awaiting frontend deploy)**: appended `?v=2` to every static asset URL (`/corvo-logo.png`, `/favicon-{16x16,32x32}.png`, `/icon-{192,512}.png`, `/apple-touch-icon.png`, `/og-image.png`) across 19 files via a targeted `sed` pass with a `[^?]` guard to prevent double-busting on re-runs. 42 stamps total. Reason: returning users on normal reload were still seeing the pre-v0.30 logo because Chrome's HTTP cache + its separate `Favicons` SQLite cache both serve the stale asset when the URL is unchanged. Hard refresh (Cmd+Shift+R) was the only escape, which most users never do. With `?v=2` the URL is genuinely different so the browser treats it as a new resource. Bonus fix: `hooks/usePushNotifications.ts:33` had `icon: "/corvo-logo.svg"` but that file was deleted in v0.29 - push-notification icons had been silently invisible for ~24 hours. Repointed at `/corvo-logo.png?v=2`. To bust again on the next logo swap: bump `?v=2` → `?v=3` via one find/replace across the codebase.

### Open items / next session

1. **Surface "save to track day-over-day" hint on unsaved portfolios**: day-over-day persistence in v0.34 only works for saved portfolios (the EOD snapshot cron is keyed by portfolio_id). Unsaved portfolios fall back to the seed-based display. Worth adding a small inline prompt under the portfolio value that says "Save this portfolio to track day-over-day" when assets exist but no saved match.
2. **A/B verify 401(k) prompt tightening**: v0.34 added "MUST name the wrapper" instruction to both 401(k) rule blocks. Re-run the 8-account A/B test (curl `/portfolio/daily-signal` with each account_type) to confirm the Roth/Trad 401(k) rationales now lean into tax framing as hard as Roth IRA / HSA do.
3. **Onboarding flow doesn't surface account type yet** (intentional carry-over): PortfolioBuilder props are optional so onboarding renders without the selector. If we want to capture account type during onboarding later, thread the state through that page.
4. **Cross-account aggregate view** (bigger): users with 4 accounts (Brokerage + Roth + 401k + UTMA) may want a single "all accounts" view showing total net worth across all of them with tax-bucket-aware breakdowns. The v0.34 portfolio switcher is the foundation; aggregate would be the layer on top.

### Premium polish queue - pick up here next session

Likely next moves: demo video, YC application (Founder Profile is open and needs Education/Work history + accomplishments), product direction brainstorm (cut News/Watchlist/Learn, build daily morning brief, action CTAs on insights), Plaid sandbox build, PDF reports. Day-over-day backend cron shipped; visible UI carry-forward still pending.

### Blocked / non-design work

1. **Stripe/Pro tier ($9/mo)** - needs parent (Vinay is under 18; TOS requires 18+ to sign for Stripe)
2. **Plaid integration** - auto-sync brokerage. Needs parent to sign for Plaid + production-access approval (weeks). Can build against sandbox in the meantime.

### Logo asset reference (updated end-of-day v0.30)

All raster logo assets now flow from a single source: `~/Downloads/ChatGPT Image May 11, 2026, 07_00_13 PM.png`. Two failed experiments earlier in the day made me lose track of the design once; the final pipeline produces a consistent shape across every surface. Pipelines kept in `/tmp/corvo_all_assets_from_source.py` (everything raster) and `/tmp/corvo_og_patch.py` (OG card raven swap that preserves the bespoke text layout).

- **Master**: `frontend/public/corvo-logo.png` (717×717 **transparent** PNG, gold raven head + rising arrow, **original source stroke weights, no dilation**). Used by 26+ inline `<img src="/corvo-logo.png">` callsites - those are the in-app contexts where the master needs to sit on whatever the page bg is. Don't dilate the strokes; user has rejected that twice.
- **Transparent size variants**: `corvo-logo-{48,180,192,512}.png`. Currently not directly referenced anywhere in JSX but tracked so they don't drift.
- **Browser-chrome favicons** (these are the only logo files with a **dark navy fill** behind the bird): `favicon-16x16.png`, `favicon-32x32.png`, `favicon.ico` (multi-res 16/32/48), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`. Sourced from the transparent master, 88-98% canvas fill, BG `#0a0e18`. **Never reuse these in-app** - they're opaque tiles meant for Chrome / iOS / PWA contexts where transparent gold disappears against light chrome.
- **Marketing**: `og-image.png` (1200×630, has bespoke text layout - CORVO wordmark + hairline divider + tagline + features row + URL footer + corner brackets), `corvo-pfp.png` (400×400 on dark fill).
- **Failed experiments (2026-05-12)**:
  - Making the master a dark-tile version (gold on opaque #0a0e18 square) so it'd "match the reference image everywhere". User rejected - turned every inline logo into a small dark badge against light page backgrounds.
  - 6px alpha-dilating the strokes via `PIL.ImageFilter.MaxFilter` to make them more visible at small nav sizes. User rejected as "the bad logo" - the dilation killed the elegant silhouette and made the raven feel chunky. Reverted to source thin strokes; favicons retained mild dilation because at 16px the natural thin strokes disappear.
- **Logo placement bumps shipped end-of-day**: PublicNav 30 → 38 px with gold drop-shadow. Dashboard sidebar 26 → 34 px at full opacity. AiChat message avatar 20 → 28 px with `boxShadow: 0 0 6px rgba(201,168,76,0.18)` and inner ratio 0.58 → 0.72. AiChat empty-state container 32×26 squished → 42×42 square. Footer.tsx + PublicFooter.tsx gain 64 / 88 px watermark logos centered beneath their content rows.

### Live portfolio value pattern

- `GreetingBar` polls holding prices every 60s, computes `portfolioToday.pct` (weighted % change)
- New prop `onTodayPctChange?: (pct: number | null) => void` bubbles the value up
- `app/app/page.tsx` holds `todayPct` state, sets via the callback, passes to `PortfolioBuilder` as a `todayPct` prop
- Display formula: `liveValue = base x (1 + todayPct / 100)`
- Sidebar `PortfolioBuilder` shows live value when unfocused; on focus snaps to base + auto-selects; on change saves user input as new base. Annotation line below shows `+$X · +Y% today · base $Z`
- Same live value shown in GreetingBar header next to the greeting, visible even when brief is collapsed
- **Session-scoped only**: `todayPct` resets to null every page load and recomputes from today's open. Live value is always `base × (1 + today's pct)` where `base` is the persisted portfolio value. At tomorrow's market open, today's pct rolls to 0 and the live value snaps back to `base`. True day-over-day tracking (yesterday's close becomes today's implicit base, etc.) needs a backend writer that snapshots end-of-day portfolio value into the `portfolio_snapshots` table on a cron, then a frontend consumer that reads "yesterday's snapshot" as the new base. v0.29 schema fix added the table columns but neither writer nor consumer are wired up. Queued item.

### Daily Signal (built May 10) - reference

- POST /portfolio/daily-signal backend endpoint with Claude, in-memory cache by (date, portfolio hash)
- 8 categories: Risk Alert, Rebalance, Tax Opportunity, Earnings Watch, Benchmark Lag, Protect Gains, Diversify, Strong Hold
- Full DailySignal.tsx component: headline, rationale, impact chips, numbered steps, confidence tooltip, urgency badge, dismissed state
- Lives between Daily Brief and WSID on dashboard. Fails silently on error.

### Bottom-right buttons (layout reference)

Three-button stack, right-aligned, fixed to bottom. AI is the primary action and is bigger than the other two.

Desktop:
- AI (gold gradient): 60×60, bottom 24, right 24 - always rendered (PublicAIChat on public pages, dashboard AI on `/app`)
- Feedback (flag): 44×44, bottom 32, right 96 - global, every page
- Customize (grid): 44×44, bottom 32, right 152 - dashboard `overview` tab only

Mobile (≤768px):
- AI: 56×56, bottom 24, right 24
- Feedback: 40×40, bottom 30, right 88
- Customize: 40×40, bottom 30, right 138

Centers of the secondary buttons align with the center of the AI button. Hover on AI: 4-stage gold drop shadow + 1.04 scale + 2px y-lift. Hover on Feedback/Customize: gold border + gold-tint background + gold icon + 4px gold ring shadow + 1px y-lift.

---

## PRODUCT PHILOSOPHY

**Corvo is an advisor, not a tool.**

The difference: tools show data. Advisors tell you what it means and what to do.

- WRONG: "Your Sharpe ratio is 2.88"
- RIGHT: "Your Sharpe ratio is 2.88, which is exceptional. You are getting strong returns without taking on much risk. Your main risk right now is NVDA concentration. If AI sentiment shifts, you could see a 15%+ drawdown. Consider trimming to 15% and rotating into something uncorrelated like BND."

Every AI output in Corvo must follow this pattern:
1. Here is what is happening
2. Here is why it matters for YOUR portfolio specifically
3. Here is what you should consider doing

Never show a number without explaining what it means. Never explain what something means without suggesting an action. Be specific, be direct, be personal.

---

## Development Commands

### Frontend (Next.js on Vercel)
```bash
cd frontend
npm run dev # start dev server at localhost:3000
npm run build # production build (also runs type check)
npm run lint # ESLint
```

### Backend (FastAPI on Railway)
```bash
cd backend
uvicorn main:app --reload --port 8000 # local dev with hot reload
```

Backend env vars must be in `backend/.env`. Frontend env vars in `frontend/.env.local`. See `frontend/.env.local.example` and `backend/.env.example` for required keys.

### Supabase migrations
Migrations live in `supabase/migrations/`. Apply them manually in the Supabase dashboard SQL editor or via `supabase db push` (CLI must be installed and project linked).

---

## Architecture

### Repository layout
```
portfolio_v2/
 frontend/ Next.js app (Vercel)
 app/app/page.tsx main authenticated dashboard - all state lives here
 app/page.tsx public homepage - has its own inline nav
 components/ all reusable components
 lib/
 supabase.ts browser Supabase singleton (always import from here)
 api.ts typed fetch helpers for every backend route
 middleware.ts SSR session refresh - must never be deleted
 backend/
 main.py entire FastAPI backend (~4500 lines, single file)
 supabase/
 migrations/ SQL files applied manually to the Supabase project
```

### Main app data flow

`app/app/page.tsx` owns all global state:
- `assets`: array of `{ticker, weight, costBasis?, manualReturn?}` - the user's portfolio
- `data`: the full portfolio analysis result from `GET /portfolio` - passed as props to every analysis component
- `activeTab`: which of the eight tabs is visible
- Analysis is triggered by `handleAnalyze()`, which calls `fetchPortfolio()` from `lib/api.ts`

The `TABS` constant defines the tab bar. Adding a new tab requires:
1. Adding an entry to `TABS`
2. Adding a conditional render in the tab content section (search for `activeTab === "overview"` to see the pattern)

### Backend structure

`backend/main.py` is a single file. Top-to-bottom layout:
1. Imports, env vars, startup prints, rate limiter
2. FastAPI lifespan - starts 5 background asyncio tasks on startup: `price_alert_loop`, `morning_brief_loop`, `morning_briefing_email_loop`, `week_in_review_loop`, `monthly_summary_loop`
3. CORS middleware
4. All route handlers with inline helper functions
5. Background task implementations (bottom third of the file)

Key routes already implemented:
- `GET /portfolio` - main analysis: Sharpe, CAGR, VaR, correlation, sector, etc.
- `GET /options/{ticker}?date=` - options chain via yfinance, 15-min cache (already fully built)
- `GET /stock/{ticker}` - fundamentals + analyst ratings via yfinance
- `GET /news?tickers=` - news with Finnhub as fallback
- `POST /chat` - Claude-powered AI chat with rate limiting and usage tracking
- `GET /market-brief` - cached AI market summary (5-min TTL)
- `GET /earnings-calendar`, `GET /events-calendar` - calendar data

### External services and env vars

| Var | Service | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API | AI chat, insights, quiz questions, briefing summaries |
| `FINNHUB_API_KEY` | Finnhub | News fallback, live quotes in morning briefing emails |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase | User records, portfolios, alerts, email prefs (backend service role) |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Frontend client (anon key, RLS-protected) |
| `RESEND_API_KEY` | Resend | Transactional email (welcome, briefing, weekly digest) |
| `VAPID_PRIVATE_KEY` + `VAPID_PUBLIC_KEY` | Web Push | Push notifications |

### Authentication pattern

- Frontend: `lib/supabase.ts` exports a singleton browser client. Always import from here - never call `createClient` inline.
- `middleware.ts` calls `supabase.auth.getUser()` on every request to refresh expired JWTs. Without it, SSR pages receive stale sessions.
- Backend: some routes accept an optional `user_id` query param. They verify it by calling `supabase.auth.admin.getUser(token)` via the service role key, falling back to unauthenticated behavior when not provided.

### StockDetail tab system

`StockDetail.tsx` has its own internal tab switcher between "Overview" and "Insider Activity". The Options Chain tab was removed in v0.24 - do not re-add it.

---

## Critical Rules - Never Break These

- `initial={false}` on ALL `motion.*` components EXCEPT those using `whileInView`. For whileInView reveals: use the IntersectionObserver-based `ScrollReveal` helper in `app/page.tsx`, OR set an explicit inverse `initial={{ opacity: 0, y: 30 }}` state. NEVER pair `initial={false}` with `whileInView` (reveal becomes a no-op).
- No emojis anywhere in the app
- No em dashes anywhere in project source (`.ts`, `.tsx`, `.py`, `.css`, `.md`, `.sql`, `.html`) - not in code, not in AI responses, not in copy. EXCEPTION: vendored plugin / skill docs under `.agents/skills/*` are upstream metadata, not project source - leave their em dashes alone.
- No asterisks in AI responses
- Space Mono font for all numbers and monospace text
- All colors use CSS variables only - never hardcode dark colors
- SVG icons only - no emoji icons
- Always add "Commit and push." to the end of every Claude Code prompt
- Vinay uses Claude Code inside VS Code, not standalone terminal
- Supabase client must always be imported from `lib/supabase.ts` singleton, never instantiated inline - inline clients omit `cookieOptions` and cause sessions to expire on browser close
- `middleware.ts` must exist at the frontend repo root and call `supabase.auth.getUser()` on every request - without it, SSR pages receive expired JWTs and users get silently logged out
- Monte Carlo simulations always run exactly 8,500 paths - never 5,000 or any other number
- `overscroll-behavior: none` must be set globally in `globals.css` on `html`, `body`, and all major layout containers - never remove this
- AI chat endpoint (`POST /chat`) uses `claude-sonnet-4-6` with `web_search` tool enabled and streaming responses
- Never use `animate={{ opacity: 0 }}` or `animate={{ y: X }}` together with `whileInView` - use inline CSS `opacity: 0` and `transform` for the initial hidden state instead; combining both causes the animation to fire immediately and skip the scroll trigger
- `market_close_summary` column exists in the `email_preferences` Supabase table - do not re-add it in migrations
- Both feedback and AI chat buttons render from `app/layout.tsx` globally - do not add them to individual pages or they will appear twice
- Market hours countdown always shows time until next open or close - "After Hours", "Closed", and weekend states must include a live countdown, not a static label
- GSAP is installed (`gsap` package) - ScrollTrigger and SplitText are available; use them for landing page and public page animations
- `ParticleCanvas` is a Canvas2D component (NOT Three.js) wrapped by `ConditionalParticleCanvas` mounted globally from `app/layout.tsx`. It hides on `/app/*` and `/learn/*`. `position: fixed`, `z-index: 0`, `pointer-events: none`. Do not re-implement or move into `app/page.tsx`.
- Income & Tax and Transactions are sections inside the Positions tab - not standalone tabs
- Paper Trade is removed from the app entirely (removed from Learn tab in v0.24) - do not re-add it
- Options Chain is removed from StockDetail entirely (removed in v0.24) - StockDetail has Overview + Insider Activity tabs only
- Period and Benchmark selectors are only in chart controls - not in sidebar
- **Logo path is `/corvo-logo.png?v=2`** (PNG, transparent background, 717x717 master). 27 inline `<img>` callsites across 19 files depend on this path (26 logo refs + 1 push-notification icon ref in `hooks/usePushNotifications.ts`). Favicons + manifest + OG images all carry the same `?v=2` suffix. Never rename the master file. If swapping the design, replace the file in place + regenerate favicon variants via the PIL pipeline (see scripts in commit `349696a`), THEN bump the cache-bust suffix everywhere (`?v=2` → `?v=3`) via one find/replace - Chrome's HTTP cache + separate favicon SQLite DB will otherwise serve the old asset on normal reloads (only `Cmd+Shift+R` busts them, which users don't do).
- **Backend** lives ONLY in `backend/main.py` + `backend/requirements.txt` + `backend/.env*`. The `backend/app/`, `backend/components/`, `backend/frontend/`, `backend/lib/`, `backend/*.tsx`, and Streamlit prototype `.py` files were all purged in `bdcb293`. Do not recreate them. Railway only ships `main.py` and `requirements.txt`.
- **Railway GitHub auto-deploys are GENUINELY BROKEN, not just noisy** - even with `watchPatterns` scoped to `backend/**`, backend pushes consistently fail healthcheck. As of 2026-05-12, fully disabled at the dashboard level (Settings → Source → "Auto deploy is disabled"). Always deploy backend via the canonical manual `railway up` sequence in the Deployment section below. `railway.toml`'s `[build].watchPatterns` is kept as belt-and-suspenders in case anyone ever re-enables auto-deploy.
- **Live portfolio value pattern**: GreetingBar polls holding prices every 60s and computes `portfolioToday.pct`. Bubbles via `onTodayPctChange?: (pct: number | null) => void` callback up to `app/app/page.tsx` (`todayPct` state), down to `PortfolioBuilder` via `todayPct?: number | null` prop. Display formula is always `liveValue = base x (1 + todayPct / 100)`. Sidebar input shows live value when blurred, base when focused.
- **Evening Brief defaults to collapsed**. localStorage `corvo_brief_collapsed` value `"0"` means expanded (user opted in); any other value means collapsed.
- **PublicNav** is the single source of truth for the public nav. The homepage uses `<PublicNav scrollerRef={containerRef} />` to drive scroll-aware hide/show off its inner 100vh container. Other pages use `<PublicNav />` (no ref) which falls back to `window.scrollY`. Scroll behavior is `requestAnimationFrame` polling, NOT scroll events.
- **PublicNav inner container** uses `max-width: 1240, padding: 0 56px` matching the hero content width. Logo aligns with the leading edge of "The advisor" headline; Get Started pill aligns with the trailing edge.
- **`/watchlist-data` rate limit is 600/hour** (10/min average) as of v0.30. The earlier 30/hour limit was breaking the dashboard: GreetingBar polls `/watchlist-data` every 60s for both index prices (^GSPC, ^IXIC, ^DJI) and the user's holdings - 2 calls × 60 polls = 120/hour for one tab, double for two tabs. Users with the dashboard open more than ~15 minutes saw the live-value tiles, holdings chips, and "Markets" mini-cards stuck on "loading..." because every poll was 429-ing. If 429s start showing up in prod Railway logs again, do investigate - they're no longer expected background noise.

## Mobile Rules

- All mobile fixes must use `max-width: 768px`
- Never touch desktop styles when fixing mobile
- Desktop is the source of truth - mobile adapts to it

## CSS Variables

- `--bg`, `--bg2`, `--bg3`, `--card-bg`, `--border`, `--border2`
- `--text`, `--text2`, `--text3`, `--text-muted`
- `--accent` (`#c9a84c` dark dashboard, `#b8860b` dark, `#8b6914` light)
- Themes set via `[data-theme="dark"]` and `[data-theme="light"]` in `globals.css`
- Light mode is the default for new/logged-out users - localStorage key is `corvo_theme`

## Key Things Never to Break

- The double backend/backend path issue on Railway - always edit `backend/main.py`, confirm Railway serves the right file
- Sharpe ratio uses live `^IRX` T-bill rate - never hardcode `rf_rate`
- CAGR label is dynamic based on selected period
- AI insights must never single out one holding as largest when multiple share equal weight
- What-If analysis requires weights to total 100% before running
- Morning briefing uses actual yfinance 1D price data for holdings - never estimate
- Money market tickers (ending in `XX`, or in `CASH_TICKERS` list) get synthetic 4.5% price series

---

## Stack

- Frontend: Next.js 16, deployed on Vercel - `frontend/`
- Backend: FastAPI, deployed on Railway - `backend/main.py`
- Database: Supabase (Postgres + Auth + RLS)
- Railway URL: `web-production-7a78d.up.railway.app`
- Live site: `corvo.capital`
- GitHub: `vinay-batra/corvo`
- Version: v0.37

## What Was Built

### v0.37 (May 16, 2026) - tabbed sidebar polish + close v0.34 audit follow-ups

**Holdings sticky header offset under the new tab nav**
- v0.36 added a sticky tab nav (Holdings / Account / Saved) at the top of the sidebar's scroll region with `position: sticky, top: 0, zIndex: 15`. The Holdings tab's internal sticky header (count chip + weight status + utility menu) also had `top: 0` but with `zIndex: 20`, so it rendered ON TOP of the tab nav whenever the user scrolled within Holdings. Fix: Holdings header now pinned to `top: 44px` (height of the tab nav) with `zIndex: 14` so it stacks correctly underneath. Both headers stay sticky as designed.

**perfHistory refetch after a brand-new save (closes audit issue #4 from v0.34)**
- The auto-detect effect that maps active assets to a `savedPortfolioId` had deps `[assets, userId]`. When the user clicked Save on a previously-unsaved portfolio, neither dep changed - so savedPortfolioId stayed null, perfHistory stayed empty, and the live value display kept falling back to the user-input seed instead of ratcheting from EOD snapshots (which were now being written for that new portfolio).
- Fix: new `savedPortfolioRefreshTick` state, bumped via a `corvo:portfolio-saved` window-event listener (SavedPortfolios already dispatches this event on save - now app/app/page.tsx listens for it too). Added to the auto-detect effect's deps. A save fires the event → tick bumps → effect re-runs → detection finds the new portfolio → savedPortfolioId updates → perfHistory effect fires → liveBaseValue starts ratcheting. No page reload required.

**"Save to track day-over-day" hint on unsaved portfolios**
- New prop `isSaved?: boolean` on PortfolioBuilder, threaded from `app/app/page.tsx` as `!!savedPortfolioId`. When the Account tab is visible AND the portfolio is unsaved AND there's at least one holding, a small dashed-border hint card renders under the Portfolio Value: a gold bookmark icon + "Save this portfolio in the Saved tab to track day-over-day." Explains why the live value isn't ratcheting yet (the EOD snapshot cron is keyed by portfolio_id - unsaved portfolios never get snapshots written). Vanishes the moment the user saves.

**Saved chip cards: relative timestamps**
- Each Saved chip now shows "Analyzed today" / "Analyzed yesterday" / "Analyzed 3 days ago" / "Analyzed 2w ago" / "Analyzed 3mo ago" underneath the ticker list. Pulled from `updated_at` on the portfolios row (already written by the toDb mapper on every save). New `relativeAnalyzed(iso)` helper handles the fallback to "Never analyzed" for rows without a timestamp. `Portfolio.updatedAt` was added to the interface and to `fromDb` to pull `row.updated_at || row.created_at`.

**Saved chip cards: active portfolio highlight**
- Cards now compute `isActive = ticker set matches active assets` and styling-fork accordingly: gold left border (was transparent border-left), gold-tinted background (was bg2), `0 0 12px rgba(201,168,76,0.14)` soft glow (was none), name text shifts to gold (was cream2). A small green "ACTIVE" badge sits next to the account-type badge. Hover state suppressed on the active card so it doesn't visually "click" when hovered. User always knows which saved portfolio is loaded right now.

### v0.36 (May 16, 2026) - tabbed sidebar redesign (Mock C)

**Tabbed sidebar (the redesign user picked)**
- The sidebar previously stacked everything vertically: Logo, Edit with Corvo, PortfolioBuilder (which itself contained Holdings + Account sub-sections), Analyze button, SavedPortfolios. Each section competed for vertical space, the Account section got squeezed at the bottom of PortfolioBuilder, and the Saved cards sat below the Analyze button feeling like an afterthought.
- Now: three sticky tabs at the top of the sidebar's scroll region (`HOLDINGS · ACCOUNT · SAVED`), one tab content at a time, with the Analyze button flowing immediately below whatever tab is active. No flex:1 wrapper means no dead space between content and the button - per direct user feedback ("just make sure not to pin analyze all the way at the bottom there shouldnt be all that empty space between the stuff and analyze button").
- Tab nav: gold underline glow on the active tab (matches the dashboard top tabs visual vocabulary). Inactive tabs hover-brighten to var(--text). Position sticky at top: 0 so tabs stay visible while scrolling through a long Holdings list or a long Saved list.

**PortfolioBuilder gained a `view: "holdings" | "account"` prop**
- One component instance still owns all the state (assets, account type, live base value, polling effects). The new `view` prop wraps each top-level section in `{view === "X" && (<>...</>)}` so the parent can route Holdings + Account into different tabs. Default value `"holdings"` preserves backwards compat for the onboarding flow that doesn't know about tabs.
- The sticky Holdings header (count chip + weight status + utility menu) only renders in the Holdings view. The Portfolio Value card + Account Type grid + Reinvest toggle only render in the Account view. Modals (Presets, CSV import, NL Edit preview) render regardless of view so triggers from Holdings still work mid-modal even if user switches tabs.

**Account type dropdown -> 2x4 grid of selectable cards**
- The native `<select>` with 4 optgroups (Taxable / Retirement / Health / Education) is gone. Replaced with a 2-column grid of 8 selectable cards. Each card shows the short label in gold Space Mono (`BROKERAGE`, `ROTH IRA`, etc.) + a tight chip-friendly tax framing summary underneath (`TLH + cap gains apply`, `Tax-free growth`, `Pre-tax + match`, `Kiddie tax applies`, etc.).
- Active card: gold border + soft 12px gold glow + accent-tinted text. Hover state: gold-tint background + accent-30 border. Title attribute on each card surfaces the full label + tagline.
- New `chip` field on `AccountTypeMeta` in `frontend/lib/accountType.ts` carries the tight chip text - under 28 chars per spec. The full `tagline` is preserved for the dashboard pill tooltip + any future detail surfaces.

**Sidebar wrapper overflow flipped**
- Outer sidebar `overflow: hidden` -> `overflowY: auto, overflowX: hidden`. Previously the Builder area was flex:1 + overflow:auto so it filled the sidebar height and scrolled internally. That model is what caused the dead space above Analyze when content was short. New model: whole sidebar scrolls as one column, tabs stay sticky at top, Analyze sits at the natural end of tab content.

**SavedPortfolios moved out of the standalone bottom section**
- Previously SavedPortfolios rendered as its own section below the Analyze button. Now it renders inside the Saved tab. Same component, same onLoad signature (passes `assets, accountType, portfolioId, portfolioName` so savedPortfolioId updates synchronously per v0.35). Has more vertical breathing room now that it owns the sidebar's full width when active.

**Edit-with-Corvo kept at its current location**
- The collapsible "Edit with Corvo" NL input row stays above the tabs (between the Logo and the tab nav). It's a global tool that works regardless of which tab is active, so it makes sense as sidebar chrome rather than tab content. Could move into the Holdings tab as a footer button in a future iteration if you want it more contextual.

### v0.35 (May 16, 2026) - hotfix: same-delta-across-portfolios bug + remove PortfolioSwitcher

**Same-delta-across-portfolios bug (the headline fix)**
- User reported (with screenshot): clicking different saved portfolios in the sidebar SavedPortfolios all showed identical live value + identical -$242 / -0.48% delta at the top of the dashboard. Confirmed by an audit pass: the chain `savedPortfolioId -> perfHistory -> liveBaseValue -> live value display` was broken at the first link.
- Root cause: `SavedPortfolios.onLoad(assets, accountType)` did NOT pass the portfolio's id or name. The dashboard's onLoad handler set assets + accountType but never set `savedPortfolioId`. There was an async auto-detect useEffect on `[assets, userId]` that was SUPPOSED to figure out the matching saved portfolio from the new ticker set, but it raced against everything else (Supabase round-trip, the holdingPrices polling fetch, the auto-snapshot writer) and frequently lost. When it lost, `perfHistory` stayed empty (or stayed bound to the wrong portfolio), `liveBaseValue` fell back to `portfolioInputValue` (the user's input seed), and every portfolio rendered `seed * (1 + todayPct)` - the SAME dollar amount because the seed was the same.
- Fix: widened `SavedPortfolios.onLoad` signature from `(assets, accountType)` to `(assets, accountType, portfolioId, portfolioName)`. SavedPortfolios already has the full `Portfolio` row when the user clicks a saved chip, so passing the id + name through is free. Dashboard's onLoad handler now sets `setSavedPortfolioId(id)` + `setSavedPortfolioName(name)` synchronously alongside the assets / accountType setters. The perfHistory effect's `[savedPortfolioId, userId]` dep array fires on the same render, fetches the new portfolio's snapshots, and liveBaseValue recomputes against the right base on the next render.
- The old async auto-detect useEffect is kept for backwards-compat (handles cases where assets are set from somewhere other than SavedPortfolios click) but is no longer load-bearing for the click path.

**GreetingBar polling race**
- Found while debugging the above. The polling effect on `[assets]` clears its interval on cleanup but does NOT cancel the in-flight fetch. Race: user clicks portfolio A, A's `/watchlist-data` fetch starts, user clicks B before A resolves, A's effect cleanup runs, B's effect starts B's fetch, B's fetch resolves first (setHoldingPrices(B)), A's fetch resolves later (setHoldingPrices(A) - stale overwrite). The next 60-second poll on B's interval would self-heal, but the user sees A's pct for up to 60 seconds.
- Fix: added AbortController + `cancelled` boolean to the effect. AbortController stops the underlying request on cleanup; the cancel flag is belt-and-suspenders for the (rare) case where the abort signal fires after the fetch has already resolved but before the `setHoldingPrices` call. Also added `setHoldingPrices([])` at the top of the effect so the stale data doesn't briefly bleed into the new portfolio's display window during the few seconds before the new fetch resolves.

**PortfolioSwitcher removed**
- v0.34 introduced an inline chip row at the top of the workspace showing all saved portfolios with their account-type badges. User feedback (with screenshot): "Remove this little account section from the top of the dashboard. Keep the one in the analyze sidebar." Removed the component entirely (`frontend/components/PortfolioSwitcher.tsx` deleted), removed import + JSX from `app/app/page.tsx`. SavedPortfolios in the sidebar is the single source of truth for portfolio switching going forward.

### v0.34 (May 16, 2026) - day-over-day persistence + portfolio switcher + 401(k) prompt fix + HS cache partition

**Day-over-day portfolio value persistence (the headline fix)**
- Problem: portfolio value display used to compute as `seed x (1 + todayPct)` where `seed` = the user's `corvo_portfolio_value` localStorage input. At every market open, todayPct=0 so live=seed - and any gains accumulated during the previous session vanished into the ether. Monday closed +1% to $5,100, Tuesday opened showing $5,000 again. Wrong mental model for anyone used to a real brokerage (Fidelity, Robinhood, etc.) where the displayed balance is "what you actually have right now".
- Fix: new `liveBaseValue` useMemo in `app/app/page.tsx` derives the implicit base from `perfHistory` (the daily portfolio_snapshots rows fetched per active portfolio). Walks newest-first, picks the first snapshot with date strictly BEFORE today (skip today's own snapshot if the EOD cron has already run, otherwise we'd double-count today's pct), falls back to the user's input seed when no snapshots exist.
- Threaded through to both display sites: GreetingBar (replaced `portfolioValue={portfolioInputValue}` with `portfolioValue={liveBaseValue}`) and PortfolioBuilder (new `liveBaseValue` prop). PortfolioBuilder now distinguishes two values cleanly: `portfolioSeedNum` (the user's input, edited via the sidebar field when focused) and `effectiveBaseNum` (the snapshot-derived ratcheting base, used for the live display when blurred). The delta annotation line ("base $X · +Y% today · live $Z") shows effectiveBaseNum so the math is traceable.
- Requires the v0.30 `eod_portfolio_snapshot_loop` cron to be running (it is - writes one snapshot per saved portfolio per weekday at 4:15 PM ET). New portfolios get their first snapshot on the next weekday close; before that, the display falls back to the seed.
- Edge case: unsaved portfolios have no snapshots so the display works as before (seed x (1 + todayPct)). Save the portfolio to enable day-over-day tracking. Could surface a "save to track day-over-day" prompt on unsaved portfolios as a follow-up.

**Per-account portfolio switcher**
- New component `frontend/components/PortfolioSwitcher.tsx`. Horizontal scrollable chip row, rendered above the tab AnimatePresence in `app/app/page.tsx` so it persists across tab switches.
- Each chip = a saved portfolio. Shows portfolio name + a small gold account-type badge (BROKERAGE / ROTH IRA / TRAD IRA / ROTH 401K / TRAD 401K / HSA / 529 / CUSTODIAL). Active portfolio (the one whose ticker set matches the live `assets` state) is highlighted with a 1px gold border + 12px soft gold glow.
- Click a chip = calls the same load handler SavedPortfolios uses (`(assets, accountType) => { setAssets(a); setAccountType(at); }`), so the account-type-aware AI prompts flip in lockstep.
- Auto-hides when the user has 0 or 1 portfolios (no value to a switcher in those cases). Skipped on the Learn tab (separate learning module, no portfolio context).
- Listens to `corvo:portfolio-saved` custom event so a new portfolio saved via SavedPortfolios in the sidebar appears in the switcher immediately.
- Eyebrow "ACCOUNT" label on the left of the row for visual parity with HOLDINGS / SAVED / ACCOUNT sidebar sections.

**401(k) prompt tightening**
- The v0.32 A/B test showed Roth/Trad 401(k) variants were softer than the other 6 - Claude named the wrapper ("navigate to your 401(k) account") but didn't lean into the tax framing the way it did for Roth IRA ("permanently tax-sheltered account where every compounding dollar is yours to keep") or HSA ("tax-advantaged account with no loss-harvesting escape valve").
- Fix: appended an explicit "MUST name the '[wrapper]' wrapper in the rationale at least once and frame the recommendation around tax-free compounding / RMD planning / employer match - generic advice that could apply to any account is rejected" instruction to both 401(k) rule blocks in `_ACCOUNT_TYPE_RULES`.

**health_score_cache account-type partitioning**
- Migration `20260516010000_health_score_cache_account_type.sql` adds `account_type text not null default ''` to the cache table, drops the old `(user_id, date, tickers_hash)` unique constraint and adds `(user_id, date, tickers_hash, account_type)` instead. Idempotent via `do $$ if not exists` guards on both the column and the constraint.
- Backend `_hs_load_from_supabase(user_id, date, tkr_hash, account_type="")` and `_hs_save_to_supabase(user_id, date, tkr_hash, result, account_type="")` widened to accept the account_type. Read filter and write payload both include it.
- The v0.32 "skip Supabase cache when account_type is set" bypass logic is gone. We trust the cache again - same portfolio in two account types gets two cached responses, both age out together at midnight.

### v0.33 (May 16, 2026) - sidebar ACCOUNT section + GreetingBar account-type pill

**Sidebar ACCOUNT section**
- The bottom-of-sidebar block that held Portfolio Value + Account Type + Reinvest Dividends now lives under a single gold "ACCOUNT" eyebrow header, so it visually parallels HOLDINGS and SAVED in the sidebar hierarchy. The three controls used to read as three independent fields with overlapping gold eyebrows; now they read as one section with three sub-controls. Same gradient + bordered container + bleed-to-edges layout as before - only the internal organization changed.
- "PORTFOLIO VALUE" gold sub-eyebrow demoted to a regular cream "Portfolio value" label with the helper copy as its description sub-line ("Used for P&L and tax math"). Eliminates the awkward two-gold-eyebrows-in-the-same-section stack. Privacy eye still sits inline with the label, same `corvo:value-hidden-changed` event wiring.
- Account type sub-section + Reinvest dividends sub-section unchanged structurally, just nest under the new ACCOUNT master eyebrow.

**GreetingBar account-type pill**
- Small gold pill next to the live portfolio value, showing the active account type's `short` label (BROKERAGE / ROTH IRA / TRAD IRA / ROTH 401K / TRAD 401K / HSA / 529 / CUSTODIAL). Title attribute on hover surfaces the full label + tagline so it's discoverable without crowding the UI.
- New `accountType?: AccountTypeId` prop on GreetingBar; threaded from `app/app/page.tsx` GreetingBar callsite as `accountType={accountType}` (state was already there from v0.32). Falls back to `DEFAULT_ACCOUNT_TYPE` when omitted.
- Rendered in two places to handle both states: (1) inside the gb-live-value flex container, as the rightmost element after the privacy eye, when portfolioValue > 0 - this is the common case; (2) as a fallback render outside the conditional, when portfolioValue is 0/null, so users see the account context on day one before they've set a base value. Same visual style in both paths.
- Visual style matches the gold-tinted badges used in SavedPortfolios chip cards: `fontFamily: 'Space Mono'`, fontSize 9, fontWeight 700, gold color + `rgba(201,168,76,0.1)` background + `rgba(201,168,76,0.3)` border, 5px radius. Always-on (not just for non-default types) so the feedback is consistent across every portfolio.

### v0.32 (May 16, 2026) - Recently Viewed stocks + Account Type aware AI

**Recently Viewed on the Stocks tab**
- New `frontend/lib/recentlyViewed.ts` helper. Reads / writes a 5-entry MRU list at `localStorage["corvo_recently_viewed"]` keyed by ticker; dispatches a `corvo:recently-viewed-changed` custom event on every mutation so other tabs (and other StocksSearch instances) stay in sync without page reload. Each entry is `{ ticker, name?, viewedAt }`; `trackRecentlyViewed(ticker, name?)` de-dupes by uppercased ticker so calling it twice in quick succession (once with no name on ticker mount, once with the name after the `/stock/:t` fetch resolves) ends up as a single MRU entry with the name attached.
- `StockDetail.tsx` hooks twice on ticker change: a bare `useEffect(() => trackRecentlyViewed(ticker), [ticker])` (fires immediately so a fast nav-away still leaves a trace), plus a follow-up call inside the existing `setInfo(d)` handler with `d.name` once the fetch resolves.
- Renders inside `StocksSearch` (defined at `frontend/app/app/page.tsx:702`) in the empty-search state, above the Live Market 3x3 grid. Small gold "RECENTLY VIEWED" eyebrow + a flex-wrap row of pill cards: ticker in gold Space Mono, truncated company name beneath, hover bumps border to gold-tint + 1px translateY-lift. A 16x16 close button on each chip calls `removeRecentlyViewed(ticker)` (red-tint hover), `e.stopPropagation()` so the X doesn't also trigger the underlying `onSelect`. Section hides entirely when the list is empty - no placeholder, no empty state copy.

**Account Type on portfolios**
- `portfolios` table gains an `account_type text not null default 'taxable_brokerage'` column with a CHECK constraint over 8 supported values: `taxable_brokerage` (default), `roth_ira`, `traditional_ira`, `roth_401k`, `traditional_401k`, `hsa`, `529`, `custodial`. Migration `supabase/migrations/20260516000000_portfolios_account_type.sql` is idempotent (`add column if not exists` + `do $$ ... if not exists` guard on the constraint) + ends with `notify pgrst, 'reload schema'` so PostgREST drops its stale column cache immediately. **Run this migration in the Supabase dashboard SQL editor before the frontend deploy** - otherwise SavedPortfolios saves will 400 once the new column is referenced.
- New `frontend/lib/accountType.ts` exports `ACCOUNT_TYPES` (the canonical metadata array), `getAccountType(id)` (returns metadata, falling back to default), `isAccountTypeId(v)` (type guard for untrusted input from Supabase rows), `DEFAULT_ACCOUNT_TYPE`, plus the `AccountTypeId` union type. Each entry has `id`, `label`, `short` (chip text), `group` (Taxable / Retirement / Health / Education), and `tagline` (one-line UI subtext).
- PortfolioBuilder gets a grouped `<select>` underneath the Reinvest dividends row (uses optgroups for visual hierarchy across the 8 options, native control for accessibility + mobile-friendliness, `colorScheme: dark ? "dark" : "light"` so the OS dropdown picks the right theme). Tagline from `getAccountType(accountType).tagline` shows underneath. Props `accountType` + `onAccountTypeChange` are **optional**: when no handler is provided the selector simply isn't rendered. That keeps the onboarding callsite (`frontend/app/onboarding/page.tsx`) untouched - it doesn't care about tax context that early in the funnel.
- State lives in `app/app/page.tsx` (`const [accountType, setAccountTypeState] = useState<AccountTypeId>(DEFAULT_ACCOUNT_TYPE)`), seeded from `localStorage["corvo_account_type"]` on mount, persisted on every change. Threaded through every fetch site that consumes Claude downstream:
  - `fetchPortfolio` (handleAnalyze + auto-load) gains an `accountType` arg, appended to the `/portfolio` query string as `&account_type=<id>`. Default arg is `""` so the existing public-homepage demo call still type-checks.
  - `handleWhatShouldIDo` body gains `account_type`.
  - `SavedPortfolios.onLoad` signature widens to `(assets, accountType) => void` - clicking a saved portfolio now restores both the holdings AND the account type they were saved with. The chip card shows a small gold `ROTH IRA` / `HSA` / `529` badge next to the name when the portfolio isn't the default brokerage type.
  - `AiChat` gets a new `accountType?: string` prop, dropped onto `portfolio_context.account_type` so the backend reads it from the chat request body's existing context dict (no new top-level field needed).
  - `HealthScore` gets `accountType?: string` and includes it in the `/portfolio/health-score` POST body. The tickers/userId/accountType triple keys the local cache so account-type changes invalidate stale advice.
- Backend mirrors the wiring. `_ACCOUNT_TYPE_RULES: dict[str, str]` carries 8 rules blocks (each 3-5 sentences). `_account_type_block(id)` returns the block prefixed with `\n\n` for direct interpolation, or `""` if the id is empty / unknown. Injected into all 4 AI prompts:
  - `/chat` (line ~2520): `account_type_text = _account_type_block(ctx.get("account_type", ""))` pulled from `portfolio_context.account_type`. Appended to the system prompt after `{financial_goals_text}` and before `{page_context_text}` so it slots in with the other personalization blocks.
  - `/portfolio/health-score`: `HealthScoreRequest` gains `account_type: str = ""`. Block appended to the existing `system_prompt` string. `_hs_cache_key` signature widens to `(user_id, tickers, account_type="")` so the same portfolio in two different account types doesn't share a cached Claude response - the underlying score is the same but the headline / actions diverge. Supabase cache is bypassed entirely when `account_type` is set (the persisted `health_score_cache` rows pre-date the column - reusing them would return advice that ignores the user's chosen type). Acceptable until the cache schema is migrated.
  - `/what-should-i-do`: `WhatShouldIDoRequest` gains `account_type: str = ""`. Block injected immediately after the existing `{investor_rules}` block so the model sees BOTH the risk/horizon-based rules AND the tax-context rules.
  - `/portfolio/daily-signal`: `DailySignalRequest` gains `account_type: str = ""`. Cache key now `{today_str}:{at_key}:{portfolio_key}` (where `at_key = req.account_type or "default"`) so a Roth IRA and a taxable brokerage with identical holdings get different signals. Block appended after the PRIMARY ISSUES section in the prompt.
- `/portfolio` GET also threads `account_type: str = ""` through the query params and echoes it back on the response so the frontend has it on `data.account_type` after analysis (for downstream consumers that read off `data` instead of holding their own copy).
- The 8 rules blocks are deliberately opinionated:
  - **Taxable**: TLH applies, mind wash-sale, prefer long-term gains over short-term when trimming.
  - **Roth IRA / Roth 401(k)**: forbids TLH outright, forbids cap-gains discussion, surfaces contribution limits + the 59.5 penalty, favors growth-tilted.
  - **Traditional IRA / 401(k)**: forbids TLH + cap-gains, surfaces RMDs at 73 + ordinary-income brackets at withdrawal.
  - **HSA**: forbids TLH + cap-gains, frames as triple-tax-advantaged medical/retirement bucket.
  - **529**: forbids TLH + cap-gains, prescribes a glide-path that de-risks as the education milestone approaches.
  - **Custodial (UGMA/UTMA)**: allows TLH but flags the kiddie-tax muting effect, surfaces age-of-majority transfer + FAFSA impact, prefers tax-efficient ETFs.

**Bundled with v0.31 cache-bust** (staged on 2026-05-12, not yet pushed). See v0.31 section below for the full breakdown.

**Deploy order**: (1) Run `20260516000000_portfolios_account_type.sql` in the Supabase dashboard SQL editor first. (2) `railway up` the backend (canonical sequence in the Deployment section). (3) Push to main for Vercel auto-deploy. Backend has to ship before frontend because the frontend's PortfolioBuilder save will reference the new column.

### v0.31 (May 12, 2026) - logo cache-bust, stale push-notification icon fix

**The problem**: Returning users on a normal reload were still seeing the pre-v0.30 logo. Chrome caches favicons in a separate `Favicons` SQLite database that ignores normal HTTP cache headers, and the regular HTTP cache pins `/corvo-logo.png` until expiry. Same-named file in place = browser serves cached copy on Cmd+R. Only Cmd+Shift+R (which sends `Cache-Control: no-cache`) forces a re-fetch, and most users never hard-refresh.

**The fix**: Appended `?v=2` to every static asset URL via a targeted `sed` pass with a `[^?]` guard to prevent double-busting on accidental re-runs. 42 total stamps:

- 26 inline `/corvo-logo.png` refs across 18 files (`app/`, `components/`, blog templates, public pages, modals)
- Favicon set in `app/layout.tsx` icons meta: `favicon-16x16`, `favicon-32x32` (×2 - icon + shortcut), `icon-192`, `icon-512`, `apple-touch-icon`
- OG / Twitter card images in `app/layout.tsx` (×2) and JSON-LD `screenshot` in `app/page.tsx` (`https://corvo.capital/og-image.png?v=2`)
- JSON-LD `logo` in `app/page.tsx` (`https://corvo.capital/corvo-logo.png?v=2`)
- PWA manifest icons in `public/manifest.json` (`/icon-192.png`, `/icon-512.png`)

Existing users get a fresh fetch on their next visit because the URL is genuinely different - browser treats it as a new resource. No more "hard refresh required."

**Bonus**: `hooks/usePushNotifications.ts:33` had `icon: "/corvo-logo.svg"`, but `/corvo-logo.svg` was deleted in v0.29 during the favicon overhaul. Push notifications had been silently rendering with no icon since then. Now points at `/corvo-logo.png?v=2`.

**Next logo swap**: regenerate the raster pipeline (`/tmp/corvo_logo_transparent_thick.py` + `/tmp/corvo_favicon_v2.py`), then bump the suffix everywhere in one find/replace (`?v=2` → `?v=3`). Do NOT rely on file replacement alone - same URL means same cache hit.

**Frontend deploy**: pending. Push to main triggers Vercel auto-deploy. No backend changes.

### v0.30 (May 12, 2026) - dashboard polish, day-over-day cron, logo overhaul, math fixes, brand-forward AI

**Daily Signal collapse**
- New `corvo_signal_collapsed` localStorage state, defaults `true`. Matches the Evening Brief semantics: only an explicit `"0"` keeps the signal expanded across sessions.
- Header row gains a chevron-down button that rotates 180° when expanded. Headline stays visible in both states. Rationale + impact chips + action steps + confidence/CTA footer all live inside a single `<div>` wrapper with `max-height: 0 → 4000` and `opacity: 0 → 1` transitions (matches the GreetingBar collapse pattern).
- Dismiss button kept (slim "Today's signal dismissed" strip still appears when clicked).

**Live portfolio value privacy toggle**
- New `corvo_value_hidden` localStorage state, defaults `false`. Eye / eye-off SVG button sits inline at the end of the live-value group in GreetingBar header.
- When on: dollar amount swaps to `$••••••` and the day delta + "loading..." / "market closed" subtext are hidden. Eye icon flips to eye-off. The hidden value uses `fontVariantNumeric: tabular-nums` so the layout doesn't reflow on toggle.

**End-of-day snapshot cron (`eod_portfolio_snapshot_loop`)**
- 9th background task in `lifespan`. Startup delay 300s (last in the stagger), then waits until 4:15 PM ET on the next weekday and fires every 24h after.
- `_write_eod_snapshots()` fetches every row of `portfolios` (id, user_id, tickers, weights), normalises array vs CSV ticker/weight columns, constructs a `SnapshotRequest`, and calls the existing `_portfolio_snapshot_inner`. The inner writer's PATCH-then-POST upsert keyed on `(portfolio_id, date)` makes the cron idempotent on same-day re-runs.
- Synchronous body runs in `run_in_executor` to keep the event loop free for `price_alert_loop` and other concurrent tasks. Per-write try/except so one bad portfolio (missing tickers, yfinance flaky) doesn't poison the batch.
- New `GET /admin/test-eod-snapshot` endpoint requires `X-Admin-Key`. Use it to manually trigger the cron without waiting for market close (safe mid-day; just refreshes today's row).
- Solves the v0.29 day-over-day gap. `portfolio_snapshots` columns already in place from `20260511020000_portfolio_snapshots_schema_fix.sql` - no new migration.

**Homepage hash anchor scroll**
- New useEffect in `frontend/app/page.tsx` (the homepage Landing component) listens to `hashchange` and runs on mount.
- Reads `window.location.hash`, finds the target element, computes its offset relative to `containerRef.current`, calls `containerRef.current.scrollTo({ top, behavior })` minus a 68px nav-height fudge.
- Fixes clicking `/#features`, `/#install`, `/#pricing` etc. from the nav: the homepage's 100vh overflow-auto containerRef hijacks the scroll, so the browser's native anchor scroll was scrolling the (un-scrollable) window. This bridges the gap.
- **Hardening pass**: the first version's one-shot 60ms timeout was being clobbered by GsapHero's `ScrollTrigger.refresh()` that runs at +120ms post mount. New version retries up to 20× at 100ms intervals if element/scroller aren't ready, fires the initial scroll at 250ms (post GSAP refresh), AND re-attempts at 700ms as a fallback in case anything else jostled scrollTop. First attempt uses `behavior: "auto"` so a user-initiated scroll within the first 250-700ms doesn't cancel a smooth animation. Hashchange events (user clicking Features in nav) still get smooth scrolling on the single attempt.

**Dashboard action surface (mid-day reversal)**
- First pass: deleted the standalone WSID card on the grounds that it duplicated DailySignal's framing - both said "here's what to do" and the two stacked into visual repetition.
- Second pass (committed same day): user rejected the consolidation. DailySignal removed from the dashboard render entirely; WSID fully restored - state slots, `handleWhatShouldIDo` function, JSX, customizer entry, section-header gate, and the `setWsidResult(null); setWsidOpen(false);` reset call in `handleAnalyze`. DailySignal component file (`frontend/components/DailySignal.tsx`) and the `/daily-signal` backend route are kept in the codebase but no longer rendered / called. Net dashboard top-of-fold: GreetingBar → WSID action card → metrics.
- **WSID button click fix** (the "Get Actions" pill): the previous handler called `e.stopPropagation()` unconditionally but only acted when `wsidOpen + wsidResult` were both true (refresh state). In the initial state propagation was blocked without doing anything, so clicking the surrounding banner worked but clicking the button itself was a no-op. Now always fires `handleWhatShouldIDo`, clears `wsidResult` first when refreshing, supports keyboard (Enter / Space), cursor is always `pointer` except during loading.
- **WSID response parser pairs headline + explanation.** Claude was emitting each action's headline and its explanation as separate blank-line blocks, so a 3-action plan rendered as 6 numbered bullets where every other one was really a paragraph. New parser: a short single-line block (<130 char) followed by a substantially longer block (>1.6× length or >120 char) gets paired as headline + paragraph. Multi-line blocks still parse the original way for backwards compat. Result: 3 bullets, paragraph beneath each.

**Collapsed-brief preview**
- New: when the brief is collapsed (default), GreetingBar shows a 2-line teaser pulled from `market.market` (the "Markets Today" snippet) directly under the greeting row.
- `-webkit-line-clamp: 2` for clean ellipsis truncation, click expands the full brief (calls `toggleCollapsed`), `Enter` / Space also works for keyboard.
- Hidden when `hideBriefing` is set or when `market?.market` isn't loaded yet, so empty briefs don't render an empty preview row.

**Morning / Evening Brief localStorage key bump**
- `corvo_brief_collapsed` → `corvo_brief_collapsed_v2`. Same `"0" = expanded` semantics on the new key; v1 ignored. One-time force-reset for returning users whose brief was inadvertently still open.

**GreetingBar perfHistory wiring**
- New `yesterdayClosePct` useMemo derived from `perfHistory[length-1].portfolio_value` vs `perfHistory[length-2].portfolio_value`. Returns null when fewer than 2 snapshots are available.
- For now surfaces only in the live-value `title` tooltip. Visible carry-forward UI lands after the cron has accumulated a few weekdays.

**Logo overhaul (multiple iterations, settled here)**
- Master `frontend/public/corvo-logo.png`: transparent gold raven with **6 px alpha-dilated strokes** so the silhouette holds at 30-40 px nav sizes. Pipeline `/tmp/corvo_logo_transparent_thick.py` (PIL `MaxFilter` for alpha dilation, then crop + 4% pad + 717 resize). Failed mid-day experiment: making the master a dark-tile (gold on opaque #0a0e18 square) so it'd look like the user's reference image everywhere. User rejected - turned every inline logo into a small dark badge against light page bg. Reverted to transparent.
- Browser-chrome favicons get a **dark navy fill** (BG `#0a0e18`) at 98% canvas fill, re-sourced from the thickened transparent master. Pipeline `/tmp/corvo_favicon_v2.py`. Files: `favicon-16x16`, `favicon-32x32`, `favicon.ico` (multi-res 16/32/48), `apple-touch-icon`, `icon-192`, `icon-512`. Dark fill is essential for browser tab + iOS home screen visibility - transparent gold disappears against light chrome.
- In-app callsite bumps: PublicNav 30 → 38 px with soft gold drop-shadow. Dashboard sidebar logo 26 → 34 px at full opacity (was 0.9). AiChat empty-state container 32×26 (squished) → 42×42. AiChat message-bubble avatar 20 → 28 px outer with inner ratio 0.58 → 0.72 + soft gold glow. Footer.tsx + PublicFooter.tsx gain 64 / 88 px watermark logos centered at the very bottom. Footer.tsx inline 16×13 squished aspect corrected to 22×22.

**GoalTracker math fix**
- Projection CAGR clamped to a **4-10% long-horizon band**. The old code compounded the user's `data.annualized_return` (often a 1Y hot run, e.g. 25.5%) across the full 20-year horizon, producing fantasy projections ($50 k base → $4.7 M target vs $1 M goal) and a "+$3.7M ahead of goal" line that read like a participation trophy. New `projectionCagr = max(0.04, min(observedCagr, 0.10))` is used for the projected value, the trajectory chart, and the required-CAGR math.
- The card now surfaces the assumption explicitly: "Projection assumes 10.0% CAGR (capped from your recent 25.5%, long-horizon estimates use 4-10% so a single hot or cold year doesn't dominate the math)".
- Stat row trimmed 3 → 2 columns (Projected + Status). CAGR detail folded into status line + the assumption note. "Projected" sub reframed from "+$3.7M ahead of goal" to neutral "Meets / $X short of $1M target". Green celebration footer dropped for on-track goals.

**PerformanceChart math fix**
- Dollar mode now anchors the **right edge at TODAY's portfolioValue**. Previously the chart treated `portfolioValue` as the *start*-of-period value and grew it forward by cumulative return, so a $50 k input showed $62.5 k at the right edge on a +25% YTD - inconsistent with every other place in the app that uses `portfolioValue` as a "current" anchor.
- New implementation derives the implicit start-of-period value as `portfolioValue / (1 + last_cumulative_return)`, then plots everything against that. The last data point lands exactly on `portfolioValue`. Benchmark and saved-portfolio overlay use the same implicit start so the comparison reads as "if you'd put $start into S&P / saved-portfolio on day one".

**`/watchlist-data` rate limit bumped 30 → 600 per hour**
- Old 30/hour cap was breaking the dashboard. GreetingBar polls `/watchlist-data` every 60 s for index prices (^GSPC, ^IXIC, ^DJI) and the user's holdings - 2 calls × 60 polls = 120/hour for one tab, double for two tabs. Users with the dashboard open more than ~15 minutes saw the live-value tiles, holdings chips, and Markets mini-cards all stuck on "loading...".
- 600/hour = 10/min average gives multi-tab headroom and absorbs genuine bursts.
- CLAUDE.md rule corrected: 429s on this endpoint were a UX bug, not normal log noise.

**Admin endpoint `GET /admin/real-stats`**
- Returns the unfloored platform counts: `auth.users`, `profiles`, `portfolios`, `portfolio_snapshots`, `chat_usage`, `health_score_cache`, `price_alerts`, `price_targets`. Per-table counts use PostgREST's `Prefer: count=exact + Range: 0-0` trick. Failures swallowed per-table so one broken table doesn't 500 the response.
- Header: `X-Admin-Key: $SUPABASE_SERVICE_ROLE_KEY` (same key the rest of `_require_admin_key` checks).
- First snapshot (2026-05-12): 9 profiles, 4 saved portfolios, 55 chat_usage rows, 0 portfolio_snapshots (cron hadn't fired yet), 0 health_score_cache, 1 price alert, 2 price targets. Homepage `/stats` still displays 847+ for marketing copy.

**AiChat polish + crash fix**
- "Always watching" gold eyebrow above the empty-state headline dropped - the headline already carries the framing.
- Avatar (CorvoAvatar component) 20 → 28 px outer with inner logo ratio 0.58 → 0.72 + 6 px gold drop-shadow + border opacity 0.25 → 0.35. Default size raised in the component definition too.
- **SUGGESTION_SETS index-out-of-bounds crash fixed.** `useEffect` rolled `Math.floor(Math.random() * 4)` for the active suggestion set, but `SUGGESTION_SETS` only has 3 entries (indices 0/1/2). On a 25% roll the state landed on index 3, and `SUGGESTION_SETS[3].map()` in the empty-state render returned `undefined.map` → crashed into `app/error.tsx` ("Corvo hit an unexpected error"). Reload re-rolled and usually picked 0-2, masking the bug. Random now capped to `SUGGESTION_SETS.length`; render site has a `?? SUGGESTION_SETS[0]` fallback for future drift.

**Brand-forward AI (replacing "AI" wordmark with the Corvo logo)**
- Floating chat button on the authenticated dashboard (`app/app/page.tsx`): "AI" Space Mono text replaced with `<img src="/corvo-logo.png">`. Theme-inverse fill: light theme keeps the gold gradient bg + renders the gold logo as a flat black silhouette via `filter: brightness(0)`; dark theme inverts to a dark gradient (#1a1f2e → #050810) with a gold accent border, soft 22px gold glow, and the natural gold logo on top. Hover state intensifies the gold ring + glow in both themes. `aria-label` + `title` updated "AI Chat" → "Ask Corvo".
- Same swap applied to PublicAIChat (the floating button on every public page: features, install, pricing, about, FAQ, changelog, blog). Theme detection via `MutationObserver` watching `data-theme` on `document.documentElement` so it stays in sync with PublicNav's theme toggle without lifting state.
- Sidebar AI editor accordion label: "Edit with AI" → "Edit with Corvo" (same Space Mono uppercase letter-spacing treatment).

**AI Insights → Retirement in the Intelligence grid**
- Removed `AiInsights` entirely from the dashboard: import gone, array entry gone, customizer entry gone, `insights` removed from `DASH_CARDS` + `DASH_CARD_LABELS`. The component file `frontend/components/AiInsights.tsx` is kept on disk in case it gets re-wired elsewhere later.
- GoalTracker moved out of its standalone Analysis-region block into the Intelligence grid where AI Insights used to live. Net "Where Corvo would focus" section: Health Score (left) + Retirement (right) + vs Benchmark (full-width below).
- GoalTracker renders bare (no shared `<Card>` wrapper) because it provides its own card chrome. Its chrome now matches the shared Card spec exactly: same border, border-radius, padding, base shadow, hover lift + soft 24px trackColor glow. Persistent `trackColor` border-left stripe (red when behind, green when on track) stays as the card's status-coded identity, equivalent of Health Score's gold CardHeader bar. Inner flex-column + `flex: 1` so the card stretches to match Health Score's height in the same row.
- The map pattern for the bottom-grid now supports a `bareContent` field on each entry - entries with `bareContent` skip the `<Card><TooltipCardHeader>` shell. `cardKey` is now an explicit field on each entry instead of derived from `title`.

**GreetingBar right column cleanup**
- Dropped the "Portfolio Today" block at the top (30 px green/red percentage + dollar delta). Same data as the always-visible header next to the greeting, and the 30 px figure overflowed left into the divider on narrower viewports. Right column now goes straight from MARKETS pills into HOLDINGS marquee.

**Sidebar Portfolio Value privacy toggle**
- Eye / eye-off button next to the "PORTFOLIO VALUE" eyebrow in PortfolioBuilder, mirroring the GreetingBar header eye. Shared state via a new `corvo:value-hidden-changed` custom event - clicking either eye masks both displays in lockstep. When hidden the input swaps to a `••••••` button (clicking unmasks) and the `+$X · +Y% today · base $Z` annotation hides. Both components subscribe to the event + `storage` event.

**Reinvest dividends switch**
- The Yes / No pill button read like a status badge rather than a control. Replaced with an iOS-style 36×20 toggle switch: 16 px sliding knob, green-filled track with soft glow when on, neutral bg3 with inset shadow when off. The whole row is now a `<label>` wrapping a hidden checkbox so clicking either the text or the switch toggles. Same `handleReinvestToggle` handler and `reinvestDividends` state.

**Customize FAB visibility**
- Settings / Profile / Alerts / Email Preferences / Referral / Help / Goals all render as full-screen modal overlays at the `/app` route - `activeTab` stays "overview" while they're open. The Customize FAB was peeking behind / next to those overlays. Gate now combines `activeTab === "overview"` with `!show{Settings, Profile, Alerts, EmailPrefs, Referral, HelpModal, Goals, DashEditor}`.

**Hero landing on nav-back to homepage**
- Previously, clicking "Features" on `/pricing` (or any other route) navigated to `/#features` → homepage mounted → useEffect found the hash and called `scrollTo` → user saw hero for a flash then GSAP's `ScrollTrigger.refresh()` at +120ms reset / disrupted scrollTop, finally landing at the bento cards. Read as a jarring glitch.
- Fix: on initial mount of the homepage, if the URL has a hash, strip it via `history.replaceState` and stay at hero. Subsequent in-page `hashchange` events (user clicks Features while already on `/`) still trigger the smooth scroll to the section. Net: nav-from-elsewhere → hero, in-page click → scroll.

**PublicNav scroll hide/show belt-and-suspenders**
- Kept the existing `requestAnimationFrame` poll on scrollerRef.scrollTop, added a scroll-event listener on the same target feeding the shared `update()` function. The rAF catches GSAP-driven programmatic scrolls and edge cases where scroll events don't fire on overflow containers; the scroll listener catches fast scrolls that exceed the rAF loop's 8 px frame-diff threshold. Ref attachment retries briefly (up to 10× at 80 ms intervals) if `scrollerRef.current` isn't populated yet.

**Portfolio screenshot import (`/parse-portfolio-image`)**
- Frontend was getting 401 for everyone on this endpoint. `/parse-portfolio-image` was made JWT-protected in v0.28's IDOR closures, but the caller in PortfolioBuilder never got updated to send the `Authorization: Bearer <jwt>` header. Frontend showed a generic "No holdings found" because the parser treated the error response as "model couldn't read the image". Now sends the Supabase access token via `supabase.auth.getSession()`; `d.detail` (FastAPI HTTPException error shape) is also read alongside `d.error` so auth / rate-limit failures surface their real message.
- Prompt sharpened. Old "Extract all stock/ETF/crypto holdings..." didn't mention mutual funds, money markets, or any of the common Vanguard / Fidelity row formats. New prompt explicitly lists stocks / ETFs / mutual funds (5-letter ending in X) / money markets / bonds / crypto, shows three example row shapes (`VTSAX – 66.07%`, `AAPL 25%`, `NVDA $12,500 (15%)`), bans markdown code fences. `max_tokens` 1000 → 2000 so longer portfolios don't get truncated. Parser strips code fences if Claude wraps the array anyway, upper-cases tickers, filters malformed rows (missing ticker, zero / NaN weight), logs raw model output to Railway when extraction fails.
- MIME normalisation: browsers occasionally report `image/jpg` for JPEGs but Anthropic only accepts `image/jpeg` (along with png/gif/webp). Both backend and frontend now normalise. HEIC / AVIF / PDF / BMP / TIFF return an explicit "Unsupported image type" instead of being passed through to a generic Anthropic 400.

**CLAUDE.md authoritative rules (post-v0.29 clarifications)**
- Railway GitHub integration relabeled "GENUINELY BROKEN" + noted as dashboard-disabled.
- Em dash rule scopes to project source only; explicit `.agents/skills/*` exception for vendored plugin docs.
- `/watchlist-data` rate limit is 600/hr as of v0.30. Earlier rule that called 429s "normal log noise" was wrong - they were a UX bug. New rule: investigate any 429s on this endpoint going forward.
- Live portfolio value pattern gains a session-scoped caveat + pointer to the day-over-day backlog (now resolved by this release).
- Open items for v0.29 cleared.

### v0.29 (May 11, 2026) - product polish: logo, nav, live portfolio value, OG card, schema fix

**New logo**
- Replaced "C in gold circle" with the new gold raven head + rising arrow (source: ChatGPT-generated PNG `07_00_13 PM.png`). Selected for clarity at 16-32 px favicon sizes; previous candidate (`07_00_04 PM.png`) was too detailed and read as a smudge in small renders.
- PIL pipeline: strip black background via alpha threshold (< 18 fully transparent, < 50 graded alpha for smooth edges), crop to bird bounding box, square with 4% breathing padding.
- Generated favicon variants: 16, 32, 48, 180, 192, 512 px. `favicon.ico` is multi-resolution (16/32/48 embedded) for legacy clients.
- Master at `frontend/public/corvo-logo.png` (717x717 transparent).
- 26 inline `<img src="/corvo-logo.png">` callsites across 18 files flipped from .svg to .png.
- `app/layout.tsx` icons meta updated to point at the new PNG icon set; `manifest.json` already referenced icon-192/512.
- Stale public/ files deleted: `favicon.svg`, `logo.svg`, `raven-logo.svg`, old `corvo-logo.svg`, `image-1778541426026.jpg`, 5 Next.js default templates (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- `og-image.png` regenerated 1200x630 with raven left + wordmark + tagline + features row + URL footer. Previous OG was text-only wordmark with no logo.
- `corvo-pfp.png` regenerated 400x400 raven on dark navy fill so external profile-pic links flip to the new mark automatically.

**PublicNav redesign**
- Height bumped 58 to 68px.
- Logo left, **centered nav links** (Features anchor / Install / Pricing / Changelog / Blog / About / FAQ - 7 flat links, no dropdowns), actions right.
- Inner container `max-width: 1240, padding: 0 56px` so logo aligns with hero "T" in "The advisor" and Get Started pill aligns with end of headline. Outer nav stays full-width for backdrop-blur.
- Hover bubbles on every link/button: `var(--bg3)` background, 9px radius, 0.15s transition. No more bare text-color hover.
- Fully rounded `Get Started` pill (border-radius 9999).
- Scroll-aware hide-on-scroll-down / show-on-scroll-up - **NOW WORKS ON HOMEPAGE**. Switched from scroll events (which the homepage's GSAP container swallowed for unknown reasons) to requestAnimationFrame polling. Reads `scrollerRef.current.scrollTop` or `window.scrollY` each frame, ~free at 60fps, bulletproof.
- Homepage replaced its inline 167-line nav with `<PublicNav scrollerRef={containerRef} />`. Lost the inline referral-link copy widget that lived in the avatar dropdown - same feature still reachable via `/referrals` or UserMenu.
- Mobile drawer is a flat list of 7 links + theme toggle + install + auth row. No more accordion expand/collapse for non-existent dropdowns.

**Dashboard: live portfolio value**
- GreetingBar now shows live value (`base x (1 + todayPct / 100)`) + delta (`+$115 · +0.23%`) next to "Good evening, Test." Always visible regardless of brief collapse state.
- Evening Brief defaults to **collapsed** so the Today's Signal card below it is the dashboard's focal point. localStorage `corvo_brief_collapsed` semantics changed: only `"0"` keeps it expanded across sessions; missing or any other value defaults to collapsed.
- Sidebar `PortfolioBuilder` input now shows live value when unfocused. On focus, snaps to base + auto-selects so user can edit cleanly. On change, saves user input as new base. Below input: green/red annotation `+$115 · +0.23% today · base $50,000`.
- New `onTodayPctChange?: (pct: number | null) => void` callback in GreetingBar bubbles today's pct up to `app/app/page.tsx`, which holds a `todayPct` state and passes down to PortfolioBuilder via new `todayPct?: number | null` prop.

**Dashboard tour fixes**
- Step 2 (Daily Brief) was anchored to `tour-desk-analyze` (the New Analysis button in the sidebar - wrong target). Now anchors to `tour-desk-brief` on the actual Daily Brief / GreetingBar wrapper.
- Step 5 (was: "Price alerts and digests" on the bell only) consolidated into "Top bar" stop covering alerts + theme toggle + Export + Share + settings via new `tour-desk-topbar-actions` and `tour-mob-topbar-actions` wrappers on the action clusters.

**Supabase migration**
- New `20260511020000_portfolio_snapshots_schema_fix.sql`. Triggered by prod 500s ("Could not find the 'date' column of 'portfolio_snapshots' in the schema cache"). Root cause: legacy `portfolio_snapshots.sql` migration (no timestamp prefix) is silently skipped by `supabase db push`, so newer columns (date / raw_value / portfolio_value) never reached prod.
- Idempotent: `create table if not exists`, `add column if not exists` for each expected column, guarded `create policy` + unique constraint via DO blocks, `notify pgrst, 'reload schema'` at the end to drop PostgREST's stale column cache.
- Applied to prod. Backend snapshot inserts work again.

**Railway hardening**
- Added `[build].watchPatterns = ["backend/**", "railway.toml", "Procfile"]` so frontend-only pushes (where 99% of churn lives) stop triggering Railway auto-deploys. Each failed auto-deploy was leaving a red "Healthcheck failed" row in the deploy history.
- Manual `railway up` ran cleanly (`970a4bf5`): build pass, deploy pass, healthcheck pass on first try. Service "Online", `GET /health` returns HTTP 200.
- Backend code shipped is current main (no new backend changes since v0.28 audit).

**Other-session work that's already in main**
- `8630a8e` Bottom-right buttons: 60x60 AI, 44x44 Feedback/Customize, theme-aware hover (both themes), aligned button centers
- `be1bf14` useReveal: detect viewport at mount + double-RAF for above-fold reveals (fixes scroll reveals that previously stuck at opacity:0 on first paint)
- `c2ec571` AnimatedHeading double-RAF trigger; About page copy updated to guardian framing ("Built to be the advisor I needed.")
- `3ebe354` Pricing: removed MOST POPULAR badge from Pro card (not launched)
- `34ee324` Public-page headings sized to hero spec with mixed gold/black color
- `bdcb293` Repo cruft purge: ~7,400 stale files deleted from `backend/` (duplicate frontend tree, Streamlit prototype, .DS_Store, Icon, ghost mirror, venv). `backend/` now contains only `main.py`, `requirements.txt`, `.env` (gitignored), `.env.example`.

### v0.28 (May 11, 2026) - audit-driven security + cleanup pass

**Backend security**
- `POST /portfolio/snapshot`, `PATCH /price-targets/{id}`, `DELETE /price-targets/{id}`, `POST /parse-portfolio-image` now JWT-verify the caller and 403 on user_id mismatch (closed 3 IDOR vulnerabilities flagged in audit)
- `GET /referrals`, `GET /chat/usage`, `GET /portfolio/history`, `POST /unsubscribe` now require auth; user_id is derived from the token, not the request
- `/chat` SSE error stream and `/parse-portfolio-image` no longer leak raw exception strings to the client
- New `_client_ip(request)` helper reads X-Forwarded-For first, so rate limit buckets work per-client behind Railway's proxy (was per-deployment global)
- `check_rate_limit` uses OrderedDict with LRU eviction capped at 50000 keys. `_image_parse_daily` capped at 5000. `_market_per_ticker_cache` capped at 500.
- Rate limits added to `/prices`, `/search-ticker`, `/market-summary`, `/market-brief`, `/market-driver`, `/earnings-calendar`, `/earnings/transcript/{ticker}`, `/portfolio/health-score`
- `/montecarlo/insight` and `/portfolio/retirement-simulation` now force `req.simulations = 8500` regardless of client input (was a critical rule violation per CLAUDE.md)
- Push notification title emoji removed
- 8 background loops gain staggered startup delays (30 to 240s) to avoid yfinance dogpiles on cold boot
- 6 bare `except:` clauses promoted to `except Exception:`
- Daily-signal tied-largest-holding guard added (returns "N holdings tied" descriptor instead of singling out one when weights are equal)
- Dead `/docs-check` route removed
- All Paper Trade routes + helpers deleted (~270 lines from main.py)

**Frontend security & cleanup**
- backend/.env, frontend/.env.local.bak, frontend/.env.local.save untracked from git (key rotation still required for ANTHROPIC_API_KEY)
- backend/.env.example corruption fixed (newlines + real anon key replaced with placeholder)
- `lib/api.ts` now throws on missing NEXT_PUBLIC_API_URL in production. 33 files migrated from local `process.env... || "http://localhost:8000"` fallbacks to centralized `RESOLVED_API_URL` export
- `middleware.ts` `supabase.auth.getUser()` wrapped in try/catch so transient Supabase outage no longer 500s the site
- New `app/error.tsx` segment-level error boundary (was only `global-error.tsx` for root)
- New `lib/theme.ts` helper (`cssVar`, `plotlyHoverlabel`, `currentTheme`) for libraries that cannot read CSS vars directly
- 17 console.error / console.warn statements wrapped in `process.env.NODE_ENV !== "production"` guards

**Dead code purge**
- Deleted 9 unused/orphan components: PaperTrading, PriceTargetTracker, DividendTracker, EarningsImpactPreview, PeerComparison, PortfolioCompareTab, PortfolioHeartbeat, PortfolioHistory, MobileBottomNav
- Migration `paper_trading.sql` deleted; new migration `20260511000100_drop_paper_trading.sql` drops the underlying tables
- Removed MobileBottomNav references from app/app/page.tsx (it was force-hidden via CSS dead code)

**Em / en dash sweep**
- 330 em dashes and 42 en dashes replaced across 79 project source files (.ts, .tsx, .py, .css, .md, .sql, .html)
- AGENTS.md em dash removed
- CLAUDE.md em dashes removed too

**Light / dark mode**
- 3 compare pages (Bloomberg, Yahoo Finance, Robinhood) converted from inline hex (#0a0e14 page bg, #e8e0cc text, #0d1117 bg2, #111620 card-bg) to CSS variables. 39 hex literals replaced.
- Plotly hoverlabel colors in PerformanceChart, MonteCarloChart, StockCompare, StockDetail, CorrelationHeatmap now theme-aware via the new `plotlyHoverlabel()` / `cssVar()` helpers
- Toggle knobs in settings and dashboard use new `--toggle-knob` and `--toggle-knob-shadow` CSS variables (defined in both `[data-theme="dark"]` and the light root)
- SharePortfolio canvas-rendering helper reads CSS variables at runtime instead of hardcoded hex

**Mobile breakpoints**
- 7 wrong-breakpoint media queries (max-width 900, 600, 767) standardized to 768 in app/page.tsx, app/faq/page.tsx, app/blog/layout.tsx, components/PublicNav.tsx, components/Footer.tsx

**Mobile polish**
- Customize FAB gains `corvo-customize-btn` class and repositions to `right: 136px` on mobile (no longer overlaps Feedback or runs off-screen)
- InstallBanner gains `corvo-install-banner` class and stacks above the FAB row on mobile (`bottom: 80px`)
- OnboardingTour tooltip clamps to viewport on both axes (no more off-screen on narrow phones)
- Mobile tab bar bumped from `height: 40` to `height: 44` (touch target spec), padding 11 to 14, gains `mobTabsRef` + scrollIntoView effect so active tab is always visible after back/forward navigation

**Motion reveal anti-pattern fix**
- 34 `motion.div` blocks with broken `whileInView + initial={false}` combo (app/page.tsx + 3 compare pages) rewritten with explicit inverse initial state matching the whileInView target
- `FadeUp`, `SlideIn`, `Reveal` helpers in app/page.tsx now delegate to the IntersectionObserver-based `ScrollReveal`
- CLAUDE.md rule updated: `initial={false}` is required EXCEPT when paired with `whileInView`

**Supabase RLS**
- New migration `20260511000000_security_hardening.sql`:
 - Adds `Users read own health scores` policy on health_score_cache (RLS was enabled with zero policies, locking the table to service role only)
 - Drops the blanket `Authenticated users can read all profiles` policy (was leaking bonus_messages_per_day, referral_credited, life_events, financial_goals, etc.)
 - Adds tighter `Users read own profile` policy on profiles
 - Creates `get_leaderboard(p_limit int)` SECURITY DEFINER RPC that exposes only id / display_name / xp for the leaderboard view
- `app/learn/page.tsx` leaderboard migrated from direct `profiles` SELECT to `supabase.rpc("get_leaderboard", { p_limit: 10 })`

### v0.27 (May 11, 2026)
- Sidebar / portfolio builder polish - sticky header eyebrow promoted to gold 10px Space Mono with refined holdings count chip (rgba 201,168,76 tint). Total-weight badge gained gold-tinted background when unbalanced + rounded 6px corners. Holding row dots 4→6px with `box-shadow` glow. Weight bar 3→4px with gold gradient + soft shadow. Add Asset button got dashed border + plus-icon + hover lift to amber. Portfolio Value section now has its own gold-eyebrow header (Space Mono), bigger 14px value input with gold $ prefix, faint gradient backdrop. Reinvest toggle pill refined (font-weight 700, drop shadow on green dot, hover lift). "Edit with AI" sidebar row rebuilt with gold-tinted icon container (22×22 rounded square), Space Mono uppercase label, 2px gold left-rail accent when expanded. SavedPortfolios got gold-eyebrow "SAVED" header + premium "Save" pill button with plus icon, and chip cards now have 2px gold border-left accent on hover with 1px translateX lift.
- Modals standardization - `InfoModal` (gold eyebrow + Space Mono 18px title + 28×28 gold-hover close) pattern applied to: ShareImageModal, dashboard customizer, NL edit preview (now has a real title - "Preview impact" or "Review changes"), Presets modal, CSV import modal, WhatIfDrawer. All eyebrows now use letter-spacing 0.22em + var(--font-mono). All close buttons standardized to 28×28 with `var(--bg3)` background + gold border-color/color on hover.
- App top bar premium pass (incremental on v0.26) - backdrop-blur(14px) + saturate(140%), shadow gained 4% gold tint at top edge. Active tab underline now has a 3-stop gold gradient (60%→100%→60%) for a soft glow taper, plus secondary inner shadow. Inactive tabs gain a 3% gold-tinted background on hover + brighten to var(--text). Alert bell, dark-mode toggle, and Export pill all gained gold-accent hover (border + color + background) - Export shifts to gold pill when open. Alert dot got a 6px gold glow.
- Loading / "analyzing" state - `AnalysisSteps` rebuilt. New 84px ambient orb up top: two rotating gold orbit rings (8s + 14s reverse), inner 56px gold sphere with radial gradient + pulsing box-shadow + Corvo star icon with drop shadow. New gold eyebrow "ANALYZING PORTFOLIO" + Space Mono 17px headline that swaps to the active step with a 0.4s fade-in. Step rows now show an active state - gold-tinted circle with breathing pulse, 0 0 10px gold glow, three animated trailing dots. Active step label brightens to var(--text) at weight 600. Done rows fade to opacity 0.65 (was 1).
- 404 / not-found / global error pages - both rebuilt to brand language. `app/not-found.tsx` now has a Corvo-logo orb with two rotating gold rings + pulse animation, gold "ERROR 404" eyebrow, gold→half-amber linear-gradient text-clip on the 404 numeral, Space Mono headline, premium gold CTA with drop shadow. `app/global-error.tsx` upgraded from default sans-serif div to red-orb-with-warning-triangle pattern, "UNEXPECTED ERROR" eyebrow, Space Mono headline, copy now mentions "Corvo hit an unexpected error" + that the issue was reported, premium gold Reload button.
- Bottom toolbar buttons (AI / Feedback / Customize, 48×48 fixed bottom-right) - all three lift on hover via Framer Motion (`whileHover={{ y: -1 }}`), tap-shrink via `whileTap`. AI Chat button now uses a 155° amber→gold→darker-gold linear gradient with inner-top white highlight, 24px gold drop shadow → 32px gold drop shadow + 4px gold ring + brighter inner highlight on hover, text-shadow on the "AI" label. Feedback + Customize gain matching premium hover (gold-tint background + gold border + gold color + gold ring shadow + 0.04 inner highlight). FeedbackModal header standardized to InfoModal pattern (gold eyebrow + Space Mono 18px title + 28×28 gold-hover close).
- Settings row-level UI controls - Toggle redesigned: 40×22 with gold linear-gradient background when on, 1px gold-tinted ring + 12px gold glow + inset shadow + 0.5px gold border, knob 17×17 with subtle off-white gradient + deeper drop shadow + hairline outer-stroke. Period selector now a single segmented pill (3px padding, var(--bg3) background, 0.5px border) with the active option getting a solid gold pill + 0.4 letter-spacing + 8px gold drop shadow; inactive options hover-brighten. inputStyle / selectStyle gained `transition` and now get a gold focus ring (0.55 border + 3px gold halo + bg2 background) and var(--border2) on plain hover via a global `.s-content` CSS rule. btnOutline gained gold border + gold color + gold-tinted background on hover via `.s-btn-outline`. btnSave got 12px gold drop shadow + transform-translateY hover lift + 18px gold drop shadow on hover via `.s-btn-save`. Row label promoted from 500 to 600 weight with -0.1 letter-spacing; desc copy gets 1.5 line-height.
- AI Chat panel - second polish pass on top of v0.26. Header icon buttons (history / export / close) gained var(--bg3) background + premium gold-tinted hover (border + background + color). Context bar toggle bumped from 28×16 plain pill to 30×17 with green linear-gradient + 1px green ring + 8px green glow + inset shadow + premium knob with subtle gradient/outline-stroke; matches Settings Toggle spec. Empty-state suggestion chips lift on hover (`y: -1`), get gold-tinted border + gold-tinted background + brighter text. "Refresh suggestions" link got a proper SVG refresh icon and gold-hover pill background. Message-limit modal upgraded to InfoModal pattern (gold "AI Chat" eyebrow + Space Mono 18px "Message limits" title + 28×28 gold-hover close), inner sections now use gold mini-eyebrows + per-item descriptions, usage bar gained 6px colored glow, "Copy referral link" button gained 14px gold drop shadow + hover translateY-lift. Chat-history sidebar "Chat History" label promoted to gold Space Mono eyebrow with 0.22em letter-spacing; mobile close went from 44×44 transparent to 28×28 bg3 + gold hover. "New Chat" button got tighter hover state (border + bg both gold-tint) and weight bumped to 700.

### v0.26 (May 11, 2026)
- Auth page rebuilt - 56px gold-tinted logo container, "Welcome back / Get started / Magic link / Reset password" headline above tagline ("The advisor watching over your portfolio"), bigger card (460px, 44/40 padding, layered shadow + gold top-edge accent), mode tabs use solid amber active state, OAuth buttons hover with gold accent, primary CTA has gold drop shadow + hover lift, inputs have 4px gold focus glow.
- AI chat polished - header rebuilt with gold-tinted Corvo logo + two-line "Corvo / AI ADVISOR" title (was plain "Corvo AI" text). Empty state: gold "ALWAYS WATCHING" eyebrow + 17px Space Mono headline + 58px logo container with inner glow. Input grew to 42px min-height with 3px gold focus ring; the plain-text "SEND" button became a 42×42 amber square with a paper-plane SVG icon + drop shadow + hover lift.
- App top bar premium upgrade - height 52→56px, backdrop-blur(12px), subtle drop shadow. Active tab underline 2→2.5px thick with amber glow. Active tab fontWeight 600→700 with tighter letter-spacing. Inactive tabs hover-lighten.
- Pricing page rebuilt - feature lists updated to match v0.25 product reality (removed Paper Trading + Watchlist; added Daily Signal, Goal Tracker, three-beat AI Health Score, morning brief + PWA push). New floating "MOST POPULAR" gold pill badge on Pro card. Plan names promoted to 28→25px Space Mono, prices to 56→48px. Subtle vertical gold gradient on Pro card. Killed `amberPulse` animation. Cards lift +6px on hover with deepened shadows. Made cards slightly smaller across the board (max-width 440→400).
- Public page section padding rhythm matched to homepage features section - pricing/install/faq/about/changelog all now use 80-140px top + bottom on sections (was 0-80px). Mobile rules scaled proportionally.
- Changelog timeline redesigned - vertical alternating cards → horizontal scroll-snap of 5 thematic chapters (Foundations / Smart & Connected / Mobile, Auth & Math / Income, Email & Tools / The Guardian Era). Solid amber line through dots, card hover lift, dot scale on hover.
- Account page: removed Quick Links section (destinations reachable from global nav).
- Default portfolio value 10k → 50k for new users (dashboard, homepage demo widget, PortfolioBuilder). Existing users keep their stored value.
- Bug fix - /watchlist-data backend was returning `0` for missing yfinance data, making the dashboard render "+0.00%" instead of "--". Now falls back to `t.info` regularMarketPrice/PreviousClose, and returns nulls when both sources fail. Frontend stops coercing nulls to 0. Fixed math bug in portfolioToday averaging.
- Auth flow not changed - same Supabase OAuth + magic link + Turnstile captcha, just sharper UI.

### v0.25 (May 11, 2026)
- App UI overhaul: features-page design language applied across every authenticated tab. New `SectionHeader` component (gold eyebrow + Space Mono headline) with scroll-reveal. Dashboard split into 4 named regions (Overview / Analysis / Intelligence / Composition). Positions, Stocks, Simulations tabs all upgraded with the same pattern.
- Shared component polish: `_CARD_BASE` refined (14px radius, 22-24px padding), `TooltipCardHeader` rebuilt (sentence-case title + optional eyebrow), `InfoModal` upgraded, `IconBtn` with gold-accent hover, performance period selector promoted to premium pill group.
- Marketing + profile pages: Install/Changelog/FAQ hero badges get pulsing gold dot. Settings/Referrals/Account sections rebuilt with gold accent stripe + Space Mono headlines.
- Homepage rewrite - "your portfolio's guardian" positioning. New headline "The advisor watching over your portfolio." Hero stats swap "AI Insights" for "Risks Flagged". New pulsing red "Risk flagged · Tech > 60%" floating chip. Features section reframed as "Always watching" / "What Corvo watches for you". Final CTA → "Let Corvo watch your back." Hero scaled up to clamp(32-60px) headline with larger metric cards.
- AI quality pass: sharpened Corvo voice across chat, Daily Signal, and AI Insights prompts. All three now identity-reframed as "the AI advisor watching over your portfolio" with explicit 3-beat structure (what I see / why it matters / what to consider), banned hedging filler.
- Security sweep: closed 2 IDOR vulnerabilities (`/portfolio/tax-loss-alert/{user_id}` and `/price-alerts/{alert_id}` DELETE both now JWT-verify caller matches user_id). Fixed RESEND_API_KEY prefix leak in startup logs. Removed raw Supabase error leakage from `/user` DELETE. Added rate limit to tax-loss-alert. Stripped 14 verbose console.log statements from dashboard auto-load.
- Empty/error states: branded design with gold-tinted icon containers, Space Mono titles, gold-accent CTAs. Default error copy explains Railway cold starts.
- Mobile polish: SectionHeaders shrink at ≤768px, customizer collapses to 1 column, homepage risk chip auto-hides via `.hero-metric-card`.
- Onboarding simplified: 11 steps → 8 (age+income combined, risk+horizon combined, life events removed).
- Dashboard tour cut: 9 stops → 5 desktop (6 → 4 mobile). AI advisor card is the final highlight.
- Dashboard customizer redesigned: 540px, 2-col grid, grouped Overview/Analysis/Other, all 14 cards individually toggleable.

### v0.24 (May 10, 2026)
- Dashboard: proactive Corvo insight card above metrics - derives specific 2-sentence observation from live portfolio data (no API call), links to AI chat
- Dashboard customizer: expanded to all cards (tickers, morning brief, WSID); moved to floating button next to AI/feedback
- UI polish: health score breathing ring, holding sparklines on hover, ambient portfolio glow behind dashboard
- Tab transitions: direction-aware slide animations when switching tabs
- Analysis flow: animated step sequence during portfolio analysis with orb, flash-to-done on fast loads
- Charts: $ value toggle on performance chart, dividends toggle on performance chart, drawdown "Why?" button, auto-apply custom date range, auto re-analyze on period button click
- AI chat: roast mode added with SVG icon; stricter no-disclaimer instructions; auto-retry once on Railway cold starts
- Navigation: browser back/forward navigates between dashboard tabs; XP bar and level badge restored to Learn tab
- Investing basics nudge banner for new users; mutual fund detection AI nudge banner
- Removed: paper trading (entire feature), options chain from StockDetail, TLH proactive alert banner, Price Targets card, Projected Income/Dividend card, "How You Compare" card, correlation from dashboard overview, trend arrows from metric cards, Demo links from all navs, landing page grid section
- Backend: dividend yield decimal normalization fix, portfolio_snapshots RLS user_id filter, ETF calendar 404 fallbacks, yfinance crumb/NaN crash fixes

### v0.23 (May 7, 2026)
- Landing page: Three.js particle canvas, GSAP hero animations, 3D bento cards with mouse tilt, horizontal infinite testimonial carousel, animated stats countup, hide-on-scroll nav, scroll animations on all public pages
- Dashboard: trend arrows on metric cards, DashReveal scroll animations, countup animations on load, "What should I do today?" card promoted, ticker chips auto-scroll marquee, morning brief 2-line clamp
- Stock charts: Y-axis now hugs data range (`range: [min*0.97, max*1.03]`), daily intervals for 1Y (252 points), weekly for 5Y (260 points)
- Notifications settings: redesigned as two-column email/push grid
- Changelog page: center alternating timeline redesign
- Public pages: AnimatedHeading character-by-character animation on all headers (FAQ, Changelog, Pricing, Install, Blog, About)
- PublicNav: hide-on-scroll-down, show-on-scroll-up behavior
- Backend: ETF price fallback using `fast_info.last_price`, ETF sector mapping, tax loss harvesting alert endpoint, weekly checkup verdict format upgrade
- SEO: JSON-LD structured data, OG tags, per-page metadata, Twitter cards
- Sentry: client and server config files added
- Paper trading moved to Learn tab as collapsible section
- Income & Tax and Transactions merged into Positions tab
- Compare Stocks button repositioned in Stocks tab

---

## Deployment

- **Frontend**: push to `main` - Vercel auto-deploys
- **Backend deploy**: always use this exact sequence:
 ```
 mkdir -p /tmp/corvo-deploy2/backend && cp ~/Downloads/portfolio_v2/backend/main.py /tmp/corvo-deploy2/backend/ && cp ~/Downloads/portfolio_v2/backend/requirements.txt /tmp/corvo-deploy2/backend/ && cd ~/Downloads/portfolio_v2 && railway up --detach --path-as-root /tmp/corvo-deploy2
 ```
- Railway project has `Root Directory = backend` in settings - upload must have a `backend/` subfolder
- Railway GitHub integration is BROKEN - always deploy manually
- Plain `railway up` times out (.git is 146MB)

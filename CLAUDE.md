# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Current Focus
<!-- UPDATE THIS at the end of every session so the next one knows where to pick up -->

**Last shipped: v0.29 (May 11, 2026) - product polish: logo, nav, live portfolio value, OG card, schema fix**

Replaced the C-in-gold-circle logo with a new gold raven head + arrow across the whole site (nav, footer, AI avatar, dashboard, favicon, iOS home screen, PWA install, OG cards). Polished PublicNav to 68px height with hover bubbles + content-aligned inner container + bulletproof scroll-aware hide/show that finally works on the homepage (rAF polling instead of scroll events). Dashboard now shows live portfolio value (`base x (1 + today's pct)`) right next to the greeting AND in the sidebar input; the Evening Brief collapses by default so Today's Signal is the focal point. Fixed a stale-schema bug in portfolio_snapshots that was 500-ing in prod (legacy un-timestamped migration was silently skipped). Manual Railway deploy ran cleanly; added `watchPatterns` to railway.toml so frontend pushes stop triggering broken auto-deploys. Anthropic key was already rotated by Vinay; the leaked `backend/.env` is untracked from git but remains in commit history.

**Backend deploy on Railway: ONLINE** (manual deploy `970a4bf5`, May 11 - has v0.28 audit pass changes live).

### Open items / next session

Empty. All v0.29 open items resolved 2026-05-12: secret rotation done (Anthropic + Finnhub + Supabase service role + Resend + VAPID — old keys in public git history are now invalidated), Railway "Deploy on Push" disabled at the dashboard level (backend is fully manual-deploy now), OG card cache refresh intentionally skipped (new shares pick up the new card; old shares can wait for TTL).

### Premium polish queue - pick up here next session

Empty. Likely next moves: demo video, YC application, product direction brainstorm (cut News/Watchlist/Learn, build daily morning brief, action CTAs on insights), Plaid sandbox build, PDF reports, day-over-day portfolio value tracking (requires backend table for end-of-day values).

### Blocked / non-design work

1. **Stripe/Pro tier ($9/mo)** - needs parent (Vinay is under 18; TOS requires 18+ to sign for Stripe)
2. **Plaid integration** - auto-sync brokerage. Needs parent to sign for Plaid + production-access approval (weeks). Can build against sandbox in the meantime.

### Logo asset reference

- Master: `frontend/public/corvo-logo.png` (717x717 transparent PNG, gold raven head + rising arrow)
- Favicon set: `favicon-16x16.png`, `favicon-32x32.png`, `favicon.ico` (multi-res 16/32/48), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`
- Marketing: `og-image.png` (1200x630), `corvo-pfp.png` (400x400 on dark fill)
- 26 inline `<img src="/corvo-logo.png">` callsites across 18 files depend on this path. Never rename. If swapping the design, replace the file in place + regenerate favicon variants.

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
- **Logo path is `/corvo-logo.png`** (PNG, transparent background, 717x717 master). 26 inline `<img>` callsites across 18 files depend on this path. Never rename. If swapping the design, replace the file in place and regenerate favicon variants via the PIL pipeline (see scripts in commit `349696a`).
- **Backend** lives ONLY in `backend/main.py` + `backend/requirements.txt` + `backend/.env*`. The `backend/app/`, `backend/components/`, `backend/frontend/`, `backend/lib/`, `backend/*.tsx`, and Streamlit prototype `.py` files were all purged in `bdcb293`. Do not recreate them. Railway only ships `main.py` and `requirements.txt`.
- **Railway GitHub auto-deploys are GENUINELY BROKEN, not just noisy** - even with `watchPatterns` scoped to `backend/**`, backend pushes consistently fail healthcheck. As of 2026-05-12, fully disabled at the dashboard level (Settings → Source → "Auto deploy is disabled"). Always deploy backend via the canonical manual `railway up` sequence in the Deployment section below. `railway.toml`'s `[build].watchPatterns` is kept as belt-and-suspenders in case anyone ever re-enables auto-deploy.
- **Live portfolio value pattern**: GreetingBar polls holding prices every 60s and computes `portfolioToday.pct`. Bubbles via `onTodayPctChange?: (pct: number | null) => void` callback up to `app/app/page.tsx` (`todayPct` state), down to `PortfolioBuilder` via `todayPct?: number | null` prop. Display formula is always `liveValue = base x (1 + todayPct / 100)`. Sidebar input shows live value when blurred, base when focused.
- **Evening Brief defaults to collapsed**. localStorage `corvo_brief_collapsed` value `"0"` means expanded (user opted in); any other value means collapsed.
- **PublicNav** is the single source of truth for the public nav. The homepage uses `<PublicNav scrollerRef={containerRef} />` to drive scroll-aware hide/show off its inner 100vh container. Other pages use `<PublicNav />` (no ref) which falls back to `window.scrollY`. Scroll behavior is `requestAnimationFrame` polling, NOT scroll events.
- **PublicNav inner container** uses `max-width: 1240, padding: 0 56px` matching the hero content width. Logo aligns with the leading edge of "The advisor" headline; Get Started pill aligns with the trailing edge.
- **`/watchlist-data` 429s in prod Railway logs are normal** - that's the rate limiter doing its job. Not a bug, do not chase. Only investigate if you see sustained spikes or 5xx errors in the same window.

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
- Version: v0.29

## What Was Built

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

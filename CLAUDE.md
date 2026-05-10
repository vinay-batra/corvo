# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Current Focus
<!-- UPDATE THIS at the end of every session so the next one knows where to pick up -->

**Session: May 10, 2026 (continued)**
- Onboarding simplified: 11 steps → 8 steps (same structure, less friction)
  - Age + income combined into one step; risk tolerance + horizon combined into one step
  - Life events step removed entirely
  - Portfolio builder and financial goals remain, both skippable
- Dashboard tour cut: 9 desktop stops → 5 (portfolio, daily brief, tabs, AI advisor, alerts)
  - Mobile cut from 6 → 4 stops
  - AI advisor card is now the clear final highlight of the tour
- Dashboard customizer redesigned: 540px wide, 2-column grid, grouped into Overview / Analysis / Other
  - briefing toggle now hides the entire Daily Brief card (not just the brief text)
  - Added goal (GoalTracker), signal (DailySignal), save (Save Analysis banner) to DASH_CARDS
  - All 14 dashboard cards are now independently toggleable

**App UI overhaul — Phase 1 (Dashboard tab, May 10):**
- _CARD_BASE upgraded: 14px radius, 22-24px padding, layered shadow (used by every Card site-wide)
- TooltipCardHeader rebuilt: 14px medium-weight sentence-case title with optional gold eyebrow; replaces the old 10px uppercase tag
- New SectionHeader component (gold mini-label + Space Mono headline) with scroll-triggered reveal
- Dashboard grouped into 4 named regions: **Overview** (daily brief, signal, WSID) → **Analysis** (metrics, performance, goal) → **Intelligence** (health, AI insights, vs benchmark) → **Composition** (allocation, sector, insider)
- Headers only render if at least one card in the region is visible (respects customizer)

**App UI overhaul — Phase 2-4 (May 10):**
- Positions tab: 3 SectionHeaders (Positions / Tax / Activity)
- Stocks tab: SectionHeader on Compare mode
- Simulations tab: 2 SectionHeaders (Project / Stress-test)
- News tab unchanged — single-card sub-tab layout already reads well with upgraded TooltipCardHeader

**App UI overhaul — Phase 5 (May 10):**
- InfoModal (the `?` popup on every card): rebuilt header with gold eyebrow + Space Mono title, generous paddings, refined section labels
- IconBtn (top-bar icons): gold-accent hover with border tint, 0.94 press scale, bumped to 34px
- Performance chart period selector: premium grouped pill control with gold active state; What-If button promoted to gold-accent style

App UI overhaul is complete — all 5 phases shipped.

**Homepage rewrite — guardian positioning (May 10):**
- Hero headline → "The advisor watching over your portfolio." (was "deserves better than a pie chart")
- Hero subhead reframed around what Corvo does (monitors, flags risks, tells you what to do)
- Hero stats: "AI Insights / 17K+" → "Risks Flagged / 12K+"
- New floating red "Risk flagged · Tech > 60%" chip in the hero metric area, pulsing dot
- Features eyebrow "Capabilities" → "Always watching"; headline → "What Corvo watches for you"
- Final CTA headline → "Let Corvo watch your back." with refreshed subhead
- "Guardian" used sparingly in copy — the concept comes through via "watching," "monitors," "advisor"

**AI quality pass (May 10):** sharpened Corvo voice across 3 prompts in backend/main.py
- Chat (POST /chat, line ~2384): identity reframed to "the AI advisor watching over this investor's portfolio". Added explicit 3-beat structure rule for recommendations. Banned more hedging filler.
- Daily Signal (line ~9015): identity reframed. Rationale now must flow through Corvo's 3 beats (what you see / why it matters / setup for action).
- AI Insights / Health Score (line ~4793): demands a position. No more hedged plain-English.
- **Note: backend needs a Railway deploy for these to take effect.**

**Empty/error states (May 10):**
- EmptyState.tsx: gold-tinted SVG icon container (52x52, 14px radius), 15px Space Mono title, gold-accent CTA. Now accepts ReactNode for icon (was string-only).
- ErrorState.tsx: red-tinted icon container, primary message + optional reason line, gold "Try again" button. Default copy explains Railway cold starts.
- globals.css updated for both classes.

**Security sweep (May 10):**
- IDOR fixed: GET /portfolio/tax-loss-alert/{user_id} now JWT-verifies caller matches path param (was wide open); also added 30/hr rate limit
- IDOR fixed: DELETE /price-alerts/{alert_id} now JWT-verifies caller (was trusting self-reported user_id query param)
- Secret logging fixed: startup log no longer leaks RESEND_API_KEY first-6-chars to Railway logs
- Error leakage fixed: /user DELETE no longer returns raw Supabase error body to client; logs server-side instead
- Frontend: stripped 14 verbose console.log statements from dashboard auto-load flow (were leaking user IDs, portfolio data, query results to browser console)
- **Note: backend needs a Railway deploy for these to take effect.**

**Mobile polish (May 10):**
- SectionHeader: added c-section-header / c-section-title / c-section-eyebrow classes. Mobile rule (<=768px) shrinks headline 22→18px, tightens eyebrow letter-spacing, reduces top margin 32→24. Applies to every dashboard, Positions, Simulations, Stocks region header.
- Dashboard customizer: 2-col grid collapses to 1-col on mobile (was cramped at 320-375px).
- Homepage hero risk chip inherits .hero-metric-card so it gets hidden on mobile alongside the other floating cards.

**Phase 6 — marketing + profile pages (May 10):**
- Install/Changelog/FAQ hero badges: added pulsing gold dot to match the existing Pricing badge animation
- Changelog badge copy: "Changelog" → "What's new"; FAQ badge: "FAQ" → "Help"
- Settings page: SectionTitle component rebuilt with gold accent stripe + Space Mono headline (drives all 5 sections — Profile, Preferences, Investor Profile, Referrals, Account)
- Referrals page: Section component rebuilt with same pattern
- Account page: display name now Space Mono, Quick Links upgraded to proper SectionTitle

**Up next (in priority order):**
1. Stripe/Pro tier ($9/mo) — needs parent to set up (Vinay is under 18)
2. Plaid integration — auto-sync brokerage (apply at plaid.com while building)

**Daily Signal (built May 10):**
- POST /portfolio/daily-signal backend endpoint with Claude, in-memory cache by (date, portfolio hash)
- 8 categories: Risk Alert, Rebalance, Tax Opportunity, Earnings Watch, Benchmark Lag, Protect Gains, Diversify, Strong Hold
- Full DailySignal.tsx component: headline, rationale, impact chips, numbered steps, confidence tooltip, urgency badge, dismissed state
- Lives between Daily Brief and WSID on dashboard
- Fails silently on error

**Sidebar redesign (May 10):** AI editor collapsed by default (··· toggle row). Presets/Screenshot/CSV → ··· overflow menu. window.confirm removed → inline 2-click remove confirm. Holdings header shows count badge + weight %. Delete modal: dark blur overlay, red top border, trash icon. NEW ANALYSIS button: solid amber (was ghost). Saved rows: "VIG · SCHD +2" format, 600 weight name.

**Button layout (bottom right, all 48x48px, 12px gaps):**
- AI (gold): right 24
- Feedback (flag): right 84
- Customize (grid): right 144 — dashboard tab only

**Recent completions (May 10, continued):**
- Metric grid: auto-fill -> auto-fit (cards now fill full row)
- Daily Brief: chevron collapse/expand, persists to localStorage
- Health Score: removed duplicate score/grade text, added CTA button that fires AI chat with health score prompt

**Recent completions (May 10, earlier):**
- Daily Brief card: CSS Grid layout, always-visible, portfolio today live
- AI Insights: pill tags, analyst sentences, bolder rebalancing
- Removed: Corvo insight banner, AI nudge banner, showBasicsNudge modal, dead state
- VS S&P card: now full width (grid-column: 1/-1)
- Metric cards: bigger padding and grid min-width
- Save portfolio banner: redesigned with icon + accent border
- Holdings: LIVE pulsing dot when market open
- CORS confirmed locked; no XSS vectors in AI content rendering

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
npm run dev        # start dev server at localhost:3000
npm run build      # production build (also runs type check)
npm run lint       # ESLint
```

### Backend (FastAPI on Railway)
```bash
cd backend
uvicorn main:app --reload --port 8000   # local dev with hot reload
```

Backend env vars must be in `backend/.env`. Frontend env vars in `frontend/.env.local`. See `frontend/.env.local.example` and `backend/.env.example` for required keys.

### Supabase migrations
Migrations live in `supabase/migrations/`. Apply them manually in the Supabase dashboard SQL editor or via `supabase db push` (CLI must be installed and project linked).

---

## Architecture

### Repository layout
```
portfolio_v2/
  frontend/          Next.js app (Vercel)
    app/app/page.tsx   main authenticated dashboard — all state lives here
    app/page.tsx       public homepage — has its own inline nav
    components/        all reusable components
    lib/
      supabase.ts      browser Supabase singleton (always import from here)
      api.ts           typed fetch helpers for every backend route
    middleware.ts      SSR session refresh — must never be deleted
  backend/
    main.py            entire FastAPI backend (~4500 lines, single file)
  supabase/
    migrations/        SQL files applied manually to the Supabase project
```

### Main app data flow

`app/app/page.tsx` owns all global state:
- `assets`: array of `{ticker, weight, costBasis?, manualReturn?}` — the user's portfolio
- `data`: the full portfolio analysis result from `GET /portfolio` — passed as props to every analysis component
- `activeTab`: which of the eight tabs is visible
- Analysis is triggered by `handleAnalyze()`, which calls `fetchPortfolio()` from `lib/api.ts`

The `TABS` constant defines the tab bar. Adding a new tab requires:
1. Adding an entry to `TABS`
2. Adding a conditional render in the tab content section (search for `activeTab === "overview"` to see the pattern)

### Backend structure

`backend/main.py` is a single file. Top-to-bottom layout:
1. Imports, env vars, startup prints, rate limiter
2. FastAPI lifespan — starts 5 background asyncio tasks on startup: `price_alert_loop`, `morning_brief_loop`, `morning_briefing_email_loop`, `week_in_review_loop`, `monthly_summary_loop`
3. CORS middleware
4. All route handlers with inline helper functions
5. Background task implementations (bottom third of the file)

Key routes already implemented:
- `GET /portfolio` — main analysis: Sharpe, CAGR, VaR, correlation, sector, etc.
- `GET /options/{ticker}?date=` — options chain via yfinance, 15-min cache (already fully built)
- `GET /stock/{ticker}` — fundamentals + analyst ratings via yfinance
- `GET /news?tickers=` — news with Finnhub as fallback
- `POST /chat` — Claude-powered AI chat with rate limiting and usage tracking
- `GET /market-brief` — cached AI market summary (5-min TTL)
- `GET /earnings-calendar`, `GET /events-calendar` — calendar data

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

- Frontend: `lib/supabase.ts` exports a singleton browser client. Always import from here — never call `createClient` inline.
- `middleware.ts` calls `supabase.auth.getUser()` on every request to refresh expired JWTs. Without it, SSR pages receive stale sessions.
- Backend: some routes accept an optional `user_id` query param. They verify it by calling `supabase.auth.admin.getUser(token)` via the service role key, falling back to unauthenticated behavior when not provided.

### StockDetail tab system

`StockDetail.tsx` has its own internal tab switcher between "Overview" and "Insider Activity". The Options Chain tab was removed in v0.24 — do not re-add it.

---

## Critical Rules — Never Break These

- `initial={false}` on ALL `motion.*` components, every single one, no exceptions — add comment `// initial={false} required — do not remove`; audit every new component
- No emojis anywhere in the app
- No em dashes anywhere — not in code, not in AI responses, not in copy
- No asterisks in AI responses
- Space Mono font for all numbers and monospace text
- All colors use CSS variables only — never hardcode dark colors
- SVG icons only — no emoji icons
- Always add "Commit and push." to the end of every Claude Code prompt
- Vinay uses Claude Code inside VS Code, not standalone terminal
- Supabase client must always be imported from `lib/supabase.ts` singleton, never instantiated inline — inline clients omit `cookieOptions` and cause sessions to expire on browser close
- `middleware.ts` must exist at the frontend repo root and call `supabase.auth.getUser()` on every request — without it, SSR pages receive expired JWTs and users get silently logged out
- Monte Carlo simulations always run exactly 8,500 paths — never 5,000 or any other number
- `overscroll-behavior: none` must be set globally in `globals.css` on `html`, `body`, and all major layout containers — never remove this
- AI chat endpoint (`POST /chat`) uses `claude-sonnet-4-6` with `web_search` tool enabled and streaming responses
- Never use `animate={{ opacity: 0 }}` or `animate={{ y: X }}` together with `whileInView` — use inline CSS `opacity: 0` and `transform` for the initial hidden state instead; combining both causes the animation to fire immediately and skip the scroll trigger
- `market_close_summary` column exists in the `email_preferences` Supabase table — do not re-add it in migrations
- Both feedback and AI chat buttons render from `app/layout.tsx` globally — do not add them to individual pages or they will appear twice
- Market hours countdown always shows time until next open or close — "After Hours", "Closed", and weekend states must include a live countdown, not a static label
- GSAP is installed (`gsap` package) — ScrollTrigger and SplitText are available; use them for landing page and public page animations
- `ParticleCanvas` component lives in `app/page.tsx` using Three.js, `position: fixed`, `z-index: 0` — do not move or re-implement it
- Income & Tax and Transactions are sections inside the Positions tab — not standalone tabs
- Paper Trade is removed from the app entirely (removed from Learn tab in v0.24) — do not re-add it
- Options Chain is removed from StockDetail entirely (removed in v0.24) — StockDetail has Overview + Insider Activity tabs only
- Period and Benchmark selectors are only in chart controls — not in sidebar

## Mobile Rules

- All mobile fixes must use `max-width: 768px`
- Never touch desktop styles when fixing mobile
- Desktop is the source of truth — mobile adapts to it

## CSS Variables

- `--bg`, `--bg2`, `--bg3`, `--card-bg`, `--border`, `--border2`
- `--text`, `--text2`, `--text3`, `--text-muted`
- `--accent` (`#c9a84c` dark dashboard, `#b8860b` dark, `#8b6914` light)
- Themes set via `[data-theme="dark"]` and `[data-theme="light"]` in `globals.css`
- Light mode is the default for new/logged-out users — localStorage key is `corvo_theme`

## Key Things Never to Break

- The double backend/backend path issue on Railway — always edit `backend/main.py`, confirm Railway serves the right file
- Sharpe ratio uses live `^IRX` T-bill rate — never hardcode `rf_rate`
- CAGR label is dynamic based on selected period
- AI insights must never single out one holding as largest when multiple share equal weight
- What-If analysis requires weights to total 100% before running
- Morning briefing uses actual yfinance 1D price data for holdings — never estimate
- Money market tickers (ending in `XX`, or in `CASH_TICKERS` list) get synthetic 4.5% price series

---

## Stack

- Frontend: Next.js 16, deployed on Vercel — `frontend/`
- Backend: FastAPI, deployed on Railway — `backend/main.py`
- Database: Supabase (Postgres + Auth + RLS)
- Railway URL: `web-production-7a78d.up.railway.app`
- Live site: `corvo.capital`
- GitHub: `vinay-batra/corvo`
- Version: v0.24

## What Was Built

### v0.24 (May 10, 2026)
- Dashboard: proactive Corvo insight card above metrics — derives specific 2-sentence observation from live portfolio data (no API call), links to AI chat
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

- **Frontend**: push to `main` — Vercel auto-deploys
- **Backend deploy**: always use this exact sequence:
  ```
  mkdir -p /tmp/corvo-deploy2/backend && cp ~/Downloads/portfolio_v2/backend/main.py /tmp/corvo-deploy2/backend/ && cp ~/Downloads/portfolio_v2/backend/requirements.txt /tmp/corvo-deploy2/backend/ && cd ~/Downloads/portfolio_v2 && railway up --detach --path-as-root /tmp/corvo-deploy2
  ```
- Railway project has `Root Directory = backend` in settings — upload must have a `backend/` subfolder
- Railway GitHub integration is BROKEN — always deploy manually
- Plain `railway up` times out (.git is 146MB)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Current Focus
<!-- UPDATE THIS at the end of every session so the next one knows where to pick up -->

**Last shipped: v0.27 (May 11, 2026)**

Seven polish targets shipped in a single session, clearing both the original v0.26 queue and the two follow-on items. Sidebar/builder, modals standardization, app top bar (incremental on v0.26), loading state, 404/error pages, bottom toolbar (AI/Feedback/Customize), and settings row controls (Toggle, inputs, selects, period selector, buttons) all moved to the v0.25/v0.26 design language. See the v0.27 entry under "What Was Built" for the full scope. Frontend auto-deploys via Vercel; backend untouched this session.

**AI Chat panel — v0.27 second pass shipped** on top of the v0.26 rebuild. See the v0.27 entry under "What Was Built" for specifics.

### Premium polish queue — pick up here next session

Premium polish queue is empty. Likely next moves: demo video, YC application, product direction brainstorm (cut News/Watchlist/Learn, build daily morning brief, action CTAs on insights), Plaid sandbox build, rate limiting, PDF reports.

### Blocked / non-design work

1. **Stripe/Pro tier ($9/mo)** — needs parent (Vinay is under 18; TOS requires 18+ to sign for Stripe)
2. **Plaid integration** — auto-sync brokerage. Needs parent to sign for Plaid + production-access approval (weeks). Can build against sandbox in the meantime.

### Daily Signal (built May 10) — reference

- POST /portfolio/daily-signal backend endpoint with Claude, in-memory cache by (date, portfolio hash)
- 8 categories: Risk Alert, Rebalance, Tax Opportunity, Earnings Watch, Benchmark Lag, Protect Gains, Diversify, Strong Hold
- Full DailySignal.tsx component: headline, rationale, impact chips, numbered steps, confidence tooltip, urgency badge, dismissed state
- Lives between Daily Brief and WSID on dashboard. Fails silently on error.

### Bottom-right buttons (layout reference)

All 48x48px, 12px gaps. Right edges:
- AI (gold): right 24
- Feedback (flag): right 84
- Customize (grid): right 144 — dashboard tab only

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
- Version: v0.27

## What Was Built

### v0.27 (May 11, 2026)
- Sidebar / portfolio builder polish — sticky header eyebrow promoted to gold 10px Space Mono with refined holdings count chip (rgba 201,168,76 tint). Total-weight badge gained gold-tinted background when unbalanced + rounded 6px corners. Holding row dots 4→6px with `box-shadow` glow. Weight bar 3→4px with gold gradient + soft shadow. Add Asset button got dashed border + plus-icon + hover lift to amber. Portfolio Value section now has its own gold-eyebrow header (Space Mono), bigger 14px value input with gold $ prefix, faint gradient backdrop. Reinvest toggle pill refined (font-weight 700, drop shadow on green dot, hover lift). "Edit with AI" sidebar row rebuilt with gold-tinted icon container (22×22 rounded square), Space Mono uppercase label, 2px gold left-rail accent when expanded. SavedPortfolios got gold-eyebrow "SAVED" header + premium "Save" pill button with plus icon, and chip cards now have 2px gold border-left accent on hover with 1px translateX lift.
- Modals standardization — `InfoModal` (gold eyebrow + Space Mono 18px title + 28×28 gold-hover close) pattern applied to: ShareImageModal, dashboard customizer, NL edit preview (now has a real title — "Preview impact" or "Review changes"), Presets modal, CSV import modal, WhatIfDrawer. All eyebrows now use letter-spacing 0.22em + var(--font-mono). All close buttons standardized to 28×28 with `var(--bg3)` background + gold border-color/color on hover.
- App top bar premium pass (incremental on v0.26) — backdrop-blur(14px) + saturate(140%), shadow gained 4% gold tint at top edge. Active tab underline now has a 3-stop gold gradient (60%→100%→60%) for a soft glow taper, plus secondary inner shadow. Inactive tabs gain a 3% gold-tinted background on hover + brighten to var(--text). Alert bell, dark-mode toggle, and Export pill all gained gold-accent hover (border + color + background) — Export shifts to gold pill when open. Alert dot got a 6px gold glow.
- Loading / "analyzing" state — `AnalysisSteps` rebuilt. New 84px ambient orb up top: two rotating gold orbit rings (8s + 14s reverse), inner 56px gold sphere with radial gradient + pulsing box-shadow + Corvo star icon with drop shadow. New gold eyebrow "ANALYZING PORTFOLIO" + Space Mono 17px headline that swaps to the active step with a 0.4s fade-in. Step rows now show an active state — gold-tinted circle with breathing pulse, 0 0 10px gold glow, three animated trailing dots. Active step label brightens to var(--text) at weight 600. Done rows fade to opacity 0.65 (was 1).
- 404 / not-found / global error pages — both rebuilt to brand language. `app/not-found.tsx` now has a Corvo-logo orb with two rotating gold rings + pulse animation, gold "ERROR 404" eyebrow, gold→half-amber linear-gradient text-clip on the 404 numeral, Space Mono headline, premium gold CTA with drop shadow. `app/global-error.tsx` upgraded from default sans-serif div to red-orb-with-warning-triangle pattern, "UNEXPECTED ERROR" eyebrow, Space Mono headline, copy now mentions "Corvo hit an unexpected error" + that the issue was reported, premium gold Reload button.
- Bottom toolbar buttons (AI / Feedback / Customize, 48×48 fixed bottom-right) — all three lift on hover via Framer Motion (`whileHover={{ y: -1 }}`), tap-shrink via `whileTap`. AI Chat button now uses a 155° amber→gold→darker-gold linear gradient with inner-top white highlight, 24px gold drop shadow → 32px gold drop shadow + 4px gold ring + brighter inner highlight on hover, text-shadow on the "AI" label. Feedback + Customize gain matching premium hover (gold-tint background + gold border + gold color + gold ring shadow + 0.04 inner highlight). FeedbackModal header standardized to InfoModal pattern (gold eyebrow + Space Mono 18px title + 28×28 gold-hover close).
- Settings row-level UI controls — Toggle redesigned: 40×22 with gold linear-gradient background when on, 1px gold-tinted ring + 12px gold glow + inset shadow + 0.5px gold border, knob 17×17 with subtle off-white gradient + deeper drop shadow + hairline outer-stroke. Period selector now a single segmented pill (3px padding, var(--bg3) background, 0.5px border) with the active option getting a solid gold pill + 0.4 letter-spacing + 8px gold drop shadow; inactive options hover-brighten. inputStyle / selectStyle gained `transition` and now get a gold focus ring (0.55 border + 3px gold halo + bg2 background) and var(--border2) on plain hover via a global `.s-content` CSS rule. btnOutline gained gold border + gold color + gold-tinted background on hover via `.s-btn-outline`. btnSave got 12px gold drop shadow + transform-translateY hover lift + 18px gold drop shadow on hover via `.s-btn-save`. Row label promoted from 500 to 600 weight with -0.1 letter-spacing; desc copy gets 1.5 line-height.
- AI Chat panel — second polish pass on top of v0.26. Header icon buttons (history / export / close) gained var(--bg3) background + premium gold-tinted hover (border + background + color). Context bar toggle bumped from 28×16 plain pill to 30×17 with green linear-gradient + 1px green ring + 8px green glow + inset shadow + premium knob with subtle gradient/outline-stroke; matches Settings Toggle spec. Empty-state suggestion chips lift on hover (`y: -1`), get gold-tinted border + gold-tinted background + brighter text. "Refresh suggestions" link got a proper SVG refresh icon and gold-hover pill background. Message-limit modal upgraded to InfoModal pattern (gold "AI Chat" eyebrow + Space Mono 18px "Message limits" title + 28×28 gold-hover close), inner sections now use gold mini-eyebrows + per-item descriptions, usage bar gained 6px colored glow, "Copy referral link" button gained 14px gold drop shadow + hover translateY-lift. Chat-history sidebar "Chat History" label promoted to gold Space Mono eyebrow with 0.22em letter-spacing; mobile close went from 44×44 transparent to 28×28 bg3 + gold hover. "New Chat" button got tighter hover state (border + bg both gold-tint) and weight bumped to 700.

### v0.26 (May 11, 2026)
- Auth page rebuilt — 56px gold-tinted logo container, "Welcome back / Get started / Magic link / Reset password" headline above tagline ("The advisor watching over your portfolio"), bigger card (460px, 44/40 padding, layered shadow + gold top-edge accent), mode tabs use solid amber active state, OAuth buttons hover with gold accent, primary CTA has gold drop shadow + hover lift, inputs have 4px gold focus glow.
- AI chat polished — header rebuilt with gold-tinted Corvo logo + two-line "Corvo / AI ADVISOR" title (was plain "Corvo AI" text). Empty state: gold "ALWAYS WATCHING" eyebrow + 17px Space Mono headline + 58px logo container with inner glow. Input grew to 42px min-height with 3px gold focus ring; the plain-text "SEND" button became a 42×42 amber square with a paper-plane SVG icon + drop shadow + hover lift.
- App top bar premium upgrade — height 52→56px, backdrop-blur(12px), subtle drop shadow. Active tab underline 2→2.5px thick with amber glow. Active tab fontWeight 600→700 with tighter letter-spacing. Inactive tabs hover-lighten.
- Pricing page rebuilt — feature lists updated to match v0.25 product reality (removed Paper Trading + Watchlist; added Daily Signal, Goal Tracker, three-beat AI Health Score, morning brief + PWA push). New floating "MOST POPULAR" gold pill badge on Pro card. Plan names promoted to 28→25px Space Mono, prices to 56→48px. Subtle vertical gold gradient on Pro card. Killed `amberPulse` animation. Cards lift +6px on hover with deepened shadows. Made cards slightly smaller across the board (max-width 440→400).
- Public page section padding rhythm matched to homepage features section — pricing/install/faq/about/changelog all now use 80–140px top + bottom on sections (was 0–80px). Mobile rules scaled proportionally.
- Changelog timeline redesigned — vertical alternating cards → horizontal scroll-snap of 5 thematic chapters (Foundations / Smart & Connected / Mobile, Auth & Math / Income, Email & Tools / The Guardian Era). Solid amber line through dots, card hover lift, dot scale on hover.
- Account page: removed Quick Links section (destinations reachable from global nav).
- Default portfolio value 10k → 50k for new users (dashboard, homepage demo widget, PortfolioBuilder). Existing users keep their stored value.
- Bug fix — /watchlist-data backend was returning `0` for missing yfinance data, making the dashboard render "+0.00%" instead of "--". Now falls back to `t.info` regularMarketPrice/PreviousClose, and returns nulls when both sources fail. Frontend stops coercing nulls to 0. Fixed math bug in portfolioToday averaging.
- Auth flow not changed — same Supabase OAuth + magic link + Turnstile captcha, just sharper UI.

### v0.25 (May 11, 2026)
- App UI overhaul: features-page design language applied across every authenticated tab. New `SectionHeader` component (gold eyebrow + Space Mono headline) with scroll-reveal. Dashboard split into 4 named regions (Overview / Analysis / Intelligence / Composition). Positions, Stocks, Simulations tabs all upgraded with the same pattern.
- Shared component polish: `_CARD_BASE` refined (14px radius, 22-24px padding), `TooltipCardHeader` rebuilt (sentence-case title + optional eyebrow), `InfoModal` upgraded, `IconBtn` with gold-accent hover, performance period selector promoted to premium pill group.
- Marketing + profile pages: Install/Changelog/FAQ hero badges get pulsing gold dot. Settings/Referrals/Account sections rebuilt with gold accent stripe + Space Mono headlines.
- Homepage rewrite — "your portfolio's guardian" positioning. New headline "The advisor watching over your portfolio." Hero stats swap "AI Insights" for "Risks Flagged". New pulsing red "Risk flagged · Tech > 60%" floating chip. Features section reframed as "Always watching" / "What Corvo watches for you". Final CTA → "Let Corvo watch your back." Hero scaled up to clamp(32-60px) headline with larger metric cards.
- AI quality pass: sharpened Corvo voice across chat, Daily Signal, and AI Insights prompts. All three now identity-reframed as "the AI advisor watching over your portfolio" with explicit 3-beat structure (what I see / why it matters / what to consider), banned hedging filler.
- Security sweep: closed 2 IDOR vulnerabilities (`/portfolio/tax-loss-alert/{user_id}` and `/price-alerts/{alert_id}` DELETE both now JWT-verify caller matches user_id). Fixed RESEND_API_KEY prefix leak in startup logs. Removed raw Supabase error leakage from `/user` DELETE. Added rate limit to tax-loss-alert. Stripped 14 verbose console.log statements from dashboard auto-load.
- Empty/error states: branded design with gold-tinted icon containers, Space Mono titles, gold-accent CTAs. Default error copy explains Railway cold starts.
- Mobile polish: SectionHeaders shrink at ≤768px, customizer collapses to 1 column, homepage risk chip auto-hides via `.hero-metric-card`.
- Onboarding simplified: 11 steps → 8 (age+income combined, risk+horizon combined, life events removed).
- Dashboard tour cut: 9 stops → 5 desktop (6 → 4 mobile). AI advisor card is the final highlight.
- Dashboard customizer redesigned: 540px, 2-col grid, grouped Overview/Analysis/Other, all 14 cards individually toggleable.

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

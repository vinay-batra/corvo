# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

`StockDetail.tsx` has its own internal tab switcher between "Overview" and "Options Chain". The `OptionsChain` component (inside the same file, lines ~120-380) fetches from `GET /options/{ticker}`, renders calls/puts tables with ITM highlighting, delta column, per-column tooltips, and a Max Pain section. This is complete — do not rebuild it.

The backend tries Finnhub first (`/api/v1/stock/option-chain`), falls back to yfinance. Black-Scholes delta is always computed via `_bs_delta` (uses `_norm_cdf` / `math.erf`, no scipy needed).

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
- Version: v0.20

## Deployment

- **Frontend**: push to `main` — Vercel auto-deploys
- **Backend**: push to `main` — Railway auto-deploys from `startCommand` in `railway.toml` (`cd backend && uvicorn main:app ...`)
- **Railway path caveat**: Railway's working directory is the repo root, so the start command explicitly `cd backend`. If you ever see 404s on all routes, the file Railway is running is not `backend/main.py`.

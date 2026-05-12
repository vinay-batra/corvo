# Corvo

### The advisor watching over your portfolio.

[Live Site](https://corvo.capital) · [Changelog](https://corvo.capital/changelog) · Next.js 16 · FastAPI · Supabase · All Rights Reserved

Current release: **v0.29** (May 11, 2026)

---

## What is Corvo?

Corvo is a free, AI-powered portfolio intelligence platform built for retail investors who are tired of dashboards that show numbers without telling them what those numbers mean. Most portfolio tools are built around data display. Corvo is built around advice: every insight surfaces not just what is happening in your portfolio, but why it matters to you specifically and what you should consider doing about it. Whether you want to stress-test your holdings with Monte Carlo simulation, understand your tax exposure before year-end, get a morning briefing on overnight moves, or simply ask "what should I do today?" - Corvo gives you a direct, personalized answer, not a spreadsheet to interpret yourself.

---

## Features

### Portfolio Analysis
- Live portfolio value display: base × today's % change, with delta dollars and percent visible on the dashboard and the sidebar input
- CAGR across selectable time periods, for both the portfolio and individual holdings
- Sharpe ratio computed with the live `^IRX` T-bill rate as the risk-free rate
- Portfolio health score graded across returns, risk, stability, and resilience
- Max drawdown, alpha, beta, and volatility
- Monte Carlo simulation with exactly 8,500 paths and a 1 to 30 year projection horizon
- Benchmark comparison versus the S&P 500, NASDAQ, and Dow Jones
- Sector exposure breakdown with visual allocation chart
- Correlation heatmap across all holdings
- What-If analysis to test portfolio changes side by side before committing

### AI Tools
- AI portfolio chat powered by Claude with full portfolio context, web search, persistent history, and conversation management
- Daily Signal: a single AI-generated, actionable recommendation each day across 8 categories (Risk Alert, Rebalance, Tax Opportunity, Earnings Watch, Benchmark Lag, Protect Gains, Diversify, Strong Hold) with headline, rationale, impact chips, numbered steps, and confidence tooltip
- Morning briefing: a daily AI-generated summary of macro news and portfolio-relevant developments (defaults to collapsed; expand via chevron)
- "What should I do today?" - a single-click, direct action recommendation based on your current holdings
- Rebalance assistant with target allocation suggestions and drift analysis
- Natural language portfolio editor: describe a change in plain English and Corvo applies it
- Earnings impact preview: AI analysis of how upcoming earnings could affect your positions
- Goal Tracker: projects retirement and milestone savings with Monte Carlo

### Simulations
- Monte Carlo engine running exactly 8,500 paths per simulation
- 1 to 30 year projection horizon with percentile bands
- Retirement simulator with configurable spending, contribution, and target balance
- Advanced settings for return assumptions, inflation rate, and withdrawal strategy

### Income and Tax
- Dividend Calendar with 90-day ex-date lookahead, early-warning flags, and projected income total
- Capital Gains Estimator with LT/ST auto-classification, configurable LTCG tax bracket, and per-ticker insights
- Tax-loss harvesting signals with correlated replacement suggestions

### Installation
- `/install` page with platform-specific guides, animated device mockups, and an interactive demo strip

### Market Data
- Options chain viewer with calls and puts, ITM highlighting, delta column, and max pain
- Insider trading tracker showing recent SEC filings for held stocks
- Analyst price targets with consensus rating and upside/downside to current price
- Watchlist with live quotes, 7-day sparklines, and configurable price alerts

### Notifications and Email
- Morning briefing email delivered before market open
- Market close summary with daily portfolio performance
- Week in Review delivered every Sunday
- Monthly portfolio summary with rolling performance metrics
- Price alerts with browser push notification support
- All email preferences individually configurable from the settings page

### Learn (hidden from main nav as of v0.24, code preserved)
- XP system with 15 progression levels
- Structured lessons with worked examples across investing, options, tax, and risk topics
- Daily challenges with timed scoring
- Global leaderboard backed by a column-restricted `get_leaderboard` SECURITY DEFINER RPC (no profile-column leaks)
- Arcade with financial mini-games

### Branding
- Gold raven head + rising arrow logo (since v0.29). Master at `frontend/public/corvo-logo.png` (717×717 transparent PNG)
- Full favicon and home-screen icon set: 16, 32, 48, 180, 192, 512 px PNGs + multi-resolution `favicon.ico`
- Open Graph card (`og-image.png`, 1200×630) and social profile picture (`corvo-pfp.png`, 400×400)

### Navigation Structure (as of v0.29)
- **Public nav** is the shared `PublicNav` component used on every public page including the homepage. 68 px height, content-aligned inner container (matches the hero's 1240 max-width). 7 flat top-level links: Features (homepage anchor) · Install · Pricing · Changelog · Blog · About · FAQ. Theme toggle and Get Started rounded pill on the right. Scroll-aware hide on scroll down / show on scroll up (driven by `requestAnimationFrame` polling - works uniformly on the homepage's 100vh container and on regular `window`-scrolling pages).
- **Dashboard tabs**: Dashboard · Positions · Stocks · Simulations · News
- The Dashboard tab itself is split into four scroll-revealed regions: Overview (daily brief, Today's Signal, "What should I do today?"), Analysis (metrics, performance, goal), Intelligence (health, AI insights, vs benchmark), Composition (allocation, sector, insider)
- Income & Tax and Transactions are sections within the Positions tab - not standalone tabs
- Paper Trade was removed from the product in v0.24 and the routes, frontend component, and Supabase tables were fully purged in v0.28
- Watchlist and Learn tabs are hidden from the active `TABS` list in v0.24 (component code preserved)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Framer Motion, Recharts, Plotly |
| Animations | GSAP (ScrollTrigger, SplitText) loaded dynamically, IntersectionObserver-based `ScrollReveal` helper |
| Backend | FastAPI (Python), single-file `backend/main.py` |
| Database | Supabase (PostgreSQL) with Row-Level Security and `get_leaderboard` SECURITY DEFINER RPC |
| Auth | Supabase Auth with Cloudflare Turnstile CAPTCHA, JWT-verified per-request via `_verify_jwt_user` helper |
| AI | Anthropic Claude (`claude-sonnet-4-6`) with streaming and `web_search` tool |
| Market Data | yfinance, Finnhub fallback for news |
| Email | Resend (morning briefing, week in review, monthly summary, market close summary, price alerts) |
| Push | VAPID web push |
| Error Monitoring | Sentry (client, server, edge) |
| Frontend Hosting | Vercel (auto-deploys on push to `main`) |
| API Hosting | Railway (manual `railway up` - GitHub auto-deploy is unreliable, `[build].watchPatterns` in `railway.toml` is scoped to `backend/**` so frontend pushes don't trigger build attempts) |

---

## Live Demo

**[corvo.capital](https://corvo.capital)** -- free, no subscription required. Sign up with email or Google and your portfolio is live in under a minute.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project
- An Anthropic API key

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in the environment variables listed below
npm run dev
# Runs at http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in the environment variables listed below
uvicorn main:app --reload --port 8000
# Runs at http://localhost:8000
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
RESEND_API_KEY=your_resend_api_key
```

### Backend (`backend/.env`)

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FINNHUB_API_KEY=your_finnhub_api_key
RESEND_API_KEY=your_resend_api_key
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
ALLOWED_ORIGINS=http://localhost:3000
```

`FINNHUB_API_KEY`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required for the email system (morning briefing, week in review, monthly summary) and price alerts to function in production.

---

## Key Backend Endpoints

| Route | Description |
|---|---|
| `GET /portfolio` | Main analysis: Sharpe, CAGR, VaR, correlation, sector, etc. |
| `GET /options/{ticker}?date=` | Options chain, 15-min cache |
| `GET /stock/{ticker}` | Fundamentals and analyst ratings |
| `GET /news?tickers=` | News with Finnhub fallback |
| `POST /chat` | Claude-powered AI chat, rate-limited, streaming |
| `GET /market-brief` | Cached AI market summary (5-min TTL) |
| `GET /earnings-calendar` | Upcoming earnings (60-day window) |
| `GET /events-calendar` | Macro events calendar |
| `GET /portfolio/tax-loss-alert/{user_id}` | Tax loss harvesting detection and alerts |
| `GET /earnings-preview` | AI analysis of upcoming earnings impact on holdings |

---

## Deployment Notes

- **Frontend**: push to `main` - Vercel auto-deploys
- **Backend**: always deploy manually via the canonical sequence below - Railway's GitHub integration is unreliable. The repo's `railway.toml` scopes `watchPatterns` to `backend/**`, `railway.toml`, and `Procfile` so frontend pushes do not trigger broken auto-build attempts.
- **Canonical Railway deploy:**
 ```bash
 mkdir -p /tmp/corvo-deploy2/backend \
 && cp ~/Downloads/portfolio_v2/backend/main.py /tmp/corvo-deploy2/backend/ \
 && cp ~/Downloads/portfolio_v2/backend/requirements.txt /tmp/corvo-deploy2/backend/ \
 && cd ~/Downloads/portfolio_v2 \
 && railway up --detach --path-as-root /tmp/corvo-deploy2
 ```
- Railway starts the service with `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` (defined in `railway.toml`). Never run `railway up` from inside `/backend` - the canonical sequence shapes the upload root to include a `backend/` subdir so the start command resolves correctly.
- **Supabase migrations**: live in `supabase/migrations/`. Apply via `supabase db push` (CLI must be installed and project linked) or paste manually into the Supabase dashboard SQL editor. Files without a `<timestamp>_name.sql` prefix are silently skipped by `db push` - name new migrations with a timestamp prefix.

---

## License

Copyright (c) 2026 Vinay Batra. All rights reserved.

---

## Built By

Built by Vinay Batra, a sophomore in high school, because every portfolio tool was either expensive, outdated, or ugly.

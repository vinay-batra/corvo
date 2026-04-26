# Corvo — Free Portfolio Analytics & AI Investing Tools

Institutional-grade portfolio analytics for retail investors. Free, no subscription required.

**Live at [corvo.capital](https://corvo.capital)**

---

## What is Corvo?

Corvo is a free, AI-powered portfolio analytics platform that gives retail investors access to quantitative analysis tools previously limited to institutional software. Connect to live market data, run risk models, simulate outcomes, and get AI-driven insights — no setup, no subscription.

Upload a portfolio via CSV or build one manually. Corvo handles the rest.

---

## Features

### Portfolio Analysis
- CAGR (1Y) for portfolio and individual holdings
- Sharpe ratio using the live ^IRX T-bill rate, volatility, alpha, beta, max drawdown
- Monte Carlo simulation (8,500 paths) for projected outcomes
- Portfolio health score across returns, risk, stability, and resilience
- Benchmark comparison vs. S&P 500 (^GSPC), NASDAQ (^IXIC), Dow (^DJI)
- Sector exposure breakdown and correlation heatmap
- What-If analysis — test portfolio changes side by side
- Cash and money market position support (VMFXX, SPAXX, FDRXX, and XX-suffix tickers)

### AI Tools
- AI portfolio chat with full portfolio context, persistent history, rename/delete (Claude-powered)
- AI market brief — daily macro and portfolio-relevant news summary
- AI insights — plain-English analysis of holdings

### Tracking
- Watchlist with live prices and 7-day sparklines
- Price alerts with browser push notifications
- Dividend calendar
- Tax-loss harvesting signals

### Education
- Learn tab with XP system and 15 progression levels
- Daily challenges with a global leaderboard
- Challenge Mode — timed and scored
- Arcade: 6 financial mini-games
- Hand-crafted lessons with worked examples

### Platform
- PWA — installable on desktop and mobile
- CSV import; PDF and CSV export with metric cards, benchmark comparison, and investor profile
- Light and dark mode
- Cloud sync across devices
- Multi-currency support (USD, GBP, EUR, JPY, CAD)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Framer Motion, Recharts, Supabase SSR |
| Backend | FastAPI (Python), Railway, yfinance, Anthropic Claude API |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth with Cloudflare Turnstile CAPTCHA |
| Email | Resend |
| Frontend Hosting | Vercel |
| API Server | Railway |
| DNS / Security | Cloudflare |

---

## Architecture

```
Browser
  └─ Next.js (Vercel)
       ├─ /app          — React Server + Client Components (App Router)
       ├─ /api          — Next.js API routes (auth callbacks, proxying)
       └─ Supabase SSR  — session management, row-level security

FastAPI (Railway)
  ├─ /portfolio        — analytics engine (Sharpe, drawdown, Monte Carlo)
  ├─ /ai               — Claude API integration
  ├─ /stocks           — market data fetching and caching
  └─ /stats            — live user metrics

Supabase
  ├─ Auth              — magic link, Google, GitHub, Turnstile
  ├─ portfolios        — cloud-saved portfolio state
  └─ challenges        — daily challenge scores and leaderboard
```

```
portfolio_v2/
├── frontend/          # Next.js application
│   ├── app/
│   │   ├── app/       # Main dashboard and analyzer
│   │   ├── learn/     # Education platform
│   │   ├── auth/      # Authentication flows
│   │   └── settings/  # User settings
│   └── components/    # Shared UI components
└── backend/           # FastAPI server
    └── main.py        # All API endpoints
```

---

## Supabase Client and Middleware

**Always import the Supabase client from `frontend/lib/supabase.ts`.** Never instantiate a client inline. Inline clients omit `cookieOptions` and will drop sessions on browser close.

**`frontend/middleware.ts` must exist** and call `supabase.auth.getUser()` on every request. Without it, SSR pages receive expired JWTs and users are silently logged out. If you delete or rename this file, auth will break in production even if it appears to work locally.

---

## Local Development

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in environment variables (see below)
npm run dev
# Runs at http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in environment variables (see below)
uvicorn main:app --reload
# Runs at http://localhost:8000
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
RESEND_API_KEY=your_resend_api_key
```

### Backend (`backend/.env`)

```
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALLOWED_ORIGINS=http://localhost:3000
```

---

## License

Licensed under the [Business Source License 1.1](LICENSE).
You may view and reference the code, but may not use it to build a competing commercial product.
Converts to the MIT License on **2029-04-08**.

---

Built by [Vinay Batra](https://www.linkedin.com/in/vinay-batra/)

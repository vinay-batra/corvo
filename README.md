# Corvo — Free Portfolio Analytics & AI Investing Tools

Institutional-grade portfolio analytics for retail investors. Free.

**Live at [corvo.capital](https://corvo.capital)**

---

## What is Corvo?

Corvo is a full-stack portfolio analytics platform that gives retail investors access to the kind of analysis previously reserved for institutional tools. It connects to live market data, runs quantitative risk models, and uses AI to surface actionable insights — all without a subscription fee.

Upload a portfolio via CSV or build one manually, and Corvo handles the rest: risk-adjusted performance metrics, Monte Carlo simulations, AI chat, dividend tracking, tax-loss harvesting signals, and a built-in financial education platform with a progression system.

---

## Features

### Portfolio Analysis
- Sharpe ratio (using live ^IRX T-bill rate), volatility, alpha, beta, max drawdown
- CAGR (1Y) for portfolio returns and individual holdings
- Monte Carlo simulation (8,500 paths) for projected outcomes
- Portfolio health score across returns, risk, stability, and resilience
- Benchmark comparison vs. S&P 500 (^GSPC), NASDAQ (^IXIC), Dow (^DJI)
- Sector exposure breakdown and correlation heatmap
- What-If mode — test portfolio changes side by side
- Cash and money market position support (VMFXX, SPAXX, FDRXX, and XX-suffix tickers)

### AI Tools
- AI portfolio chat with persistent history, rename/delete, and real-time market context (Claude-powered)
- AI market brief — daily summary of macro and portfolio-relevant news
- AI insights — plain-English analysis of your holdings
- AI practice questions — infinite drill mode for financial concepts

### Tracking
- Watchlist with live prices and 7-day sparklines
- Price alerts with browser push notifications
- Dividend tracker
- Tax-loss harvesting signals

### Education
- Learn tab with XP system and 15 progression levels
- Daily challenges with a global leaderboard
- Challenge Mode — timed and scored
- Arcade: 6 financial mini-games
- Hand-crafted lessons with worked examples

### Platform
- PWA — installable on desktop and mobile
- CSV import; PDF export with metric cards, benchmark comparison, and investor profile
- Dark and light mode with theme toggle on all pages
- Referral system
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

## Getting Started

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

## Status

**Current version:** v0.16 (beta)

Targeting v1.0 with the following remaining work:
- Mobile layout fixes
- Options chain viewer
- Paper trading

---

## License

Licensed under the [Business Source License 1.1](LICENSE).
You may view and reference the code, but may not use it to build a competing commercial product.
Converts to the MIT License on **2029-04-08**.

---

Built by [Vinay Batra](https://www.linkedin.com/in/vinay-batra/)

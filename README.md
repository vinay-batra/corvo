# Corvo — Portfolio Intelligence

> Your portfolio. Intelligently analyzed.

Corvo is a full-stack portfolio analytics platform that replaces the need for Bloomberg, Yahoo Finance, and Robinhood's research tools — without the cost. Built for serious retail investors who want institutional-grade analysis.

Stop guessing. Start knowing exactly what your money is doing and why.

**Live at [corvo.capital](https://corvo.capital)**

---

## Features

### Portfolio Analytics
- Sharpe ratio, volatility, max drawdown, alpha, beta
- Monte Carlo simulation with 300+ paths
- Health score across returns, risk, stability, resilience
- Benchmark comparison vs S&P 500, NASDAQ, and more
- What-If mode — test portfolio changes side by side

### Stock Research
- Full stock detail: price, financials, analyst ratings, news
- Compare up to 4 stocks simultaneously with normalized charts
- Correlation heatmap between holdings
- Live prices injected into every AI response

### AI-Powered Insights
- Claude-powered chat with real-time market context
- Plain-English portfolio analysis
- Rebalancing suggestions based on your goals

### Financial Education
- 8 hand-crafted lessons with worked examples
- AI-generated practice questions (infinite drill mode)
- Challenge Mode — timed, scored, leaderboard
- XP system, streaks, level progression (Beginner → Master)
- 6 financial mini-games

### Watchlist & Alerts
- Live prices with 7-day sparklines
- Browser push notifications for price alerts
- One-click add from any stock detail view

### Platform
- Dark/light mode
- Multi-currency (USD, GBP, EUR, JPY, CAD)
- CSV + PDF export
- Portfolio sharing via URL
- Goal tracking — retirement age, salary, and contribution targets with on-track status
- Universal search — any stock, ETF, or crypto worldwide; screenshot import for Fidelity, Robinhood, and Schwab
- Cloud sync — portfolios saved to your account, accessible anywhere
- Mobile responsive

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | [Next.js](https://nextjs.org) 16, TypeScript, Tailwind, Framer Motion, Plotly |
| Backend | [FastAPI](https://fastapi.tiangolo.com) (Python 3.13), yfinance, Anthropic SDK |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Auth | Supabase Auth — Google, GitHub, Magic Link |
| Emails | Resend |
| Frontend Hosting | [Vercel](https://vercel.com) |
| API Server | [Railway](https://railway.app) |

---

## Architecture

```
Browser
  └─ Next.js (Vercel)
       ├─ /app          — React Server + Client Components
       ├─ /api          — Next.js API routes (auth callbacks, proxying)
       └─ Supabase SSR  — session management, row-level security

FastAPI (Railway)
  ├─ /portfolio        — analytics engine (Sharpe, VaR, drawdown, Monte Carlo)
  ├─ /ai               — Claude API integration for portfolio analyst
  ├─ /stocks           — market data fetching & caching
  └─ /stats            — live user metrics

Supabase
  ├─ Auth              — magic link + OAuth
  ├─ portfolios        — cloud-saved portfolio state
  └─ challenges        — daily challenge leaderboard
```

Data flows: the browser fetches session-gated data from the FastAPI backend on Railway; the backend calls market data APIs and the Anthropic API. Supabase handles auth tokens and persistent user data.

**Directory structure:**

```
corvo/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── app/       # Main analyzer
│   │   ├── learn/     # Education platform
│   │   ├── auth/      # Authentication
│   │   └── settings/  # User settings
│   └── components/
└── backend/           # FastAPI server
    └── main.py        # All API endpoints
```

---

## Local Development

```bash
# Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in Supabase + API keys
npm run dev                   # http://localhost:3000

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in keys
uvicorn main:app --reload     # http://localhost:8000
```

---

## License

This project is licensed under the [Business Source License 1.1](LICENSE).  
You may view and reference the code, but may not use it to build a competing commercial product.  
The source converts to the MIT License on **2029-04-08**.

---

Built by [Vinay Batra](https://www.linkedin.com/in/vinay-batra/)

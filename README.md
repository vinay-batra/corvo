# Corvo

### Your portfolio, with a point of view.

[Live Site](https://corvo.capital) · [Changelog](/CHANGELOG.md) · Next.js · FastAPI · Supabase · All Rights Reserved

---

## What is Corvo?

Corvo is a free, AI-powered portfolio intelligence platform built for retail investors who are tired of dashboards that show numbers without telling them what those numbers mean. Most portfolio tools are built around data display. Corvo is built around advice: every insight surfaces not just what is happening in your portfolio, but why it matters to you specifically and what you should consider doing about it. Whether you want to stress-test your holdings with Monte Carlo simulation, understand your tax exposure before year-end, get a morning briefing on overnight moves, or simply ask "what should I do today?" -- Corvo gives you a direct, personalized answer, not a spreadsheet to interpret yourself.

---

## Features

### Portfolio Analysis
- CAGR across selectable time periods, for both the portfolio and individual holdings
- Sharpe ratio computed with the live `^IRX` T-bill rate as the risk-free rate
- Portfolio health score graded across returns, risk, stability, and resilience
- Max drawdown, alpha, beta, and volatility
- Monte Carlo simulation with 8,500 paths and a 1 to 30 year projection horizon
- Benchmark comparison versus the S&P 500, NASDAQ, and Dow Jones
- Sector exposure breakdown with visual allocation chart
- Correlation heatmap across all holdings
- What-If analysis to test portfolio changes side by side before committing

### AI Tools
- AI portfolio chat powered by Claude with full portfolio context, web search, persistent history, and conversation management
- Morning briefing: a daily AI-generated summary of macro news and portfolio-relevant developments
- "What should I do today?" -- a single-click, direct action recommendation based on your current holdings
- Rebalance assistant with target allocation suggestions and drift analysis
- Natural language portfolio editor: describe a change in plain English and Corvo applies it
- Earnings impact preview: AI analysis of how upcoming earnings could affect your positions

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

### Learn
- XP system with 15 progression levels
- Structured lessons with worked examples across investing, options, tax, and risk topics
- Daily challenges with timed scoring
- Global leaderboard updated in real time
- Arcade with financial mini-games

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Framer Motion, Recharts, Plotly |
| Backend | FastAPI (Python), deployed on Railway |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth with Cloudflare Turnstile CAPTCHA |
| AI | Anthropic Claude (claude-sonnet-4-6) with streaming and web search |
| Market Data | yfinance, Finnhub |
| Email | Resend |
| Frontend Hosting | Vercel |
| API Hosting | Railway |

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

## License

Copyright (c) 2026 Vinay Batra. All rights reserved.

---

## Built By

Built by Vinay Batra, a sophomore in high school, because every portfolio tool was either expensive, outdated, or ugly.

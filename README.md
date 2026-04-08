# Corvo — Portfolio Intelligence

> Your portfolio. Intelligently analyzed.

Corvo is a full-stack portfolio analytics platform that replaces the need for Bloomberg, Yahoo Finance, and Robinhood's research tools — without the cost. Built for serious retail investors who want institutional-grade analysis.

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
- Mobile responsive

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind, Framer Motion, Plotly |
| Backend | FastAPI, Python 3.13, yfinance, Anthropic SDK |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google, GitHub, Magic Link |
| Emails | Resend |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Architecture

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

---

## License

This project is licensed under the [Business Source License 1.1](LICENSE).  
You may view and reference the code, but may not use it to build a competing commercial product.  
The license converts to MIT on April 8, 2029.

---

Built by [Vinay Batra](https://www.linkedin.com/in/vinay-batra/)

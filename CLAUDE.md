---

## PRODUCT PHILOSOPHY

**Corvo is an advisor, not a tool.**

The difference: tools show data. Advisors tell you what it means and what to do.

- WRONG: "Your Sharpe ratio is 2.88"
- RIGHT: "Your Sharpe ratio is 2.88 — that's exceptional. You're getting strong returns without taking on much risk. Your main risk right now is NVDA concentration. If AI sentiment shifts, you could see a 15%+ drawdown. Consider trimming to 15% and rotating into something uncorrelated like BND."

Every AI output in Corvo — insights, morning briefing, digest, chat, alerts, tour cards — must follow this pattern:
1. Here is what is happening
2. Here is why it matters for YOUR portfolio specifically
3. Here is what you should consider doing

Never show a number without explaining what it means. Never explain what something means without suggesting an action. Be specific, be direct, be personal.

---

## MASTER ROADMAP

1. Digest email fix (weekly stats N/A — blocked by Railway, switch to Finnhub when Railway is stable)
2. "What should I do today?" button — AI scans portfolio + market, gives 2-3 specific actions
3. Corvo Score — single 0-100 daily portfolio score with specific explanation
4. Options chain viewer — tab on stock detail page, yfinance data
5. Rebalance assistant — detects drift, tells you exactly what to buy/sell
6. Price target tracker — per holding, alerts when hit with action recommendation
7. Analyst price targets — consensus target vs current price for each holding
8. Tax loss harvesting alerts — proactive, specific to your situation
9. Earnings call AI summaries — transcript to what it means for your holdings
10. Earnings impact preview — before reports, tell user their exposure and likely move
11. Insider trading tracker — SEC Form 4 filings for your holdings
12. Market close summary — daily "here's how you did" push after 4pm ET
13. Push notifications for morning briefing — 9am daily
14. Weekly portfolio checkup — specific verdict, not just stats
15. "What if I retire in X years" — Monte Carlo in plain English
16. SMS alerts
17. Paper trading simulation
18. Peer/portfolio comparison — anonymized performance vs other Corvo users
19. Brokerage sync via Plaid — blocked until user is 18 or parent signs up
20. Pro tier — unlimited AI chat, real-time alerts, custom PDF, SMS, brokerage sync
21. Custom branded PDF reports — Pro feature
22. Natural language portfolio editor — "sell half my NVDA, put it in QQQ"
23. Life event integration — "I'm buying a house in 2 years" adjusts risk recommendations
24. Push notification advisor — full advice with context, not just price alerts
25. Community portfolios — follow anonymous top performers, see their moves
26. Corvo for advisors — B2B, manage multiple client portfolios
27. Marketing
28. YC application
29. App Store — iOS
30. Google Play — Android

---

# Corvo — Project Context

## Stack
- Frontend: Next.js, deployed on Vercel — ~/Downloads/portfolio_v2/frontend
- Backend: FastAPI, deployed on Railway — ~/Downloads/portfolio_v2/backend/main.py (4000+ lines)
- Database: Supabase
- Railway URL: web-production-7a78d.up.railway.app
- Live site: corvo.capital
- GitHub: vinay-batra/corvo

## Critical Rules — Never Break These
- initial={false} on ALL motion.* components, every single one, no exceptions — add comment "// initial={false} required — do not remove"
- No emojis anywhere in the app
- No em dashes anywhere — not in code, not in AI responses, not in copy
- No asterisks in AI responses
- Space Mono font for all numbers and monospace text
- All colors use CSS variables only — never hardcode dark colors
- SVG icons only — no emoji icons
- Always add "Commit and push." to the end of every Claude Code prompt
- Vinay uses Claude Code inside VS Code, not standalone terminal

## Mobile Rules
- All mobile fixes must use max-width: 768px
- Never touch desktop styles when fixing mobile
- Desktop is the source of truth — mobile adapts to it

## File Structure
- Frontend: frontend/app/ for pages, frontend/components/ for components
- Backend: backend/main.py (single file, 4000+ lines)
- The homepage (corvo.capital) has its own inline nav in frontend/app/page.tsx — separate from PublicNav.tsx
- Railway root is /backend, actual code is in backend/main.py

## CSS Variables
- --bg, --bg2, --bg3, --card-bg, --border, --border2
- --text, --text2, --text3, --text-muted
- --accent (#c9a84c dashboard, #b8860b dark, #8b6914 light)
- Themes set via [data-theme="dark"] and [data-theme="light"] in globals.css
- Light mode is the default for new/logged-out users

## Current Version
v0.18 — last updated April 25, 2026

## Todo List (in order)
1. Emails working end-to-end — weekly digest, price alerts, welcome — test all three
2. Brokerage sync via Plaid — Fidelity, Robinhood, Schwab, Coinbase, real positions
3. Options chain viewer
4. Paper trading simulation
5. Earnings call AI summaries — transcript to what it means for your holdings
6. Insider trading tracker — SEC Form 4 filings for holdings
7. Analyst price targets — consensus target vs current price
8. Market close summary — daily notification after 4pm ET
9. Push notifications for morning briefing — 9am daily to phone
10. SMS alerts — in addition to email and push
11. Portfolio comparison — anonymized performance vs other Corvo users
12. Pro tier — unlimited AI chat, real-time alerts, custom PDF, SMS, brokerage sync
13. Custom branded PDF reports — Pro feature
14. App Store — iOS
15. Google Play — Android
16. Marketing
17. YC application

## Key Things Never to Break
- The double backend/backend path issue on Railway — always edit backend/main.py, confirm Railway serves the right file
- Sharpe ratio uses live ^IRX T-bill rate — never hardcode rf_rate
- CAGR label is dynamic based on selected period
- AI insights must never single out one holding as largest when multiple share equal weight
- What-If analysis requires weights to total 100% before running
- Light mode default for new/incognito users — localStorage key is corvo_theme
- Morning briefing uses actual yfinance 1D price data for holdings — never estimate
- Money market tickers (ending in XX, or in CASH_TICKERS list) get synthetic 4.5% price series

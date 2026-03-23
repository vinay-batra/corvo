# Corvo — Portfolio Intelligence Platform

AI-powered portfolio analysis and optimization. Built with Next.js, FastAPI, and Claude AI.

## Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind, Framer Motion, Plotly
- **Backend**: FastAPI, yfinance, NumPy, Anthropic Claude API
- **Auth & DB**: Supabase (Google OAuth + email/password)
- **Deploy**: Vercel (frontend) + Railway (backend)

## Local Development

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `SUPABASE_SETUP.sql` in the Supabase SQL Editor
3. Enable Google OAuth: **Authentication → Providers → Google**
   - Add your Google OAuth Client ID + Secret
   - Set the callback URL to: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy your project URL and anon key

### 2. Frontend
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your Supabase keys
npm install
npm run dev
```

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
uvicorn main:app --reload
```

App runs at `http://localhost:3000`, backend at `http://localhost:8000`

---

## Deployment

### Backend → Railway
1. Push repo to GitHub
2. Create a new project at [railway.app](https://railway.app) → **Deploy from GitHub**
3. Select your repo — Railway will auto-detect `railway.toml`
4. Go to **Variables** and add:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Deploy — Railway will start `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy your Railway public URL (e.g. `https://-backend.up.railway.app`)

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add these **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
   ```
4. Deploy

### Supabase Google OAuth (after Vercel deploy)
In Supabase → **Authentication → URL Configuration**, add:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Features

### Core
- Portfolio analysis: returns, volatility, Sharpe ratio, max drawdown
- Efficient frontier visualization
- Portfolio optimization (max Sharpe)
- Benchmark comparison (S&P 500, Nasdaq, Dow, Russell 2000, QQQ, Gold)

### Tier 2
- Drawdown chart (full time-series)
- Correlation heatmap between holdings
- Monte Carlo simulation (300 paths, 1-year horizon)
- Stock news feed (per ticker)
- PDF export
- Google OAuth + email/password auth
- Auth guard on `/app`
- Saved portfolios (Supabase)
- Custom benchmark selector

## Routes
- `/` — Landing page
- `/auth` — Login / Sign up
- `/auth/callback` — OAuth callback (do not delete)
- `/app` — Main portfolio app (auth required)

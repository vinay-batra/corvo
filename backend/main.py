from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import asyncio
import numpy as np
import yfinance as yf
import pandas as pd
import math
import os
import json
import requests
from datetime import datetime, timezone
import time
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
VAPID_PRIVATE_KEY    = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY     = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL   = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:alerts@corvo.capital")
RAILWAY_BASE_URL     = os.environ.get("RAILWAY_BASE_URL", "https://web-production-7a78d.up.railway.app")

# Startup env check: visible in Railway logs
print(f"[startup] RESEND_API_KEY: {'SET (' + os.environ.get('RESEND_API_KEY', '')[:6] + '...)' if os.environ.get('RESEND_API_KEY') else 'NOT SET'}")
print(f"[startup] RESEND_FROM_EMAIL: {os.environ.get('RESEND_FROM_EMAIL', 'NOT SET')}")
print(f"[startup] SUPABASE_URL: {'SET' if SUPABASE_URL else 'NOT SET'}")
print(f"[startup] FINNHUB_API_KEY: {'SET' if os.environ.get('FINNHUB_API_KEY') else 'NOT SET'}")

# ── In-memory rate limiting ────────────────────────────────────────────────────
RATE_LIMITS: dict[str, list[float]] = {}

def check_rate_limit(ip: str, endpoint: str, max_requests: int, window_seconds: int) -> bool:
    """Return True if this request should be rate-limited (i.e. blocked)."""
    key = f"{ip}:{endpoint}"
    now = time.time()
    timestamps = RATE_LIMITS.get(key, [])
    # Drop timestamps outside the window
    timestamps = [t for t in timestamps if now - t < window_seconds]
    if len(timestamps) >= max_requests:
        RATE_LIMITS[key] = timestamps
        return True
    timestamps.append(now)
    RATE_LIMITS[key] = timestamps
    return False

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "production"),
    )

@asynccontextmanager
async def lifespan(app_: FastAPI):
    alert_task        = asyncio.create_task(price_alert_loop())
    brief_task        = asyncio.create_task(morning_brief_loop())
    morning_task      = asyncio.create_task(morning_briefing_email_loop())
    review_task       = asyncio.create_task(week_in_review_loop())
    monthly_task      = asyncio.create_task(monthly_summary_loop())
    mkt_close_task    = asyncio.create_task(market_close_summary_loop())
    checkup_task      = asyncio.create_task(weekly_portfolio_checkup_loop())
    earnings_task     = asyncio.create_task(earnings_reminder_loop())
    yield
    for t in (alert_task, brief_task, morning_task, review_task, monthly_task, mkt_close_task, checkup_task, earnings_task):
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Corvo API v3", version="1.0.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [
    "https://corvo.capital",
    "https://www.corvo.capital",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERIOD_MAP = {"6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"}

def safe_float(val):
    """Convert to float, returning 0 for NaN/Inf."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except:
        return 0.0

def safe_list(lst):
    return [safe_float(x) for x in lst]


def clean_ai_response(text: str) -> str:
    """Strip em dashes, asterisks, and markdown formatting from any Claude response."""
    import re
    text = text.strip()
    # Replace em dashes with commas
    text = text.replace("\u2014", ",")
    # Strip bold/italic markdown (**, *, __, _)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    text = re.sub(r'_{1,2}([^_]+)_{1,2}', r'\1', text)
    # Remove any remaining stray asterisks
    text = text.replace("*", "").replace("**", "")
    return text

def get_prices(tickers, period="1y"):
    """Download prices for a list of tickers."""
    period = PERIOD_MAP.get(period, "1y")
    try:
        if len(tickers) == 1:
            data = yf.download(tickers[0], period=period, auto_adjust=True, progress=False)
            if data.empty:
                return None
            if "Close" in data.columns:
                return data[["Close"]].rename(columns={"Close": tickers[0]})
            return None
        else:
            data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
            if data.empty:
                return None
            if isinstance(data.columns, pd.MultiIndex):
                if "Close" in data.columns.get_level_values(0):
                    prices = data["Close"]
                elif "Adj Close" in data.columns.get_level_values(0):
                    prices = data["Adj Close"]
                else:
                    return None
            else:
                if "Close" in data.columns:
                    prices = data[["Close"]]
                elif "Adj Close" in data.columns:
                    prices = data[["Adj Close"]]
                else:
                    return None
            prices = prices.dropna(axis=1, how="all")
            return prices
    except Exception as e:
        print(f"Error downloading {tickers}: {e}")
        return None


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    print(f"[{request.method}] {request.url.path} → {response.status_code} ({duration_ms}ms)")
    return response


@app.get("/")
def root():
    return {"status": "ok", "service": "Corvo API"}


@app.get("/health")
def health():
    """Health check: verifies Supabase connectivity."""
    supabase_ok = False
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/profiles?select=id&limit=1",
                headers=_sb_headers(),
                timeout=5,
            )
            supabase_ok = resp.status_code in (200, 206)
        except Exception:
            supabase_ok = False
    return {
        "status": "ok",
        "supabase": "connected" if supabase_ok else "unavailable",
    }


@app.get("/docs-check")
def docs_check():
    return {"status": "running"}


@app.delete("/user")
def delete_user(request: Request):
    """
    Hard-delete the authenticated user's account.

    Flow:
      1. Extract the JWT from the Authorization header.
      2. Verify it against Supabase and extract the user ID.
      3. Use the service-role key to call the Supabase admin delete endpoint.
         This cascades to all tables with ON DELETE CASCADE (profiles,
         email_preferences, learn_scores, portfolios, etc.).
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Server not configured for account deletion.")

    # ── 1. Extract JWT ─────────────────────────────────────────────────────────
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    jwt_token = auth_header[len("Bearer "):]

    # ── 2. Verify JWT and get user ID ──────────────────────────────────────────
    user_resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {jwt_token}",
            "apikey": SUPABASE_SERVICE_KEY,
        },
        timeout=10,
    )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user_id = user_resp.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user ID.")

    # ── 3. Delete related records before removing the auth user ───────────────
    db_headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
    }
    for table in ("ai_chat_history", "portfolios", "email_preferences", "price_alerts"):
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=db_headers,
            params={"user_id": f"eq.{user_id}"},
            timeout=10,
        )

    # ── 4. Hard-delete via Supabase admin API ──────────────────────────────────
    delete_resp = requests.delete(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
        },
        timeout=10,
    )
    if delete_resp.status_code not in (200, 204):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {delete_resp.text}",
        )

    return {"ok": True}


CASH_TICKERS = {
    # Explicit money market funds
    "FDRXX", "SPAXX", "VMFXX", "VUSXX", "SWVXX", "SPRXX", "TTTXX",
    "VMMXX", "FZDXX", "GABXX", "MMPXX", "PRTXX", "AWSHX",
    # Short-duration cash-like ETFs (near-zero volatility)
    "SGOV", "BIL", "SHV",
    # Generic cash placeholder
    "CASH",
}

def is_cash_ticker(t: str) -> bool:
    """Return True if t should be treated as a cash/money-market equivalent."""
    return t in CASH_TICKERS or (len(t) == 5 and t.endswith("XX"))

def make_synthetic_prices(annual_return: float, n_days: int, start_date=None) -> pd.Series:
    """Generate synthetic daily price series from an annual return rate."""
    daily_r = (1 + annual_return) ** (1 / 252) - 1
    prices = [100.0]
    for _ in range(n_days - 1):
        prices.append(prices[-1] * (1 + daily_r))
    if start_date is not None:
        idx = pd.bdate_range(start=start_date, periods=n_days)
    else:
        idx = pd.bdate_range(end=pd.Timestamp.today(), periods=n_days)
    return pd.Series(prices, index=idx[:len(prices)])

@app.get("/portfolio")
def portfolio(
    request: Request,
    tickers: str = "AAPL,MSFT",
    weights: str = "",
    period: str = "1y",
    benchmark: str = "^GSPC",
    user_id: str = "",
    referral_code: str = "",
    manual_returns: str = "",
):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "portfolio", 30, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before trying again.")
    # Process referral bonus on first analysis
    if user_id and referral_code:
        import threading
        threading.Thread(target=process_referral_bonus, args=(user_id, referral_code), daemon=True).start()
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers provided")
    if len(tickers_list) > 30:
        raise HTTPException(status_code=400, detail="Too many tickers (max 30)")
    import re as _re
    for t in tickers_list:
        if not _re.match(r'^[\^A-Z0-9.\-=]{1,12}$', t):
            raise HTTPException(status_code=400, detail=f"Invalid ticker format: {t}")
    if period not in ("1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y", "ytd", "max"):
        raise HTTPException(status_code=400, detail="Invalid period")

    # Parse weights
    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    if len(w_list) != len(tickers_list):
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list)
    if total <= 0:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [w / total for w in w_list]

    weights_arr = np.array(w_list)

    # Parse manual returns (comma-separated, empty string = no override)
    manual_returns_list = []
    if manual_returns:
        try:
            manual_returns_list = [float(x) if x.strip() else None for x in manual_returns.split(",")]
        except Exception:
            manual_returns_list = []
    # Pad to match tickers length
    while len(manual_returns_list) < len(tickers_list):
        manual_returns_list.append(None)

    # Download prices
    all_tickers = tickers_list + [benchmark]
    prices = get_prices(all_tickers, period)

    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch price data")

    # Separate benchmark
    bench_prices = None
    if benchmark in prices.columns:
        bench_prices = prices[benchmark].dropna()
        prices = prices.drop(columns=[benchmark])

    # Inject synthetic price series for any ticker with missing/sparse data
    n_days = len(bench_prices) if bench_prices is not None and len(bench_prices) > 1 else 252
    start_date = bench_prices.index[0] if bench_prices is not None and len(bench_prices) > 0 else None

    def _align_synthetic(s: pd.Series) -> pd.Series:
        """Match synthetic index timezone to prices.index."""
        if hasattr(prices.index, 'tz') and prices.index.tz is not None:
            s = s.tz_localize(prices.index.tz) if s.index.tz is None else s.tz_convert(prices.index.tz)
        elif s.index.tz is not None:
            s.index = s.index.tz_localize(None)
        return s

    # Track tickers assigned synthetic cash data (informational only — no ticker is excluded)
    skipped_tickers = []

    for i, t in enumerate(tickers_list):
        mr = manual_returns_list[i] if i < len(manual_returns_list) else None
        if mr is not None and (t not in prices.columns or is_cash_ticker(t)):
            synthetic = _align_synthetic(make_synthetic_prices(mr, n_days, start_date))
            prices[t] = np.nan
            common = prices.index.intersection(synthetic.index)
            prices.loc[common, t] = synthetic.loc[common].values
            continue
        col = prices[t] if t in prices.columns else pd.Series(dtype=float)
        dropped = col.dropna()
        std = dropped.std()
        needs_synthetic = (
            t not in prices.columns
            or prices[t].isna().all()
            or len(dropped) < 5
            or pd.isna(std)
            or std < 0.001
            or is_cash_ticker(t)
        )
        if needs_synthetic:
            synthetic = _align_synthetic(make_synthetic_prices(0.045, n_days, start_date))
            if t not in prices.columns:
                prices[t] = np.nan
            common = prices.index.intersection(synthetic.index)
            prices.loc[common, t] = synthetic.loc[common].values
            if not is_cash_ticker(t):
                skipped_tickers.append(t)

    # Every ticker is now present — none are excluded from analysis
    available = tickers_list
    prices = prices[available]
    prices = prices.ffill().bfill()
    non_cash = [t for t in tickers_list if not is_cash_ticker(t)]
    if non_cash:
        prices = prices.dropna(subset=non_cash)
    else:
        prices = prices.dropna()
    if prices.empty or len(prices) < 2:
        raise HTTPException(status_code=500, detail="Insufficient price data")

    # Weights are already normalized to tickers_list — no renormalization needed
    avail_weights = w_list
    weights_arr = np.array(avail_weights)

    # Daily returns
    returns = prices.pct_change().dropna()
    if returns.empty:
        raise HTTPException(status_code=500, detail="Could not calculate returns")

    # Fetch current risk-free rate from 3-month T-bill
    try:
        tbill = yf.Ticker("^IRX")
        rf_rate = tbill.fast_info.last_price / 100
        if not rf_rate or rf_rate < 0:
            rf_rate = 0.04
    except Exception:
        rf_rate = 0.04

    # Portfolio returns
    port_returns = returns[available].values @ weights_arr

    # Annualized stats — CAGR and 252-day vol
    total_return = safe_float(float((1 + port_returns).prod() - 1))
    n_years = len(port_returns) / 252
    ann_return = safe_float((1 + total_return) ** (1 / n_years) - 1) if n_years > 0 else total_return
    ann_vol = safe_float(np.std(port_returns) * np.sqrt(252))
    sharpe = safe_float((ann_return - rf_rate) / ann_vol) if ann_vol > 0 else 0.0

    # Max drawdown
    cum = np.cumprod(1 + port_returns)
    running_max = np.maximum.accumulate(cum)
    drawdowns = (cum - running_max) / running_max
    max_dd = safe_float(np.min(drawdowns))

    # Cumulative returns for chart
    port_cum = [safe_float(x) for x in (cum - 1).tolist()]
    dates = [str(d)[:10] for d in returns.index.tolist()]

    # Benchmark cumulative returns
    bench_cum = []
    if bench_prices is not None:
        bench_prices = bench_prices.reindex(prices.index).ffill().bfill()
        bench_ret = bench_prices.pct_change().dropna()
        b_cum = np.cumprod(1 + bench_ret.values) - 1
        bench_cum = [safe_float(x) for x in b_cum.tolist()]
        # Align lengths
        min_len = min(len(port_cum), len(bench_cum))
        port_cum = port_cum[:min_len]
        bench_cum = bench_cum[:min_len]
        dates = dates[:min_len]

    # Individual stock returns for breakdown — CAGR per ticker
    individual_returns = {}
    for t in available:
        t_rets = returns[t].values
        t_total = float((1 + t_rets).prod() - 1)
        t_years = len(t_rets) / 252
        t_ret = safe_float((1 + t_total) ** (1 / t_years) - 1) if t_years > 0 else safe_float(t_total)
        individual_returns[t] = t_ret

    return {
        "tickers": available,
        "weights": [safe_float(w) for w in avail_weights],
        "portfolio_return": port_cum[-1] if port_cum else ann_return,
        "annualized_return": ann_return,
        "benchmark_return": bench_cum[-1] if bench_cum else None,
        "portfolio_volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_dd,
        "dates": dates,
        "portfolio_cumulative": port_cum,
        "benchmark_cumulative": bench_cum,
        "individual_returns": individual_returns,
        "period": period,
        "rf_rate": rf_rate,
        "skipped_tickers": [t for t in skipped_tickers if not is_cash_ticker(t)],
    }


@app.get("/drawdown")
def drawdown(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y"):
    import re as _re
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")
    if len(tickers_list) > 30:
        raise HTTPException(status_code=400, detail="Too many tickers (max 30)")
    for t in tickers_list:
        if not _re.match(r'^[\^A-Z0-9.\-=]{1,12}$', t):
            raise HTTPException(status_code=400, detail=f"Invalid ticker format: {t}")
    if period not in ("1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y", "ytd", "max"):
        raise HTTPException(status_code=400, detail="Invalid period")

    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list) or 1
    w_list = [w / total for w in w_list]

    prices = get_prices(tickers_list, period)
    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    avail_w = [w_list[tickers_list.index(t)] for t in available]
    total_w = sum(avail_w) or 1
    avail_w = [w / total_w for w in avail_w]

    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)
    cum = np.cumprod(1 + port_returns)
    running_max = np.maximum.accumulate(cum)
    dd = (cum - running_max) / running_max

    return {
        "dates": [str(d)[:10] for d in returns.index.tolist()],
        "drawdown": safe_list(dd.tolist()),
    }


@app.get("/correlation")
def correlation(tickers: str = "AAPL,MSFT", period: str = "1y"):
    import re as _re
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(tickers_list) < 2:
        return {"matrix": [], "tickers": tickers_list}
    if len(tickers_list) > 30:
        raise HTTPException(status_code=400, detail="Too many tickers (max 30)")
    for t in tickers_list:
        if not _re.match(r'^[\^A-Z0-9.\-=]{1,12}$', t):
            raise HTTPException(status_code=400, detail=f"Invalid ticker format: {t}")
    if period not in ("1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y", "ytd", "max"):
        raise HTTPException(status_code=400, detail="Invalid period")

    prices = get_prices(tickers_list, period)
    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    corr = prices.pct_change().dropna().corr()

    matrix = []
    for t1 in available:
        row = []
        for t2 in available:
            row.append(safe_float(corr.loc[t1, t2]) if t1 in corr.index and t2 in corr.columns else 0.0)
        matrix.append(row)

    return {"matrix": matrix, "tickers": available}


@app.get("/montecarlo")
def montecarlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 8500, years: int = 5):
    import re as _re
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")
    if len(tickers_list) > 30:
        raise HTTPException(status_code=400, detail="Too many tickers (max 30)")
    for t in tickers_list:
        if not _re.match(r'^[\^A-Z0-9.\-=]{1,12}$', t):
            raise HTTPException(status_code=400, detail=f"Invalid ticker format: {t}")
    if period not in ("1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y", "ytd", "max"):
        raise HTTPException(status_code=400, detail="Invalid period")
    simulations = 8500  # always use canonical count
    years = max(1, min(30, years))

    if weights:
        try:
            w_list = [float(x) for x in weights.split(",")]
        except:
            w_list = [1.0 / len(tickers_list)] * len(tickers_list)
    else:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list) or 1
    w_list = [w / total for w in w_list]

    prices = get_prices(tickers_list, period)

    # Inject synthetic 4.5% price series for cash/money market tickers (no market data exists)
    _PERIOD_DAYS = {"1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504, "3y": 756, "5y": 1260, "10y": 2520, "ytd": 252, "max": 2520}
    n_synth = _PERIOD_DAYS.get(PERIOD_MAP.get(period, "1y"), 252)
    has_cash = any(is_cash_ticker(t) for t in tickers_list)

    if has_cash:
        if prices is None or prices.empty:
            synth_base = make_synthetic_prices(0.045, n_synth)
            prices = pd.DataFrame(
                {t: synth_base.values for t in tickers_list if is_cash_ticker(t)},
                index=synth_base.index,
            )
        else:
            for t in tickers_list:
                if is_cash_ticker(t):
                    n = len(prices)
                    synth = make_synthetic_prices(0.045, n)
                    prices[t] = synth.values[:n] if len(synth.values) >= n else synth.values

    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch data")

    available = [t for t in tickers_list if t in prices.columns]
    prices = prices[available].dropna()
    avail_w = [w_list[tickers_list.index(t)] for t in available]
    total_w = sum(avail_w) or 1
    avail_w = [w / total_w for w in avail_w]

    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)

    mu_daily = float(np.mean(port_returns))
    sigma_daily = float(np.std(port_returns))

    # Override mu with long-term asset-class expected returns so recent bull/bear runs
    # don't distort forward projections. Individual stocks cap at 10% to prevent recent
    # high-return periods (e.g. NVDA bull run) from producing absurd 30-year projections.
    ASSET_CLASS_MU = {
        "BND": 0.04, "AGG": 0.04, "TLT": 0.04, "IEF": 0.035, "SHY": 0.03,
        "SGOV": 0.045, "BIL": 0.04, "VBTLX": 0.04, "LQD": 0.045, "HYG": 0.055,
        "GLD": 0.05, "IAU": 0.05, "SLV": 0.04, "DJP": 0.04,
        "SPY": 0.10, "VOO": 0.10, "VTI": 0.10, "IWM": 0.09, "QQQ": 0.11,
    }

    weighted_mu = 0.0
    for t, w in zip(available, avail_w):
        if is_cash_ticker(t):
            asset_mu = 0.045  # fixed 4.5% for cash/money market
        elif t in ASSET_CLASS_MU:
            asset_mu = ASSET_CLASS_MU[t]
        else:
            # Cap individual stock historical returns at 10% annual to prevent
            # recent bull-market periods from distorting long-term projections
            asset_mu = min(mu_daily * 252, 0.10)
        weighted_mu += w * asset_mu

    mu_daily = weighted_mu / 252

    # Cash-aware sigma: money market funds have near-zero volatility; don't apply
    # the equity minimum floor (8%) to portfolios that are mostly cash
    cash_weight = sum(avail_w[i] for i, t in enumerate(available) if is_cash_ticker(t))
    if cash_weight >= 0.99:
        sigma_daily = 0.001 / np.sqrt(252)
    elif cash_weight > 0:
        equity_sigma = max(sigma_daily, 0.08 / np.sqrt(252))
        cash_sigma = 0.001 / np.sqrt(252)
        sigma_daily = equity_sigma * (1 - cash_weight) + cash_sigma * cash_weight
    else:
        sigma_daily = max(sigma_daily, 0.08 / np.sqrt(252))

    # Hard cap at 12% annual return (prevents absurd results over long horizons;
    # 25% cap was producing +100000% over 30 years)
    mu_daily = min(mu_daily, 0.12 / 252)

    mu = mu_daily * 252
    sigma = sigma_daily * np.sqrt(252)

    # Use monthly steps (12/year) for memory efficiency across all horizon lengths
    steps_per_year = 12
    horizon = years * steps_per_year
    dt = 1.0 / steps_per_year

    rng = np.random.default_rng()
    Z = rng.standard_normal((simulations, horizon))
    daily_factors = np.exp((mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z)
    path_values = np.cumprod(daily_factors, axis=1)

    final_vals = path_values[:, -1]

    p5  = safe_float(float(np.percentile(final_vals, 5))  - 1.0)
    p25 = safe_float(float(np.percentile(final_vals, 25)) - 1.0)
    p50 = safe_float(float(np.percentile(final_vals, 50)) - 1.0)
    p75 = safe_float(float(np.percentile(final_vals, 75)) - 1.0)
    p95 = safe_float(float(np.percentile(final_vals, 95)) - 1.0)

    positive_prob = safe_float(float(np.mean(final_vals > 1.0)))
    max_loss = safe_float(float(1.0 - np.min(final_vals)))

    paths_pct = path_values - 1.0
    pct_bands = {
        "p5":  safe_list(np.percentile(paths_pct, 5,  axis=0).tolist()),
        "p25": safe_list(np.percentile(paths_pct, 25, axis=0).tolist()),
        "p50": safe_list(np.percentile(paths_pct, 50, axis=0).tolist()),
        "p75": safe_list(np.percentile(paths_pct, 75, axis=0).tolist()),
        "p95": safe_list(np.percentile(paths_pct, 95, axis=0).tolist()),
    }

    ruin_threshold = 0.5
    ruin_probability = safe_float(float(np.mean(final_vals < ruin_threshold)))
    worst_5pct_mask = final_vals <= np.percentile(final_vals, 5)
    expected_shortfall = safe_float(
        float(np.mean(final_vals[worst_5pct_mask]) - 1.0) if worst_5pct_mask.any() else p5
    )

    return {
        "horizon": horizon,
        "years": years,
        "steps_per_year": steps_per_year,
        "simulations": simulations,
        "final_p5": p5,
        "final_p25": p25,
        "final_p50": p50,
        "final_p75": p75,
        "final_p95": p95,
        "bands": pct_bands,
        "positive_prob": positive_prob,
        "max_loss": max_loss,
        "ruin_probability": ruin_probability,
        "expected_shortfall": expected_shortfall,
    }


class MonteCarloInsightRequest(BaseModel):
    positive_prob: int
    p5: float
    p50: float
    p95: float
    ruin_probability: float
    expected_shortfall: float
    simulations: int = 8500
    years: int = 1


@app.post("/montecarlo/insight")
def montecarlo_insight(req: MonteCarloInsightRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "montecarlo-insight", 15, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in an hour.")

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)

    ruin_pct = round(req.ruin_probability * 100, 1)
    es_pct = round(req.expected_shortfall * 100, 1)
    p5_pct = round(req.p5 * 100, 1)
    p50_pct = round(req.p50 * 100, 1)
    p95_pct = round(req.p95 * 100, 1)

    horizon_label = f"{req.years} year" if req.years == 1 else f"{req.years} years"
    prompt = (
        f"A portfolio was simulated {req.simulations} times over {horizon_label}. Results: "
        f"{req.positive_prob}% of simulations ended with positive returns. "
        f"Median outcome: {p50_pct:+.1f}%. "
        f"Worst 5% of scenarios: below {p5_pct:.1f}% (average of worst 5%: {es_pct:.1f}%). "
        f"Best 5% of scenarios: above {p95_pct:+.1f}%. "
        f"Probability of losing more than 50%: {ruin_pct:.1f}%. "
        f"Write 2-3 plain English sentences for the investor. Start with 'Based on {req.simulations:,} simulations'. "
        f"Reference the {horizon_label} horizon in your response. Be direct and specific. No markdown, no bullet points, no disclaimers."
    )

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system="You are a plain-English financial analyst. Write concise, jargon-free summaries for retail investors. Never claim a cash or money market fund like FDRXX, SPAXX, or VMFXX is a stock holding — they are cash equivalents. Never use em dashes in your response. Never use asterisks (*) or markdown formatting. Write in plain prose only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return {"insight": clean_ai_response(resp.content[0].text)}


class RetirementSimRequest(BaseModel):
    tickers: list[str]
    weights: list[float]
    current_value: float
    years_to_retirement: int
    simulations: int = 8500
    period: str = "5y"
    contribution: float = 0.0
    inflation_rate: float = 2.5
    fee_rate: float = 0.05
    tax_drag: float = 0.0
    confidence_level: int = 90


@app.post("/portfolio/retirement-simulation")
def retirement_simulation(req: RetirementSimRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "retirement-simulation", 10, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in an hour.")

    if not req.tickers or len(req.tickers) != len(req.weights):
        raise HTTPException(status_code=400, detail="Tickers and weights must be non-empty and equal length.")
    if req.years_to_retirement < 1 or req.years_to_retirement > 60:
        raise HTTPException(status_code=400, detail="years_to_retirement must be between 1 and 60.")
    if req.current_value <= 0:
        raise HTTPException(status_code=400, detail="current_value must be positive.")

    confidence_level = req.confidence_level if req.confidence_level in (90, 95, 99) else 90
    lower_pct = (100.0 - confidence_level) / 2.0
    upper_pct = 100.0 - lower_pct

    total_w = sum(req.weights) or 1.0
    weights = [w / total_w for w in req.weights]
    tickers = [t.strip().upper() for t in req.tickers]

    prices = get_prices(tickers, req.period)

    # Inject synthetic 4.5% price series for cash/money market tickers
    _PERIOD_DAYS = {"1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504, "3y": 756, "5y": 1260, "10y": 2520, "ytd": 252, "max": 2520}
    n_synth = _PERIOD_DAYS.get(PERIOD_MAP.get(req.period, "1y"), 252)
    has_cash = any(is_cash_ticker(t) for t in tickers)

    if has_cash:
        if prices is None or prices.empty:
            synth_base = make_synthetic_prices(0.045, n_synth)
            prices = pd.DataFrame(
                {t: synth_base.values for t in tickers if is_cash_ticker(t)},
                index=synth_base.index,
            )
        else:
            for t in tickers:
                if is_cash_ticker(t):
                    n = len(prices)
                    synth = make_synthetic_prices(0.045, n)
                    prices[t] = synth.values[:n] if len(synth.values) >= n else synth.values

    if prices is None or prices.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch price data.")

    available = [t for t in tickers if t in prices.columns]
    if not available:
        raise HTTPException(status_code=500, detail="No price data available for provided tickers.")

    prices = prices[available].dropna()
    avail_w = [weights[tickers.index(t)] for t in available]
    total_avail = sum(avail_w) or 1.0
    avail_w = [w / total_avail for w in avail_w]

    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)

    mu_hist = float(np.mean(port_returns))
    sigma_daily = float(np.std(port_returns))

    # Portfolio CAGR (geometric return) over the available price history — more conservative
    # than arithmetic mean * 252, especially for volatile portfolios with recent bull runs
    n_years_hist = max(len(port_returns), 1) / 252.0
    port_total_growth = float((1.0 + pd.Series(port_returns)).prod())
    port_cagr = max(-0.99, port_total_growth ** (1.0 / n_years_hist) - 1.0)

    # Use portfolio historical CAGR directly, capped at 12% nominal.
    # port_cagr is the geometric (compounded) annual return over the price history period —
    # more accurate than arithmetic mean * 252, especially for volatile portfolios.
    # Floor at 0% to prevent negative forward projections from short bad-period snapshots.
    mu_annual = min(max(port_cagr, 0.0), 0.12)

    # Cash-aware sigma: don't apply equity volatility floor to cash-heavy portfolios
    cash_weight = sum(avail_w[i] for i, t in enumerate(available) if is_cash_ticker(t))
    if cash_weight >= 0.99:
        sigma_daily = 0.001 / np.sqrt(252)
    elif cash_weight > 0:
        equity_sigma = max(sigma_daily, 0.08 / np.sqrt(252))
        cash_sigma = 0.001 / np.sqrt(252)
        sigma_daily = equity_sigma * (1 - cash_weight) + cash_sigma * cash_weight
    else:
        sigma_daily = max(sigma_daily, 0.08 / np.sqrt(252))

    sigma_annual = sigma_daily * np.sqrt(252)

    # Adjust for fees and tax drag (reduce annual return)
    effective_mu = mu_annual - (req.fee_rate / 100.0) - (req.tax_drag / 100.0)

    # Run 8500 annual-step GBM paths with contributions
    horizon_years = req.years_to_retirement
    rng = np.random.default_rng()
    Z = rng.standard_normal((req.simulations, horizon_years))
    annual_factors = np.exp((effective_mu - 0.5 * sigma_annual ** 2) + sigma_annual * Z)

    values = np.full(req.simulations, req.current_value, dtype=float)
    for y in range(horizon_years):
        values = values * annual_factors[:, y] + req.contribution

    # Convert nominal to real (inflation-adjusted) dollars
    inflation_multiplier = (1.0 + req.inflation_rate / 100.0) ** horizon_years
    real_values = values / inflation_multiplier

    worst_val  = safe_float(float(np.percentile(real_values, lower_pct)))
    median_val = safe_float(float(np.percentile(real_values, 50.0)))
    best_val   = safe_float(float(np.percentile(real_values, upper_pct)))

    worst_pct  = safe_float(worst_val  / req.current_value - 1.0)
    median_pct = safe_float(median_val / req.current_value - 1.0)
    best_pct   = safe_float(best_val   / req.current_value - 1.0)

    positive_prob = safe_float(float(np.mean(real_values > req.current_value)))

    ci_low  = worst_val
    ci_high = best_val

    # Histogram of final real values (40 bins, trimmed to 1st-99th percentile)
    hist_min = max(0.0, float(np.percentile(real_values, 1)))
    hist_max = float(np.percentile(real_values, 99))
    if hist_max <= hist_min:
        hist_max = hist_min + 1.0
    hist_counts, hist_edges = np.histogram(real_values, bins=40, range=(hist_min, hist_max))
    histogram = {
        "counts": hist_counts.tolist(),
        "edges": [safe_float(e) for e in hist_edges.tolist()],
    }

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
    client = anthropic.Anthropic(api_key=api_key)

    ticker_str = ", ".join(available[:6]) + ("..." if len(available) > 6 else "")
    contrib_note = f" with ${req.contribution:,.0f}/year in contributions" if req.contribution > 0 else ""
    inflation_note = f", inflation-adjusted at {req.inflation_rate}%/year" if req.inflation_rate > 0 else ""
    prompt = (
        f"A portfolio currently worth ${req.current_value:,.0f} ({ticker_str}) was simulated "
        f"{req.simulations:,} times over {horizon_years} years{contrib_note}{inflation_note}. "
        f"Results: {confidence_level}% confidence interval = ${ci_low:,.0f} to ${ci_high:,.0f}, "
        f"median = ${median_val:,.0f} ({median_pct:+.0%}). "
        f"{round(positive_prob * 100, 1)}% of scenarios ended above the starting value. "
        f"Write exactly 2-3 sentences in plain English summarizing what these numbers mean for the investor. "
        f"Then on a new line write 'Action:' followed by one specific, concrete action. "
        f"No markdown, no bullet points, no asterisks, no em dashes, no disclaimers."
    )

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=250,
        system="You are a plain-English retirement planning analyst. Write concise, jargon-free summaries for retail investors. Never use em dashes, asterisks, or markdown. Write in plain prose only.",
        messages=[{"role": "user", "content": prompt}],
    )
    raw = clean_ai_response(resp.content[0].text)

    summary = raw
    action = ""
    if "Action:" in raw:
        parts = raw.split("Action:", 1)
        summary = parts[0].strip()
        action = parts[1].strip()

    return {
        "worst":           worst_val,
        "median":          median_val,
        "best":            best_val,
        "worst_pct":       worst_pct,
        "median_pct":      median_pct,
        "best_pct":        best_pct,
        "ci_low":          ci_low,
        "ci_high":         ci_high,
        "confidence_level": confidence_level,
        "positive_prob":   positive_prob,
        "years":           req.years_to_retirement,
        "current_value":   req.current_value,
        "simulations":     req.simulations,
        "histogram":       histogram,
        "summary":         summary,
        "action":          action,
        "contribution":    req.contribution,
        "inflation_rate":  req.inflation_rate,
        "fee_rate":        req.fee_rate,
        "inflation_adjusted": req.inflation_rate > 0,
    }



class NLPortfolioItem(BaseModel):
    ticker: str
    weight: float


class NLEditRequest(BaseModel):
    command: str
    portfolio: list[NLPortfolioItem]


@app.post("/portfolio/natural-language-edit")
def portfolio_natural_language_edit(req: NLEditRequest, request: Request):
    import json as _json
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "nl-edit", 30, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in an hour.")

    command = (req.command or "").strip()
    if not command:
        raise HTTPException(status_code=400, detail="Command cannot be empty.")
    if len(command) > 500:
        raise HTTPException(status_code=400, detail="Command is too long.")
    if not req.portfolio:
        raise HTTPException(status_code=400, detail="Portfolio cannot be empty.")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    raw_weights = [item.weight for item in req.portfolio]
    total_w = sum(raw_weights) or 1.0
    pct_weights = [w / total_w * 100 for w in raw_weights]

    portfolio_lines = "\n".join(
        f"  {item.ticker.upper()}: {pct_weights[i]:.2f}%"
        for i, item in enumerate(req.portfolio)
        if item.ticker
    )

    # Detect hypothetical / preview commands
    hypothetical_phrases = [
        "what would happen if", "what if", "how would", "what happens if",
        "show me what", "show me how", "suppose", "imagine", "preview",
        "if i added", "if i removed", "if i bought", "if i sold",
        "if i increased", "if i decreased", "simulate",
    ]
    cmd_lower = command.lower()
    is_hypothetical = any(ph in cmd_lower for ph in hypothetical_phrases)
    mode = "preview" if is_hypothetical else "apply"

    prompt = f"""You are a portfolio editor assistant. Apply the user's command to produce a new portfolio.

Current portfolio:
{portfolio_lines}

User command: "{command}"

Command patterns to handle:
- "sell half my X and put it in Y" = halve X weight, add freed weight to Y (create Y if not present)
- "go X% bonds Y% stocks" = replace with ETFs: BND/AGG for bonds, SPY/VOO for stocks, QQQ for growth
- "remove all tech exposure" = remove NVDA, AAPL, MSFT, GOOGL, GOOG, META, AMZN, TSLA, AMD, AVGO, INTC, QQQ, XLK, SMH and redistribute proportionally to remaining holdings
- "make it more conservative" = introduce BND at 20-25% and reduce equity positions proportionally
- "rebalance to equal weight" = divide 100% equally among all current holdings
- "reduce my largest position by half" = find the highest-weight ticker, halve it, spread freed weight proportionally among all other holdings
- "add some international exposure" = add VEU or VXUS at 10-15%, reduce all current holdings proportionally
- "add X at Y%" = add ticker X at Y%, reduce current holdings proportionally
- "what would happen if I added X at Y%" = same math as above (preview only, same output format)
- "reduce X exposure" = reduce all holdings in the named sector by roughly half, redistribute to others

Rules:
- All tickers must be real market symbols (stocks, ETFs, indices)
- Weights must sum to exactly 100
- All weights must be greater than 0

Write a plain-English explanation (1-2 sentences, no em dashes, no asterisks) of what changed.
Write a plain-English impact summary (1 sentence, no em dashes, no asterisks) about risk or diversification.

Return ONLY this JSON, no other text:
{{
  "tickers": ["TICKER1", "TICKER2"],
  "weights": [55.0, 45.0],
  "explanation": "Reduced NVDA from 40% to 20% and added QQQ at 20% using the freed weight.",
  "impact_summary": "This reduces single-stock concentration and adds broad Nasdaq index exposure."
}}

If the command cannot be executed, return: {{"error": "brief reason"}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = _json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse the AI response: {str(e)}")

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    tickers = result.get("tickers", [])
    weights = result.get("weights", [])
    explanation = clean_ai_response(result.get("explanation", ""))
    impact_summary = clean_ai_response(result.get("impact_summary", ""))

    if not tickers or not weights:
        raise HTTPException(status_code=422, detail="AI returned an empty portfolio.")
    if len(tickers) != len(weights):
        raise HTTPException(status_code=422, detail="AI returned mismatched tickers and weights.")
    if any(w <= 0 for w in weights):
        raise HTTPException(status_code=422, detail="All portfolio weights must be positive.")

    total = sum(weights)
    if abs(total - 100) > 2.5:
        raise HTTPException(status_code=422, detail=f"Weights sum to {total:.1f}%, not 100%. Please try a more specific command.")

    normalized = [round(w / total * 100, 4) for w in weights]
    clean_tickers = [str(t).upper().strip() for t in tickers]

    # Before/after snapshot and impact metrics computed in Python
    before_tickers = [item.ticker.upper() for item in req.portfolio if item.ticker]
    before_weights = [round(pct_weights[i], 4) for i in range(len(before_tickers))]
    concentration_before = max(before_weights) if before_weights else 0.0
    concentration_after = max(normalized) if normalized else 0.0

    return {
        "mode": mode,
        "tickers": clean_tickers,
        "weights": normalized,
        "before_tickers": before_tickers,
        "before_weights": before_weights,
        "explanation": explanation,
        "impact_summary": impact_summary,
        "impact": {
            "concentration_before": round(concentration_before, 1),
            "concentration_after": round(concentration_after, 1),
            "holdings_before": len(before_tickers),
            "holdings_after": len(clean_tickers),
        },
    }


_sectors_cache: dict[str, tuple[dict, float]] = {}

@app.get("/portfolio/sectors")
def portfolio_sectors(tickers: str = "AAPL", weights: str = "", request: Request = None):
    """Return sector exposure aggregated by weight. Cached per ticker+weight combo for 1 hour."""
    cache_key = f"{tickers}|{weights}"
    if cache_key in _sectors_cache:
        cached_result, cached_ts = _sectors_cache[cache_key]
        if time.time() - cached_ts < 3600:
            return cached_result

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"sectors": {}}

    weight_list: list[float] = []
    if weights:
        try:
            weight_list = [float(w) for w in weights.split(",")]
        except ValueError:
            weight_list = []

    if len(weight_list) != len(ticker_list):
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)

    total = sum(weight_list)
    if total <= 0:
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)
        total = 1.0
    normalized_weights = [w / total for w in weight_list]

    sector_map: dict[str, float] = {}
    for ticker, weight in zip(ticker_list, normalized_weights):
        try:
            info = yf.Ticker(ticker).info
            sector = info.get("sector") or "Other"
        except Exception:
            sector = "Other"
        sector_map[sector] = sector_map.get(sector, 0.0) + weight

    result = {"sectors": sector_map}
    _sectors_cache[cache_key] = (result, time.time())
    return result


_dividends_cache: dict[str, tuple[dict, float]] = {}

@app.get("/portfolio/dividends")
def portfolio_dividends(
    tickers: str = "AAPL",
    weights: str = "",
    portfolio_value: float = 10000.0,
    request: Request = None,
):
    """Return dividend info per ticker plus aggregated annual income estimate."""
    cache_key = f"v2|{tickers}|{weights}|{portfolio_value}"
    if cache_key in _dividends_cache:
        cached_result, cached_ts = _dividends_cache[cache_key]
        if time.time() - cached_ts < 3600:
            return cached_result

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"holdings": [], "total_annual_income": 0.0, "next_ex_div_date": None}

    weight_list: list[float] = []
    if weights:
        try:
            weight_list = [float(w) for w in weights.split(",")]
        except ValueError:
            weight_list = []

    if len(weight_list) != len(ticker_list):
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)

    total = sum(weight_list)
    if total <= 0:
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)
        total = 1.0
    normalized_weights = [w / total for w in weight_list]

    holdings = []
    for ticker, weight in zip(ticker_list, normalized_weights):
        try:
            try:
                info = yf.Ticker(ticker).info
            except Exception:
                info = {}

            raw_yield = info.get("dividendYield")
            # yfinance returns dividendYield in percentage form (e.g. 0.38 = 0.38%)
            div_yield_pct = safe_float(raw_yield) if raw_yield is not None else None
            div_yield_decimal = div_yield_pct / 100 if div_yield_pct is not None else None

            # ex-dividend date: yfinance returns Unix timestamp or None
            ex_div_ts = info.get("exDividendDate")
            ex_div_date: str | None = None
            if ex_div_ts:
                try:
                    ex_div_date = datetime.fromtimestamp(int(ex_div_ts), tz=timezone.utc).strftime("%Y-%m-%d")
                except Exception:
                    ex_div_date = None

            # Dividend frequency: estimate from trailingAnnualDividendRate / dividendRate
            frequency: str | None = None
            div_rate = safe_float(info.get("dividendRate"))
            trailing_rate = safe_float(info.get("trailingAnnualDividendRate"))
            if div_rate and div_rate > 0 and trailing_rate and trailing_rate > 0:
                freq_count = round(trailing_rate / div_rate)
                if freq_count <= 1:
                    frequency = "Annual"
                elif freq_count == 2:
                    frequency = "Semi-Annual"
                elif freq_count == 4:
                    frequency = "Quarterly"
                elif freq_count == 12:
                    frequency = "Monthly"
                else:
                    frequency = f"{freq_count}x/yr"

            alloc_value = portfolio_value * weight
            annual_income = round(alloc_value * div_yield_decimal, 2) if div_yield_decimal else 0.0

            holdings.append({
                "ticker": ticker,
                "weight": round(weight, 4),
                "dividend_yield": round(div_yield_pct, 4) if div_yield_pct is not None else 0.0,
                "annual_income": annual_income,
                "ex_div_date": ex_div_date or "",
                "frequency": frequency or "",
            })
        except Exception:
            holdings.append({
                "ticker": ticker,
                "weight": round(weight, 4),
                "dividend_yield": 0.0,
                "annual_income": 0.0,
                "ex_div_date": "",
                "frequency": "",
            })

    total_annual_income = round(sum(h["annual_income"] for h in holdings), 2)

    # Next upcoming ex-div date across all paying tickers
    upcoming = [h["ex_div_date"] for h in holdings if h["ex_div_date"]]
    upcoming.sort()
    next_ex_div_date = upcoming[0] if upcoming else ""

    result = {
        "holdings": holdings,
        "total_annual_income": total_annual_income,
        "next_ex_div_date": next_ex_div_date,
    }
    _dividends_cache[cache_key] = (result, time.time())
    return result


def _finnhub_fallback(ticker: str, max_results: int = 8) -> list:
    """Fetch company news from Finnhub. Returns list of normalized article dicts, or [] on failure."""
    fh_key = os.environ.get("FINNHUB_API_KEY", "")
    if not fh_key:
        return []
    try:
        from datetime import date, timedelta
        to_date = date.today().isoformat()
        from_date = (date.today() - timedelta(days=7)).isoformat()
        resp = requests.get(
            f"https://finnhub.io/api/v1/company-news",
            params={"symbol": ticker, "from": from_date, "to": to_date, "token": fh_key},
            timeout=6,
        )
        if resp.status_code != 200:
            return []
        articles = resp.json()
        if not isinstance(articles, list):
            return []
        result = []
        for a in articles[:max_results]:
            title = a.get("headline", "")
            url = a.get("url", "")
            if not title or not url:
                continue
            pub_ts = a.get("datetime", 0)
            try:
                pub_date = datetime.fromtimestamp(int(pub_ts), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if pub_ts else ""
            except Exception:
                pub_date = ""
            result.append({
                "ticker": ticker,
                "title": title,
                "summary": a.get("summary", ""),
                "publisher": a.get("source", ""),
                "url": url,
                "published": pub_date,
            })
        return result
    except Exception as e:
        print(f"[finnhub-fallback] error for {ticker}: {e}")
        return []


@app.get("/news")
def news(tickers: str = "AAPL"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    market_tickers = ["SPY", "QQQ", "^GSPC"]
    result = {"market": [], "sections": {}}

    def _parse_article(a: dict, ticker: str) -> dict | None:
        content = a.get("content") or {}
        url = (
            a.get("link") or a.get("url") or
            content.get("canonicalUrl", {}).get("url", "") or
            content.get("clickThroughUrl", {}).get("url", "") or ""
        )
        title = a.get("title") or content.get("title") or ""
        if not title or not url:
            return None
        pub_date = ""
        try:
            ts = a.get("providerPublishTime") or content.get("pubDate", "")
            if isinstance(ts, (int, float)):
                pub_date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            elif ts:
                pub_date = str(ts)
        except:
            pass
        return {
            "ticker": ticker,
            "title": title,
            "summary": content.get("summary") or a.get("summary") or "",
            "publisher": a.get("publisher") or content.get("provider", {}).get("displayName") or "",
            "url": url,
            "published": pub_date,
        }

    # Market news
    seen_urls = set()
    for mt in market_tickers:
        try:
            t = yf.Ticker(mt)
            for a in (t.news or [])[:8]:
                item = _parse_article(a, "MARKET")
                if item and item["url"] not in seen_urls:
                    seen_urls.add(item["url"])
                    result["market"].append(item)
                    if len(result["market"]) >= 15:
                        break
        except Exception as e:
            print(f"Market news error for {mt}: {e}")

    # Per-ticker news
    def normalize_article(a: dict, ticker: str) -> dict:
        """Normalize a yfinance article dict into a clean format."""
        content = a.get("content") or {}
        url = (
            a.get("link") or a.get("url") or
            content.get("canonicalUrl", {}).get("url", "") or
            content.get("clickThroughUrl", {}).get("url", "") or ""
        )
        pub_date = ""
        try:
            ts = a.get("providerPublishTime") or content.get("pubDate", "")
            if isinstance(ts, (int, float)):
                pub_date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            elif ts:
                pub_date = str(ts)
        except:
            pass
        return {
            "ticker": ticker,
            "title": a.get("title") or content.get("title") or "",
            "summary": content.get("summary") or a.get("summary") or "",
            "publisher": a.get("publisher") or content.get("provider", {}).get("displayName") or "",
            "url": url,
            "published": pub_date,
        }

    def gnews_fallback(ticker: str, max_results: int = 8) -> list:
        """Fallback: search GNews free API (no key needed for basic use)."""
        try:
            import urllib.request, urllib.parse
            query = urllib.parse.quote(f"{ticker} stock")
            url = f"https://gnews.io/api/v4/search?q={query}&lang=en&max={max_results}&apikey=free"
            # GNews free doesn't need a key for very limited use; if blocked use RSS
            # Use Yahoo Finance RSS as a more reliable free fallback
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
            req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                import xml.etree.ElementTree as ET
                tree = ET.parse(resp)
                root = tree.getroot()
                items = root.findall(".//item")
                articles = []
                for item in items[:max_results]:
                    title = item.findtext("title") or ""
                    link = item.findtext("link") or ""
                    pub = item.findtext("pubDate") or ""
                    desc = item.findtext("description") or ""
                    if title:
                        articles.append({
                            "ticker": ticker,
                            "title": title,
                            "summary": desc,
                            "publisher": "Yahoo Finance",
                            "url": link,
                            "published": pub,
                        })
                return articles
        except Exception as e:
            print(f"RSS fallback error for {ticker}: {e}")
            return []

    for ticker in tickers_list:
        result["sections"][ticker] = []
        try:
            t = yf.Ticker(ticker)
            raw_articles = t.news or []
            parsed = [normalize_article(a, ticker) for a in raw_articles[:15]]
            # Filter out articles with no title or url
            parsed = [a for a in parsed if a["title"] and a["url"]]
            if parsed:
                result["sections"][ticker] = parsed
            else:
                # yfinance returned nothing, try Finnhub first, then RSS
                print(f"yfinance news empty for {ticker}, trying Finnhub fallback")
                finnhub_articles = _finnhub_fallback(ticker)
                if finnhub_articles:
                    result["sections"][ticker] = finnhub_articles
                else:
                    result["sections"][ticker] = gnews_fallback(ticker)
        except Exception as e:
            print(f"News error for {ticker}: {e}")
            finnhub_articles = _finnhub_fallback(ticker)
            result["sections"][ticker] = finnhub_articles or gnews_fallback(ticker)

    # Build flat articles list for backward compat (NewsFeed uses this)
    all_articles = []
    for ticker, arts in result["sections"].items():
        all_articles.extend(arts)
    result["articles"] = all_articles

    return result



@app.get("/prices")
def get_prices_live(tickers: str = "AAPL"):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for ticker in tickers_list[:20]:
        try:
            t = yf.Ticker(ticker)
            info = t.fast_info
            price = safe_float(getattr(info, "last_price", 0) or 0)
            prev_close = safe_float(getattr(info, "previous_close", 0) or 0)
            if price > 0 and prev_close > 0:
                change = price - prev_close
                pct = (change / prev_close) * 100
            else:
                change = 0.0
                pct = 0.0
            if price > 0:
                result[ticker] = {
                    "price": safe_float(price),
                    "change": safe_float(change),
                    "pct": safe_float(pct),
                }
        except Exception as e:
            print(f"Price error for {ticker}: {e}")
    return result

@app.get("/search-ticker")
def search_ticker(q: str = ""):
    if not q or len(q) < 1:
        return {"results": []}
    try:
        results = yf.Search(q, max_results=8)
        quotes = results.quotes if hasattr(results, "quotes") else []
        out = []
        for r in quotes[:8]:
            symbol = r.get("symbol", "")
            name = r.get("longname") or r.get("shortname") or symbol
            exchange = r.get("exchange", "")
            qtype = r.get("quoteType", "EQUITY")
            if symbol:
                out.append({"ticker": symbol, "name": name, "exchange": exchange, "type": qtype})
        return {"results": out}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}


class ReportRequest(BaseModel):
    portfolio_context: dict = {}
    user_goals: dict = {}


@app.post("/generate-report")
def generate_report(req: ReportRequest, request: Request):
    from fastapi.responses import StreamingResponse
    import io

    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "generate-report", 10, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before trying again.")
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)
        ctx = req.portfolio_context
        goals = req.user_goals

        tickers = ctx.get("tickers", [])
        weights = ctx.get("weights", [])
        ret = ctx.get("portfolio_return", 0)
        vol = ctx.get("portfolio_volatility", 0)
        sharpe = ctx.get("sharpe_ratio", (ret - 0.04) / max(vol, 0.001))
        dd = ctx.get("max_drawdown", 0)
        period = ctx.get("period", "1y")
        ind_returns = ctx.get("individual_returns", {})

        goals_text = ""
        if goals:
            age = goals.get("age", "")
            goal = goals.get("goal", "")
            risk = goals.get("riskTolerance", "")
            timeline = goals.get("timeline", "")
            if age:
                goals_text = f"\n\nInvestor Profile: Age {age}, Goal: {goal}, Risk tolerance: {risk}, Timeline: {timeline} years."

        def _report_label(t: str, w: float) -> str:
            kind = "cash/money market" if is_cash_ticker(t) else "stock/ETF"
            return f"{t} ({w:.1%}, {kind})"

        holdings_report = ", ".join(_report_label(t, w) for t, w in zip(tickers, weights))

        stock_perf = ""
        if ind_returns:
            stock_perf = "\n\nIndividual holding returns (CAGR):\n" + "\n".join(
                f"- {t}: {r*100:+.1f}%" for t, r in ind_returns.items()
            )

        prompt = f"""You are a senior portfolio analyst. Write a professional portfolio analysis report.

Portfolio ({period}): {holdings_report}
Annualized Return (CAGR): {ret:.2%}
Annualized Volatility: {vol:.2%}
Sharpe Ratio: {sharpe:.2f}
Max Drawdown: {dd:.2%}{stock_perf}{goals_text}

Write a full analysis with these sections:
## Executive Summary
## Performance Analysis
## Risk Assessment
## Portfolio Composition
## Strengths
## Areas for Improvement
## Conclusion

Rules:
- List all {len(tickers)} holdings with their exact weights and types in Portfolio Composition
- Label cash and money market positions (e.g. FDRXX, SPAXX) as cash equivalents, never as stocks
- Be specific with numbers and always mention the period when discussing returns
- Use bullet points (- item) for lists. 500-700 words total.
- Never use em dashes. Never use asterisks (*) or markdown bold/italic. Write in plain prose only.
- Use ## for section headers only. Never use # (single hash) headers."""

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        analysis_text = clean_ai_response(response.content[0].text)

        # ── Build PDF with ReportLab ──────────────────────────────────────────
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor, white, black
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

        BG      = HexColor("#0a0a0a")
        CARD_BG = HexColor("#1a1a1a")
        AMBER   = HexColor("#c9a84c")
        WHITE   = HexColor("#ffffff")
        BODY    = HexColor("#cccccc")
        DIM     = HexColor("#666666")
        RED     = HexColor("#e05c5c")
        GREEN   = HexColor("#5cb88a")
        BORDER  = HexColor("#2a2a2a")

        buf = io.BytesIO()
        W, H = A4  # 595 x 842 pt

        def make_doc():
            return SimpleDocTemplate(
                buf, pagesize=A4,
                leftMargin=24*mm, rightMargin=24*mm,
                topMargin=20*mm, bottomMargin=20*mm,
                title="Corvo Portfolio Report",
            )

        now_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
        ticker_str = " · ".join(tickers) if tickers else "Portfolio"

        S_TITLE   = ParagraphStyle("title",   fontName="Helvetica-Bold",   fontSize=28, textColor=AMBER,   leading=34, spaceAfter=10)
        S_SUB     = ParagraphStyle("sub",     fontName="Helvetica",        fontSize=9,  textColor=DIM,     spaceAfter=2, leading=13)
        S_SECTION = ParagraphStyle("section", fontName="Helvetica-Bold",   fontSize=11, textColor=AMBER,   spaceBefore=16, spaceAfter=6, leading=14)
        S_BODY    = ParagraphStyle("body",    fontName="Helvetica",        fontSize=11, textColor=BODY,    spaceAfter=5, leading=16)
        S_BULLET  = ParagraphStyle("bullet",  fontName="Helvetica",        fontSize=11, textColor=BODY,    spaceAfter=4, leading=16, leftIndent=14, firstLineIndent=-10)
        S_LABEL   = ParagraphStyle("label",   fontName="Helvetica-Bold",   fontSize=8,  textColor=DIM,     leading=11, spaceAfter=1)
        S_VALUE   = ParagraphStyle("value",   fontName="Helvetica-Bold",   fontSize=18, leading=22)
        S_FOOTER  = ParagraphStyle("footer",  fontName="Helvetica",        fontSize=8,  textColor=DIM,     alignment=TA_CENTER)

        # Metric color
        def metric_color(key: str, val: float) -> HexColor:
            if key == "return":  return GREEN if val >= 0 else RED
            if key == "sharpe":  return GREEN if val >= 1 else AMBER if val >= 0 else RED
            if key == "dd":      return RED
            return WHITE

        # Draw dark page background + amber left bar on every page
        def on_page(canvas, doc):
            canvas.saveState()
            canvas.setFillColor(BG)
            canvas.rect(0, 0, W, H, fill=1, stroke=0)
            canvas.setFillColor(AMBER)
            canvas.rect(0, 0, 4, H, fill=1, stroke=0)
            # Footer
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(DIM)
            footer = "Generated by Corvo · corvo.capital · Not financial advice"
            canvas.drawCentredString(W / 2, 14*mm, footer)
            canvas.drawRightString(W - 24*mm, 14*mm, f"Page {doc.page}")
            canvas.restoreState()

        story = []

        # ── Header ──────────────────────────────────────────────────────────
        story.append(Paragraph("CORVO", S_TITLE))
        story.append(Paragraph("Portfolio Intelligence Report", S_SUB))
        story.append(Spacer(1, 2*mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=AMBER))
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(f"<b>{ticker_str}</b>", ParagraphStyle("tickers", fontName="Helvetica-Bold", fontSize=14, textColor=WHITE, spaceAfter=3)))
        story.append(Paragraph(f"Generated {now_str}  ·  Period: {period.upper()}", S_SUB))
        story.append(Spacer(1, 6*mm))

        # ── Metric cards (2×2 table) ─────────────────────────────────────────
        total_w = weights if weights else [1.0] * len(tickers)
        wsum = sum(total_w) or 1
        norm_w = [w / wsum for w in total_w]

        ret_color = metric_color("return", ret)
        sh_color  = metric_color("sharpe", sharpe)

        def metric_cell(label: str, value: str, color: HexColor):
            return [
                Paragraph(f'<font color="#{color.hexval()[2:]}">{value}</font>',
                          ParagraphStyle("mv", fontName="Helvetica-Bold", fontSize=18, textColor=color, leading=22)),
                Paragraph(label.upper(),
                          ParagraphStyle("ml", fontName="Helvetica-Bold", fontSize=7, textColor=DIM, leading=10)),
            ]

        ret_sign = "+" if ret >= 0 else ""
        metric_data = [
            [metric_cell("Annual Return", f"{ret_sign}{ret*100:.2f}%", ret_color),
             metric_cell("Volatility",   f"{vol*100:.2f}%", WHITE)],
            [metric_cell("Sharpe Ratio", f"{sharpe:.2f}", sh_color),
             metric_cell("Max Drawdown", f"{dd*100:.2f}%", RED)],
        ]

        col_w = (W - 48*mm) / 2
        metric_table = Table(metric_data, colWidths=[col_w, col_w], rowHeights=[18*mm, 18*mm])
        metric_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
            ("BOX",        (0, 0), (0, 0),  0.5, BORDER),
            ("BOX",        (1, 0), (1, 0),  0.5, BORDER),
            ("BOX",        (0, 1), (0, 1),  0.5, BORDER),
            ("BOX",        (1, 1), (1, 1),  0.5, BORDER),
            ("LEFTPADDING",  (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ("TOPPADDING",   (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD_BG]),
            ("ROUNDEDCORNERS", (0, 0), (-1, -1), [4]),
        ]))
        story.append(metric_table)
        story.append(Spacer(1, 5*mm))

        # ── Allocation bar ───────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=0.3, color=BORDER))
        story.append(Paragraph("PORTFOLIO ALLOCATION", S_SECTION))
        for i, (ticker, w) in enumerate(zip(tickers, norm_w)):
            story.append(Paragraph(
                f'<font color="#c9a84c"><b>{ticker}</b></font>'
                f'<font color="#666666">{"&nbsp;" * 4}</font>'
                f'<font color="#cccccc">{w*100:.1f}%</font>',
                ParagraphStyle("alloc", fontName="Helvetica", fontSize=11, textColor=BODY, spaceAfter=4, leading=14)
            ))

        # Individual returns (if any)
        if ind_returns:
            story.append(Spacer(1, 3*mm))
            story.append(HRFlowable(width="100%", thickness=0.3, color=BORDER))
            story.append(Paragraph("INDIVIDUAL PERFORMANCE", S_SECTION))
            sorted_ret = sorted(ind_returns.items(), key=lambda x: -x[1])
            for t, r in sorted_ret:
                rv = r * 100
                col = "#5cb88a" if rv >= 0 else "#e05c5c"
                sign = "+" if rv >= 0 else ""
                story.append(Paragraph(
                    f'<font color="#c9a84c"><b>{t}</b></font>'
                    f'<font color="#666666">{"&nbsp;" * 4}</font>'
                    f'<font color="{col}">{sign}{rv:.1f}%</font>',
                    ParagraphStyle("iret", fontName="Helvetica", fontSize=11, textColor=BODY, spaceAfter=4, leading=14)
                ))

        # ── AI Analysis ──────────────────────────────────────────────────────
        story.append(Spacer(1, 3*mm))
        story.append(HRFlowable(width="100%", thickness=0.3, color=BORDER))
        story.append(Paragraph("AI ANALYSIS", S_SECTION))

        # Parse the analysis text into paragraphs
        for line in analysis_text.split("\n"):
            stripped = line.strip()
            if not stripped:
                story.append(Spacer(1, 2*mm))
                continue
            if stripped.startswith("## "):
                text = stripped[3:]
                story.append(Spacer(1, 2*mm))
                story.append(Paragraph(text.upper(), S_SECTION))
                story.append(HRFlowable(width="100%", thickness=0.3, color=AMBER))
                story.append(Spacer(1, 1*mm))
            elif stripped.startswith("- ") or stripped.startswith("• "):
                text = stripped[2:].replace("**", "")
                story.append(Paragraph(f"▸  {text}", S_BULLET))
            else:
                text = stripped.replace("**", "")
                story.append(Paragraph(text, S_BODY))

        doc = make_doc()
        doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

        buf.seek(0)
        filename = f"corvo_{'_'.join(tickers[:4])}_report.pdf"
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Daily chat limit helpers ───────────────────────────────────────────────────

BASE_DAILY_CHAT_LIMIT = 15

def _sb_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def _require_admin_key(request: Request) -> None:
    """Raise 401 unless X-Admin-Key header matches SUPABASE_SERVICE_ROLE_KEY."""
    key = request.headers.get("X-Admin-Key", "")
    if not SUPABASE_SERVICE_KEY or key != SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _verify_jwt_user(request: Request) -> str:
    """Extract and verify user_id from Authorization Bearer token via Supabase. Raises 401 on failure."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header[7:]
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Auth service not configured")
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_SERVICE_KEY},
        timeout=5,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = resp.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not extract user from token")
    return user_id


# Per-user daily rate limit for image parsing {user_id: {"date": str, "count": int}}
_image_parse_daily: dict = {}

def get_daily_chat_limit(user_id: str) -> int:
    """Return effective daily chat limit: base 15 + bonus (max 40 total)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return BASE_DAILY_CHAT_LIMIT
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=bonus_messages_per_day",
            headers=_sb_headers(), timeout=5,
        )
        if resp.status_code == 200:
            rows = resp.json()
            if rows:
                bonus = rows[0].get("bonus_messages_per_day") or 0
                return min(BASE_DAILY_CHAT_LIMIT + int(bonus), 40)
    except Exception as e:
        print(f"[chat-limit] get_daily_chat_limit error: {e}")
    return BASE_DAILY_CHAT_LIMIT


def get_daily_chat_count(user_id: str) -> int:
    """Return messages sent by this user today (UTC day boundary)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return 0
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/chat_usage?user_id=eq.{user_id}&created_at=gte.{today}T00:00:00Z&select=id",
            headers={**_sb_headers(), "Prefer": "count=exact"},
            timeout=5,
        )
        if resp.status_code == 200:
            content_range = resp.headers.get("Content-Range", "")
            if "/" in content_range:
                return int(content_range.split("/")[1])
            return len(resp.json())
    except Exception as e:
        print(f"[chat-limit] get_daily_chat_count error: {e}")
    return 0


def insert_chat_usage(user_id: str):
    """Record one chat message for this user in chat_usage."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/chat_usage",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"user_id": user_id},
            timeout=5,
        )
    except Exception as e:
        print(f"[chat-limit] insert_chat_usage error: {e}")


def process_referral_bonus(user_id: str, referral_code: str):
    """On a user's first portfolio analysis, give the referrer +5 bonus messages (max 25 bonus)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id or not referral_code:
        return
    try:
        # Check if this user has already been counted as a referral
        chk = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=referral_credited",
            headers=_sb_headers(), timeout=5,
        )
        if chk.status_code != 200:
            return
        rows = chk.json()
        if not rows or rows[0].get("referral_credited"):
            return  # already credited or user not found

        # Find referrer: referral_code is first 8 hex chars of their UUID (without dashes)
        ref_prefix = f"{referral_code[:8]}-"  # UUID starts with "XXXXXXXX-"
        ref_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=ilike.{ref_prefix}%&select=id,bonus_messages_per_day",
            headers=_sb_headers(), timeout=5,
        )
        if ref_resp.status_code != 200:
            return
        ref_rows = ref_resp.json()
        if not ref_rows:
            return
        referrer_id = ref_rows[0]["id"]
        if referrer_id == user_id:
            return  # self-referral guard

        current_bonus = int(ref_rows[0].get("bonus_messages_per_day") or 0)
        new_bonus = min(current_bonus + 5, 25)

        # Increment referrer bonus
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{referrer_id}",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"bonus_messages_per_day": new_bonus, "updated_at": datetime.now(timezone.utc).isoformat()},
            timeout=5,
        )
        # Mark referred user as credited
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"referral_credited": True, "updated_at": datetime.now(timezone.utc).isoformat()},
            timeout=5,
        )
        print(f"[referral] credited referrer {referrer_id} +5 bonus (total: {new_bonus}) for new user {user_id}")
    except Exception as e:
        print(f"[referral] process_referral_bonus error: {e}")


class ReferralRedeemRequest(BaseModel):
    referrer_code: str
    new_user_id: str

@app.post("/referrals/redeem")
def redeem_referral(req: ReferralRedeemRequest, request: Request):
    """Credit the referrer +5 bonus messages when a new user signs up via their link."""
    new_user_id = _verify_jwt_user(request)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not req.referrer_code:
        return {"success": False, "detail": "Missing parameters"}
    req.new_user_id = new_user_id
    try:
        chk = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{req.new_user_id}&select=referral_credited",
            headers=_sb_headers(), timeout=5,
        )
        if chk.status_code == 200:
            rows = chk.json()
            if rows and rows[0].get("referral_credited"):
                return {"success": False, "detail": "Already credited"}

        ref_prefix = f"{req.referrer_code[:8]}-"
        ref_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=ilike.{ref_prefix}%&select=id,bonus_messages_per_day",
            headers=_sb_headers(), timeout=5,
        )
        if ref_resp.status_code != 200 or not ref_resp.json():
            return {"success": False, "detail": "Referrer not found"}
        ref_rows = ref_resp.json()
        referrer_id = ref_rows[0]["id"]
        if referrer_id == req.new_user_id:
            return {"success": False, "detail": "Self-referral not allowed"}

        current_bonus = int(ref_rows[0].get("bonus_messages_per_day") or 0)
        new_bonus = min(current_bonus + 5, 25)

        requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{referrer_id}",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"bonus_messages_per_day": new_bonus, "updated_at": datetime.now(timezone.utc).isoformat()},
            timeout=5,
        )
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{req.new_user_id}",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"referral_credited": True, "updated_at": datetime.now(timezone.utc).isoformat()},
            timeout=5,
        )
        print(f"[referral] redeem: credited referrer {referrer_id} +5 bonus (total: {new_bonus}) for new user {req.new_user_id}")
        return {"success": True}
    except Exception as e:
        print(f"[referral] redeem error: {e}")
        return {"success": False, "detail": "Internal error"}


@app.get("/referrals")
def get_referrals(user_id: str = ""):
    """Return referral data for a user."""
    if not user_id or not SUPABASE_URL:
        return {"referral_link": "", "referrals_count": 0, "bonus_messages": 0}
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&select=id,referred_id,created_at",
            headers=_sb_headers(), timeout=5,
        )
        referrals = resp.json() if resp.status_code == 200 else []
        code = user_id.replace("-", "")[:8]
        return {
            "referral_link": f"https://corvo.capital/app?ref={code}",
            "referral_code": code,
            "referrals_count": len(referrals),
            "bonus_messages": len(referrals) * 5,
        }
    except Exception:
        code = user_id.replace("-", "")[:8]
        return {"referral_link": f"https://corvo.capital/app?ref={code}", "referral_code": code, "referrals_count": 0, "bonus_messages": 0}


class LifeEventsRequest(BaseModel):
    life_events: list = []


@app.get("/user/life-events/{user_id}")
def get_life_events(user_id: str, request: Request):
    """Return life events for a user. JWT required."""
    verified_id = _verify_jwt_user(request)
    if verified_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not SUPABASE_URL:
        return {"life_events": []}
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=life_events",
        headers=_sb_headers(), timeout=5,
    )
    if resp.status_code != 200 or not resp.json():
        return {"life_events": []}
    return {"life_events": resp.json()[0].get("life_events") or []}


@app.post("/user/life-events/{user_id}")
def set_life_events(user_id: str, body: LifeEventsRequest, request: Request):
    """Upsert life events for a user. JWT required."""
    verified_id = _verify_jwt_user(request)
    if verified_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not SUPABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        json={"life_events": body.life_events, "updated_at": datetime.now(timezone.utc).isoformat()},
        timeout=5,
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to update life events")
    return {"success": True}


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}
    user_goals: dict = {}
    market_context: str = ""
    user_id: str | None = None
    page_context: str = ""
    user_context: str = ""
    life_events: list = []

    def validate_message(self):
        if not self.message or not self.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        if len(self.message) > 4000:
            raise HTTPException(status_code=400, detail="Message too long (max 4000 characters)")


@app.post("/chat")
def chat(req: ChatRequest, request: Request):
    import json as _json
    req.validate_message()
    # Verify JWT if Authorization header is present; reject unverified self-reported user_id
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        verified_user_id = _verify_jwt_user(request)
        req.user_id = verified_user_id
    elif req.user_id:
        # user_id in body but no JWT to verify it — reject rather than trust self-reported id
        raise HTTPException(status_code=401, detail="Authorization header required when providing user_id")
    # Daily limit check (per-user via Supabase); fall back to IP rate limit for unauthenticated
    daily_limit = BASE_DAILY_CHAT_LIMIT
    daily_count = 0
    if req.user_id:
        daily_limit = get_daily_chat_limit(req.user_id)
        daily_count = get_daily_chat_count(req.user_id)
        if daily_count >= daily_limit:
            raise HTTPException(
                status_code=429,
                detail="Daily message limit reached. Invite a friend to get +5 more messages per day.",
            )
    else:
        ip = request.client.host if request.client else "unknown"
        if check_rate_limit(ip, "chat", 20, 3600):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before trying again.")

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)

    ctx = req.portfolio_context
    # Support goals from both portfolio_context (frontend passes it nested) and top-level
    goals = req.user_goals or ctx.get("goals") or {}
    tickers = ctx.get("tickers", [])
    weights = ctx.get("weights", [])
    ret = ctx.get("portfolio_return", 0)
    vol = ctx.get("portfolio_volatility", 0)
    sharpe = ctx.get("sharpe_ratio") or (ret - 0.04) / max(vol, 0.001)
    dd = ctx.get("max_drawdown", 0)
    period = ctx.get("period", "1y")
    benchmark_return = ctx.get("benchmark_return")
    health_score = ctx.get("health_score")

    # Build rich investor profile from onboarding data
    profile_lines = []
    if goals:
        age = goals.get("age", "")
        retirement_age = goals.get("retirementAge", "")
        salary = goals.get("salary", "")
        invested = goals.get("invested", "")
        monthly = goals.get("monthlyContribution", "")
        risk = goals.get("riskTolerance", "moderate")
        goal = goals.get("goal", "")
        if age:
            years_to_retire = int(retirement_age or 65) - int(age) if age else None
            profile_lines.append(f"Age: {age}" + (f", retiring at {retirement_age} ({years_to_retire} years away)" if retirement_age else ""))
        if salary:
            profile_lines.append(f"Salary: ${int(salary):,}/yr")
        if invested:
            profile_lines.append(f"Total invested: ${int(invested):,}")
        if monthly:
            profile_lines.append(f"Monthly contribution: ${int(monthly):,}")
        if risk:
            risk_label = {"conservative": "Conservative (capital preservation priority)", "moderate": "Moderate (balanced growth)", "aggressive": "Aggressive (maximum growth, high risk tolerance)"}.get(risk, risk)
            profile_lines.append(f"Risk tolerance: {risk_label}")
        if goal:
            goal_label = {"retirement": "Retirement", "wealth": "Wealth building", "income": "Passive income", "short": "Short-term gains"}.get(goal, goal)
            profile_lines.append(f"Investment goal: {goal_label}")

    investor_profile = ""
    if profile_lines:
        investor_profile = "\n\nINVESTOR PROFILE (from onboarding, always consider this in your answers):\n" + "\n".join(f"• {l}" for l in profile_lines)

    health_text = f"\n- Portfolio Health Score: {health_score}/100" if health_score is not None else ""
    market_text = f"\n\nREAL-TIME MARKET PRICES (fetched seconds ago):\n{req.market_context}" if req.market_context else ""

    portfolio_value = ctx.get("portfolio_value") or (goals.get("invested") if goals else None)
    beta = ctx.get("beta")
    individual_returns = ctx.get("individual_returns")
    rf_rate_ctx = ctx.get("rf_rate", 0.04)

    portfolio_value_text = f"\n- Portfolio Value: ${int(portfolio_value):,}" if portfolio_value is not None else ""
    beta_text = f"\n- Beta: {beta:.2f}" if beta is not None else ""
    individual_returns_text = ""
    if individual_returns and isinstance(individual_returns, dict):
        returns_list = ", ".join(f"{t}: {r:.1%}" for t, r in individual_returns.items() if r is not None)
        if returns_list:
            individual_returns_text = f"\n- Individual Returns (CAGR): {returns_list}"

    def _holding_label(t: str, w: float) -> str:
        kind = "cash/money market" if is_cash_ticker(t) else "ETF" if len(t) >= 3 and t.isupper() and not t.endswith("X") else "stock/ETF"
        return f"{t} ({w:.1%}, {kind})"

    holdings_str = ', '.join(_holding_label(t, w) for t, w in zip(tickers, weights)) if tickers else "Not yet analyzed"

    if benchmark_return is not None:
        vs_bench = "outperformed" if ret > benchmark_return else "underperformed"
        benchmark_text = f"\n- Benchmark Return ({period}): {benchmark_return:.2%} — portfolio {vs_bench} by {abs(ret - benchmark_return):.2%}"
    else:
        benchmark_text = ""

    weights_equal = len(set(round(w, 3) for w in weights)) == 1 if weights else False
    weights_note = " (equally weighted)" if weights_equal else ""

    # Detect tied largest holdings to prevent incorrect "single largest holding" phrasing
    tied_largest_note = ""
    if tickers and weights and len(weights) > 1:
        max_w = max(weights)
        tied = [t for t, w in zip(tickers, weights) if abs(w - max_w) < 0.001]
        if len(tied) == len(tickers):
            tied_str = ", ".join(tied)
            tied_largest_note = f"\n- CRITICAL: All holdings ({tied_str}) are equally weighted at {max_w:.1%} each. There is NO single largest holding. Never refer to any one holding as 'the largest'."
        elif len(tied) > 1:
            tied_str = " and ".join(tied)
            tied_largest_note = f"\n- CRITICAL: {tied_str} are tied as the largest holdings at {max_w:.1%} each. Do not single out any one of them as 'the largest holding'."

    page_context_text = f"\n\nCURRENT PAGE: {req.page_context}" if req.page_context else ""
    user_context_block = f"\n\n{req.user_context}" if req.user_context else ""

    # Build life events block
    life_events_text = ""
    if req.life_events:
        _event_labels = {
            "buying_home": "Buying a home",
            "getting_married": "Getting married",
            "having_baby": "Having a baby",
            "starting_business": "Starting a business",
            "changing_jobs": "Changing jobs",
            "retiring_soon": "Retiring soon",
            "paying_off_debt": "Paying off debt",
            "building_emergency_fund": "Building an emergency fund",
            "sending_kids_to_college": "Sending kids to college",
        }
        _timeline_labels = {
            "within_1_year": "within 1 year",
            "1_2_years": "in 1-2 years",
            "2_5_years": "in 2-5 years",
            "5_plus_years": "in 5+ years",
        }
        _event_parts = []
        for _e in req.life_events:
            _t = _e.get("type", "") if isinstance(_e, dict) else ""
            if _t == "nothing_major" or not _t:
                continue
            _tl = _timeline_labels.get(_e.get("timeline", ""), "") if isinstance(_e, dict) else ""
            _label = _event_labels.get(_t, _t.replace("_", " ").title())
            _event_parts.append(f"{_label}{' ' + _tl if _tl else ''}")
        if _event_parts:
            life_events_text = "\n\nACTIVE LIFE EVENTS: " + "; ".join(_event_parts) + "\n(Factor these into advice naturally. Buying a home soon means flag liquidity needs. Retiring soon means flag sequence-of-returns risk. Having a baby means flag emergency fund importance. Starting a business means flag concentration and cash runway.)"

    system = f"""You are Corvo AI, a world-class personal portfolio advisor. You have full access to this investor's portfolio data, financial profile, saved portfolios, alerts, and targets. You also have web search capability to look up current prices, historical events, earnings, analyst ratings, news, and any market data needed to answer questions accurately.{user_context_block}

CURRENT PORTFOLIO:
- Holdings{weights_note}: {holdings_str}
- Period: {period}
- Annualized Return (CAGR): {ret:.2%}
- Annualized Volatility: {vol:.2%}
- Sharpe Ratio: {sharpe:.2f} (risk-free rate used: {rf_rate_ctx:.2%})
- Max Drawdown: {dd:.2%}{portfolio_value_text}{benchmark_text}{health_text}{beta_text}{individual_returns_text}{tied_largest_note}{market_text}{investor_profile}{life_events_text}{page_context_text}

HOW TO RESPOND:
• Address the user by their first name when it is known.
• Never say "I don't know which page you're on", "could you tell me more about your portfolio", or "I don't have access to your data" — all context is provided above.
• Maximum 150-200 words per response. Hard limit.
• Lead with the direct answer or recommendation in the first 1-2 sentences. Never recap what the user asked. Never open with "great question", "let me break this down", or any other filler.
• Support the answer with 2-3 sentences of reasoning using the user's actual portfolio data. End with one forward-looking sentence if relevant.
• Write like a sharp analyst giving a quick take in a meeting, not a written report. Be direct: say "I think NVDA will struggle because X" not "it depends on many factors."
• Never say "Let me pull up the latest data" or similar filler phrases. Just answer.
• Use web search to back up claims about market conditions, historical price action, earnings, analyst consensus, and economic events. Never say "I don't have access to" or "I can't check" — search instead.
• Use the user's actual numbers (CAGR, weights, prices, dollar amounts when portfolio_value is known) but do not list every analyst target for every ticker unless asked.
• State the analysis period when discussing returns. Compare to benchmark when available.
• Verify weights before stating them. If equally weighted, say so. Never single out one holding as "the largest" when multiple share the same weight.
• Never confuse cash/money market positions with equity.
• Reference the investor's goals, age, and timeline in every substantive response.
• When the user asks about their alerts or price targets, use the ACTIVE PRICE ALERTS and PRICE TARGETS data above.
• Say "Not financial advice." once if this is a new conversation. Never repeat it in follow-up messages.
• No bullet points or lists unless the user explicitly asks for a list. Write in plain prose only.
• No headers, no sub-sections, no bold formatting.
• No em dashes. No asterisks. No emoji."""

    messages = [{"role": h["role"], "content": h["content"]} for h in req.history]
    messages.append({"role": "user", "content": req.message})

    _user_id = req.user_id
    _daily_count = daily_count
    _daily_limit = daily_limit

    def generate():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system,
                messages=messages,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
            ) as stream:
                for text in stream.text_stream:
                    # Strip em dashes and asterisks inline
                    cleaned = text.replace("—", ",").replace("*", "")
                    if cleaned:
                        yield f"data: {_json.dumps({'chunk': cleaned})}\n\n"

            if _user_id:
                insert_chat_usage(_user_id)

            messages_used_now = _daily_count + 1 if _user_id else None
            yield f"data: {_json.dumps({'done': True, 'messages_used': messages_used_now, 'messages_limit': _daily_limit if _user_id else None})}\n\n"

        except Exception as e:
            print(f"Chat stream error: {e}")
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"

    from fastapi.responses import StreamingResponse as _SR
    return _SR(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/chat/usage")
def chat_usage(user_id: str = ""):
    """Return daily message usage for the authenticated user."""
    if not user_id:
        return {"messages_used": 0, "messages_limit": BASE_DAILY_CHAT_LIMIT}
    limit = get_daily_chat_limit(user_id)
    count = get_daily_chat_count(user_id)
    return {"messages_used": count, "messages_limit": limit}


class GenerateQuestionsRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    count: int = 5
    previously_wrong: list[str] = []
    exclude_previous: list[str] = []  # Previous question text to avoid repeating


@app.post("/generate-questions")
def generate_questions(req: GenerateQuestionsRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "generate-questions", 10, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in an hour.")

    if req.difficulty not in ("beginner", "intermediate", "advanced"):
        raise HTTPException(status_code=400, detail="difficulty must be beginner, intermediate, or advanced")
    count = max(1, min(20, req.count))

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
    client = anthropic.Anthropic(api_key=api_key)

    wrong_clause = ""
    if req.previously_wrong:
        wrong_clause = (
            f" Focus especially on these concepts where the user struggled: "
            f"{', '.join(req.previously_wrong)}."
        )

    exclude_clause = ""
    if req.exclude_previous:
        sample = "; ".join(req.exclude_previous[:5])
        exclude_clause = f" Do NOT reuse or closely paraphrase any of these questions from yesterday: {sample}."

    system = "You are a financial education expert. Return ONLY valid JSON, no other text, no markdown fences."
    prompt = (
        f"Generate {count} multiple choice questions about {req.topic} at {req.difficulty} level."
        f"{wrong_clause}{exclude_clause} "
        f"IMPORTANT RULES for answer options:\n"
        f"1. All 4 options must be similar in length — within 3-4 words of each other.\n"
        f"2. The correct answer must NOT be the longest option. Vary which position (0,1,2,3) is correct across questions.\n"
        f"3. Wrong answers must be plausible and specific, not obviously wrong.\n"
        f"4. Never make the correct answer stand out by being more detailed or verbose than the others.\n"
        f"Return ONLY a JSON array, no other text:\n"
        f'[{{"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}}]'
    )

    def call_claude() -> str:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()

    raw = call_claude()
    try:
        questions = json.loads(raw)
    except json.JSONDecodeError:
        raw = call_claude()
        try:
            questions = json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to generate valid questions. Please try again.")

    if not isinstance(questions, list):
        raise HTTPException(status_code=500, detail="Unexpected response format.")

    return {"questions": questions}


@app.post("/parse-portfolio-image")
def parse_portfolio_image(body: dict, request: Request):
    # Rate limit: max 10 per user per day (in-memory)
    user_id = body.get("user_id", "") or (request.client.host if request.client else "anon")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = _image_parse_daily.get(user_id)
    if record and record["date"] == today:
        if record["count"] >= 10:
            raise HTTPException(status_code=429, detail="Image parse limit reached (10/day)")
        record["count"] += 1
    else:
        _image_parse_daily[user_id] = {"date": today, "count": 1}
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)
        image_b64 = body.get("image_base64", "")
        media_type = body.get("media_type", "image/jpeg")

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": image_b64}
                    },
                    {
                        "type": "text",
                        "text": "Extract all stock/ETF/crypto holdings from this brokerage screenshot. Return ONLY a JSON array like: [{\"ticker\": \"AAPL\", \"weight\": 0.25}]. Use percentage allocations as weights (0-1). If no percentages shown, distribute equally. Return only the JSON array, nothing else."
                    }
                ]
            }]
        )
        import re
        text = response.content[0].text.strip()
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            assets = json.loads(match.group())
            return {"assets": assets}
        return {"assets": []}
    except Exception as e:
        print(f"Image parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Shared email HTML builder ──────────────────────────────────────────────────

def _email_html(
    heading: str,
    body_lines: list[str],
    cta_text: str,
    cta_url: str,
    user_id: str = "",
    label: str = "",
    unsub_type: str = "",
    email_theme: str = "light",
) -> str:
    """Build a minimal HTML email compatible with Gmail, Outlook, and Apple Mail."""
    amber = "#c9a84c"
    if email_theme == "light":
        bg           = "#f4f3ef"
        card         = "#ffffff"
        text         = "#1a1918"
        muted        = "#5a5752"
        bdr          = "#dbd8ce"
        footer_color = "#888"
        footer_link  = "#777"
    else:
        bg           = "#0a0a0a"
        card         = "#111111"
        text         = "#e8e0cc"
        muted        = "#888880"
        bdr          = "#1e1e1e"
        footer_color = "#444"
        footer_link  = "#555"
    mono  = "'Courier New', Courier, monospace"
    sans  = "Arial, Helvetica, sans-serif"
    if unsub_type and user_id:
        unsub = f"https://corvo.capital/unsubscribe?user_id={user_id}&type={unsub_type}"
    elif user_id:
        unsub = f"https://corvo.capital/unsubscribe?user_id={user_id}"
    else:
        unsub = "https://corvo.capital/unsubscribe"
    body_rows = "".join(
        f'<tr><td style="padding:0 0 12px 0;font-family:{sans};font-size:14px;'
        f'color:{muted};line-height:1.75;">{line}</td></tr>'
        for line in body_lines
    )
    label_row = (
        f'<tr><td style="padding:0 0 8px;font-family:{sans};font-size:10px;'
        f'letter-spacing:2.5px;color:{muted};text-transform:uppercase;">{label}</td></tr>'
        if label else ""
    )
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:{bg};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{bg};">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0 0 4px;font-family:{mono};font-size:22px;font-weight:900;letter-spacing:6px;color:{amber};">CORVO</p>
          <p style="margin:0;font-family:{sans};font-size:9px;letter-spacing:3px;color:#888;text-transform:uppercase;">Portfolio Intelligence</p>
        </td></tr>

        <tr><td style="background:{card};border-radius:10px;border:1px solid {bdr};padding:28px 28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            {label_row}
            <tr><td style="padding-bottom:16px;font-family:{sans};font-size:20px;font-weight:700;color:{text};line-height:1.3;">{heading}</td></tr>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              {body_rows}
            </table>
            <tr><td style="padding-top:22px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="border-radius:8px;background-color:{amber};">
                  <a href="{cta_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;font-family:{sans};font-size:13px;font-weight:700;color:#000;text-decoration:none;border-radius:8px;letter-spacing:0.4px;">{cta_text}</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding-top:22px;">
          <p style="margin:0;font-family:{sans};font-size:11px;color:{footer_color};line-height:1.8;text-align:center;">
            corvo.capital &nbsp;&middot;&nbsp; Not financial advice &nbsp;&middot;&nbsp;
            <a href="{unsub}" style="color:{footer_link};text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _resend(to: str, subject: str, html: str, from_addr: str = "Corvo <hello@corvo.capital>") -> bool:
    """Send an email via Resend. Returns True on success."""
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        print(f"[resend] RESEND_API_KEY not set, skipping email to {to}")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": from_addr, "to": [to], "subject": subject, "html": html},
            timeout=12,
        )
        if resp.status_code in (200, 201):
            print(f"[resend] sent '{subject}' (id={resp.json().get('id')})")
            return True
        print(f"[resend] error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as e:
        print(f"[resend] exception sending to {to}: {e}")
        return False


def _welcome_email_html(name: str, user_id: str = "", email_theme: str = "light") -> str:
    """Build the welcome email HTML with the clean headline + action-steps layout."""
    amber = "#c9a84c"
    if email_theme == "light":
        bg           = "#f4f3ef"
        card         = "#ffffff"
        text         = "#1a1918"
        muted        = "#5a5752"
        bdr          = "#dbd8ce"
        footer_color = "#888"
        footer_link  = "#777"
    else:
        bg           = "#0a0a0a"
        card         = "#111111"
        text         = "#e8e0cc"
        muted        = "#888880"
        bdr          = "#1e1e1e"
        footer_color = "#444"
        footer_link  = "#555"
    mono = "'Courier New', Courier, monospace"
    sans = "Arial, Helvetica, sans-serif"
    unsub = f"https://corvo.capital/unsubscribe?user_id={user_id}" if user_id else "https://corvo.capital/unsubscribe"
    actions = [("01", "Add a ticker"), ("02", "Set your weights"), ("03", "Hit Analyze")]
    action_rows = ""
    for i, (num, label) in enumerate(actions):
        top_pad = "0" if i == 0 else "12px"
        action_rows += (
            f'<tr>'
            f'<td style="padding:{top_pad} 0 12px;width:32px;font-family:{mono};font-size:11px;'
            f'font-weight:700;color:{amber};vertical-align:top;">{num}</td>'
            f'<td style="padding:{top_pad} 0 12px;font-family:{sans};font-size:14px;'
            f'color:{muted};line-height:1.6;">{label}</td>'
            f'</tr>'
        )
        if i < len(actions) - 1:
            action_rows += (
                f'<tr><td colspan="2" style="height:1px;background:{bdr};padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
            )
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:{bg};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{bg};">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0 0 4px;font-family:{mono};font-size:22px;font-weight:900;letter-spacing:6px;color:{amber};">CORVO</p>
          <p style="margin:0;font-family:{sans};font-size:9px;letter-spacing:3px;color:#888;text-transform:uppercase;">Portfolio Intelligence</p>
        </td></tr>

        <tr><td style="background:{card};border-radius:10px;border:1px solid {bdr};padding:32px 28px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:6px;font-family:{sans};font-size:11px;letter-spacing:2px;color:{muted};text-transform:uppercase;">Welcome, {name}</td></tr>
            <tr><td style="padding-bottom:24px;font-family:{sans};font-size:22px;font-weight:700;color:{text};line-height:1.25;">Your portfolio, with a point of view.</td></tr>

            <tr><td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                {action_rows}
              </table>
            </td></tr>

            <tr><td>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="border-radius:8px;background-color:{amber};">
                  <a href="https://corvo.capital/app" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;padding:12px 28px;font-family:{sans};font-size:13px;font-weight:700;color:#000;text-decoration:none;border-radius:8px;letter-spacing:0.4px;">Open Corvo</a>
                </td></tr>
              </table>
            </td></tr>

          </table>
        </td></tr>

        <tr><td align="center" style="padding-top:22px;">
          <p style="margin:0;font-family:{sans};font-size:11px;color:{footer_color};line-height:1.8;text-align:center;">
            corvo.capital &nbsp;&middot;&nbsp; Not financial advice &nbsp;&middot;&nbsp;
            <a href="{unsub}" style="color:{footer_link};text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Welcome Email ──────────────────────────────────────────────────────────────

class WelcomeEmailRequest(BaseModel):
    email: str
    display_name: str | None = None
    user_id: str | None = None


@app.post("/send-welcome-email")
def send_welcome_email(req: WelcomeEmailRequest):
    """Send a welcome email to a new Corvo user via Resend."""
    print(f"[send-welcome-email] called")
    name = req.display_name or req.email.split("@")[0]
    html = _welcome_email_html(name=name, user_id=req.user_id or "", email_theme="light")
    ok = _resend(req.email, "Welcome to Corvo", html)
    return {"ok": ok}


# ── Notify-me (email capture) ─────────────────────────────────────────────────
class NotifyMeRequest(BaseModel):
    email: str

@app.post("/notify-me")
def notify_me(req: NotifyMeRequest):
    """Add an email to the notify_list table (upsert, ignore duplicates)."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/notify_list",
                headers={**_sb_headers(), "Prefer": "resolution=ignore-duplicates"},
                json={"email": email},
                timeout=5,
            )
        except Exception as e:
            print(f"[notify-me] Supabase insert failed: {e}")
    return {"ok": True}


SECTOR_PEERS: dict[str, list[str]] = {
    "Technology": ["AAPL","MSFT","NVDA","GOOGL","META","AMD","INTC","ORCL","CRM","ADBE","QCOM","TXN","IBM","NOW","INTU"],
    "Financial Services": ["JPM","BAC","GS","MS","WFC","C","AXP","V","MA","BRK-B","SCHW"],
    "Healthcare": ["JNJ","PFE","MRK","ABBV","LLY","TMO","UNH","AMGN","BMY","GILD","ISRG","REGN"],
    "Consumer Cyclical": ["AMZN","TSLA","HD","MCD","NKE","SBUX","TGT","COST","LOW","F","GM","BKNG","CMG"],
    "Communication Services": ["GOOGL","META","NFLX","DIS","T","VZ","CMCSA"],
    "Industrials": ["BA","CAT","GE","MMM","HON","UPS","FDX","RTX","DE"],
    "Consumer Defensive": ["WMT","PG","KO","PEP","MO","PM","CL"],
    "Energy": ["XOM","CVX","COP","OXY","SLB","EOG"],
    "Utilities": ["NEE","DUK","SO","D"],
    "Real Estate": ["AMT","PLD","CCI","EQIX","SPG"],
    "Basic Materials": ["LIN","APD","SHW","FCX","NEM","DOW"],
}

# ── Stock detail endpoint ──────────────────────────────────────────────────────
@app.get("/stock/{ticker}")
def stock_detail(ticker: str, request: Request):
    """Return rich stock info for a single ticker using yfinance .info dict."""
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "stock-detail", 60, 3600):
        raise HTTPException(status_code=429, detail="Rate limit: 60 requests/hr")

    ticker = ticker.upper().strip()
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        def si(key, fallback=None):
            v = info.get(key, fallback)
            return safe_float(v) if isinstance(v, (int, float)) else (v if v else fallback)

        # Analyst rating normalisation
        rec = (info.get("recommendationKey") or "").lower()
        rating_map = {
            "strong_buy": "Strong Buy", "buy": "Buy", "hold": "Hold",
            "underperform": "Sell", "sell": "Sell", "strong_sell": "Strong Sell",
        }
        analyst_rating = rating_map.get(rec, "N/A")

        # Price + change
        current_price = si("currentPrice") or si("regularMarketPrice") or 0.0
        prev_close    = si("previousClose") or si("regularMarketPreviousClose") or current_price
        change        = current_price - prev_close
        change_pct    = (change / prev_close * 100) if prev_close else 0.0

        # 1D chart data (2 days to guarantee today's points)
        hist_1d = t.history(period="1d", interval="5m")
        chart_1d: list = []
        if not hist_1d.empty:
            chart_1d = [
                {"t": str(ts), "p": safe_float(row["Close"])}
                for ts, row in hist_1d.iterrows()
            ]

        def _round(v, digits):
            return round(v, digits) if v is not None else None

        # Earnings date: take first item if list (yfinance returns list of timestamps)
        earnings_raw = info.get("earningsDate")
        earnings_date = None
        if earnings_raw:
            if isinstance(earnings_raw, (list, tuple)) and len(earnings_raw) > 0:
                earnings_raw = earnings_raw[0]
            try:
                import datetime as _dt
                if hasattr(earnings_raw, "isoformat"):
                    earnings_date = earnings_raw.isoformat()
                else:
                    earnings_date = _dt.datetime.fromtimestamp(int(earnings_raw)).date().isoformat()
            except Exception:
                earnings_date = None

        divi_raw = si("dividendYield", None)
        rev_growth_raw = si("revenueGrowth", None)
        profit_margin_raw = si("profitMargins", None)
        insider_raw = si("heldPercentInsiders", None)
        gross_margin_raw = si("grossMargins", None)
        op_margin_raw = si("operatingMargins", None)

        # Analyst breakdown from recommendations DataFrame
        analyst_buy = analyst_hold = analyst_sell = 0
        try:
            recs = t.recommendations
            if recs is not None and not recs.empty:
                latest = recs.iloc[-1]
                analyst_buy = int(latest.get("strongBuy", 0)) + int(latest.get("buy", 0))
                analyst_hold = int(latest.get("hold", 0))
                analyst_sell = int(latest.get("sell", 0)) + int(latest.get("strongSell", 0))
        except Exception:
            pass

        # EPS history for earnings calendar
        eps_current = safe_float(si("trailingEps", 0))
        eps_forward = safe_float(si("forwardEps", 0))

        # Similar stocks from same sector
        sector = info.get("sector") or ""
        similar_stocks: list = []
        if sector and sector in SECTOR_PEERS:
            peers = [p for p in SECTOR_PEERS[sector] if p != ticker][:6]
            if peers:
                try:
                    ph = yf.download(peers if len(peers) > 1 else peers[0],
                                     period="2d", interval="1d", progress=False, auto_adjust=True)
                    closes = ph["Close"] if "Close" in ph.columns else ph
                    for peer in peers:
                        try:
                            if hasattr(closes, "columns") and peer in closes.columns:
                                vals = closes[peer].dropna().values
                            elif not hasattr(closes, "columns"):
                                vals = closes.dropna().values
                            else:
                                continue
                            if len(vals) >= 2:
                                price = float(vals[-1])
                                prev = float(vals[-2])
                                chg = round((price - prev) / prev * 100, 2) if prev else 0.0
                                similar_stocks.append({"ticker": peer, "price": round(price, 2), "change_pct": chg})
                            elif len(vals) == 1:
                                similar_stocks.append({"ticker": peer, "price": round(float(vals[-1]), 2), "change_pct": 0.0})
                        except Exception:
                            pass
                except Exception:
                    pass

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName") or ticker,
            "current_price": round(current_price, 4),
            "change": round(change, 4),
            "change_pct": round(change_pct, 4),
            "market_cap": si("marketCap", 0),
            "pe_ratio": _round(si("trailingPE", 0), 2),
            "forward_pe": _round(si("forwardPE", 0), 2),
            "eps": eps_current,
            "eps_forward": eps_forward,
            "dividend_yield": _round(divi_raw * 100, 2) if divi_raw is not None else 0.0,
            "week52_high": safe_float(si("fiftyTwoWeekHigh", 0)),
            "week52_low": safe_float(si("fiftyTwoWeekLow", 0)),
            "volume": si("volume", 0),
            "avg_volume": si("averageVolume", 0),
            "beta": safe_float(si("beta", 0)),
            "price_to_book": _round(si("priceToBook", 0), 2),
            "revenue": si("totalRevenue", 0),
            "net_income": si("netIncomeToCommon", 0),
            "analyst_rating": analyst_rating,
            "analyst_buy": analyst_buy,
            "analyst_hold": analyst_hold,
            "analyst_sell": analyst_sell,
            "num_analysts": _round(si("numberOfAnalystOpinions", 0), 0),
            "target_mean": _round(si("targetMeanPrice", 0), 2),
            "target_high": _round(si("targetHighPrice", 0), 2),
            "target_low": _round(si("targetLowPrice", 0), 2),
            "sector": sector,
            "industry": info.get("industry") or "",
            "chart_1d": chart_1d,
            # financials
            "earnings_date": earnings_date,
            "revenue_growth": _round(rev_growth_raw * 100, 1) if rev_growth_raw is not None else 0.0,
            "profit_margin": _round(profit_margin_raw * 100, 1) if profit_margin_raw is not None else 0.0,
            "gross_margin": _round(gross_margin_raw * 100, 1) if gross_margin_raw is not None else 0.0,
            "operating_margin": _round(op_margin_raw * 100, 1) if op_margin_raw is not None else 0.0,
            "debt_to_equity": _round(si("debtToEquity", 0), 2),
            "current_ratio": _round(si("currentRatio", 0), 2),
            "free_cashflow": si("freeCashflow", 0),
            "short_ratio": _round(si("shortRatio", 0), 2),
            "insider_ownership": _round(insider_raw * 100, 1) if insider_raw is not None else 0.0,
            "similar_stocks": similar_stocks,
            "bid": _round(si("bid", 0), 2),
            "ask": _round(si("ask", 0), 2),
        }
    except Exception as e:
        print(f"Stock detail error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stock/{ticker}/history")
def stock_history(ticker: str, period: str = "1y", request: Request = None):
    """OHLC history for charting: 1D/1W/1M/3M/1Y/5Y."""
    if request:
        ip = request.client.host if request.client else "unknown"
        if check_rate_limit(ip, "stock-history", 60, 3600):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

    ticker = ticker.upper().strip()
    period_map_h = {"1D": ("1d", "5m"), "1W": ("5d", "30m"), "1M": ("1mo", "1d"),
                    "3M": ("3mo", "1d"), "1Y": ("1y", "1wk"), "5Y": ("5y", "1mo")}
    p, interval = period_map_h.get(period.upper(), ("1y", "1wk"))
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=p, interval=interval)
        if hist.empty:
            return {"dates": [], "prices": [], "opens": [], "highs": [], "lows": [], "volumes": []}
        vols = []
        if "Volume" in hist.columns:
            for v in hist["Volume"].tolist():
                try:
                    vols.append(int(v) if v is not None else 0)
                except Exception:
                    vols.append(0)
        return {
            "dates": [str(ts) for ts in hist.index],
            "prices": safe_list(hist["Close"].tolist()),
            "opens": safe_list(hist["Open"].tolist()) if "Open" in hist.columns else [],
            "highs": safe_list(hist["High"].tolist()) if "High" in hist.columns else [],
            "lows": safe_list(hist["Low"].tolist()) if "Low" in hist.columns else [],
            "volumes": vols,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Analyst targets endpoint ───────────────────────────────────────────────────
_analyst_targets_cache: dict[str, tuple[dict, float]] = {}

@app.get("/analyst-targets/{ticker}")
def analyst_targets_endpoint(ticker: str, request: Request):
    """Analyst consensus price targets from Finnhub /stock/price-target and /stock/recommendation."""
    import time as _time_at
    ticker = ticker.upper().strip()
    now = _time_at.time()

    if ticker in _analyst_targets_cache:
        cached, ts = _analyst_targets_cache[ticker]
        if now - ts < 3600:
            return cached

    fh_key = os.environ.get("FINNHUB_API_KEY", "")
    if not fh_key:
        raise HTTPException(status_code=503, detail="Finnhub API key not configured")

    try:
        pt_resp = requests.get(
            f"https://finnhub.io/api/v1/stock/price-target?symbol={ticker}&token={fh_key}",
            timeout=8,
        )
        pt = pt_resp.json() if pt_resp.ok else {}

        rec_resp = requests.get(
            f"https://finnhub.io/api/v1/stock/recommendation?symbol={ticker}&token={fh_key}",
            timeout=8,
        )
        try:
            recs = rec_resp.json() if rec_resp.ok else []
            if not isinstance(recs, list):
                recs = []
        except Exception:
            recs = []

        current_price = 0.0
        yf_target_mean = None
        yf_target_high = None
        yf_target_low  = None
        yf_num_analysts = None
        try:
            info = yf.Ticker(ticker).info or {}
            current_price = float(safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or 0) or 0.0)
            yf_target_mean = safe_float(info.get("targetMeanPrice")) or None
            yf_target_high = safe_float(info.get("targetHighPrice")) or None
            yf_target_low  = safe_float(info.get("targetLowPrice"))  or None
            yf_num_analysts = int(info.get("numberOfAnalystOpinions") or 0) or None
        except Exception:
            pass

        # Finnhub targets preferred; fall back to yfinance when Finnhub returns nothing
        target_mean = safe_float(pt.get("targetMean")) or yf_target_mean or None
        target_high = safe_float(pt.get("targetHigh")) or yf_target_high or None
        target_low  = safe_float(pt.get("targetLow"))  or yf_target_low  or None

        latest_rec = recs[0] if recs else {}
        num_analysts = pt.get("numberAnalysts") or yf_num_analysts
        if not num_analysts and latest_rec:
            num_analysts = (
                int(latest_rec.get("buy", 0)) + int(latest_rec.get("hold", 0)) +
                int(latest_rec.get("sell", 0)) + int(latest_rec.get("strongBuy", 0)) +
                int(latest_rec.get("strongSell", 0))
            ) or None

        upside_pct = round((target_mean / current_price - 1) * 100, 2) if target_mean and current_price else None

        result = {
            "ticker": ticker,
            "current_price": round(current_price, 2),
            "target_mean": round(target_mean, 2) if target_mean else None,
            "target_high": round(target_high, 2) if target_high else None,
            "target_low":  round(target_low,  2) if target_low  else None,
            "upside_pct":  upside_pct,
            "num_analysts": int(num_analysts) if num_analysts else None,
            "buy":  int(latest_rec.get("buy", 0)) + int(latest_rec.get("strongBuy", 0)),
            "hold": int(latest_rec.get("hold", 0)),
            "sell": int(latest_rec.get("sell", 0)) + int(latest_rec.get("strongSell", 0)),
            "last_updated": pt.get("lastUpdated"),
        }

        _analyst_targets_cache[ticker] = (result, now)
        return result
    except Exception as e:
        print(f"Analyst targets error for {ticker}: {e}")
        # Return null data gracefully so frontend shows N/A instead of crashing
        return {
            "ticker": ticker, "current_price": 0,
            "target_mean": None, "target_high": None, "target_low": None,
            "upside_pct": None, "num_analysts": None,
            "buy": 0, "hold": 0, "sell": 0, "last_updated": None,
        }


_insider_cache: dict[str, tuple[dict, float]] = {}

@app.get("/insider-activity/{ticker}")
def insider_activity_endpoint(ticker: str, request: Request):
    """SEC Form 4 insider transactions. Finnhub primary (6-month window), yfinance fallback. 1-hour cache."""
    import time as _time_ins
    from datetime import timedelta
    ticker = ticker.upper().strip()
    now = _time_ins.time()

    if ticker in _insider_cache:
        cached, ts = _insider_cache[ticker]
        if now - ts < 3600:
            return cached

    processed = []

    # --- Finnhub primary source ---
    fh_key = os.environ.get("FINNHUB_API_KEY", "")
    if fh_key:
        try:
            from_date = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
            resp = requests.get(
                f"https://finnhub.io/api/v1/stock/insider-transactions?symbol={ticker}&from={from_date}&token={fh_key}",
                timeout=8,
            )
            if resp.ok:
                for t in resp.json().get("data", []):
                    code = str(t.get("transactionCode", "")).upper()
                    # P = open market purchase, S = open market sale, D = disposition (also a sell signal)
                    if code not in ("P", "S", "D"):
                        continue
                    change = t.get("change", 0) or 0
                    # "share" field is total shares after the transaction; use "change" first, fall back to "share"
                    shares = abs(int(float(change))) if change else abs(int(float(t.get("share", 0) or 0)))
                    if shares == 0:
                        continue
                    price = float(t.get("transactionPrice", 0) or 0)
                    txn_type = "buy" if code == "P" else "sell"
                    processed.append({
                        "name": t.get("name", "Unknown"),
                        "title": t.get("title", ""),
                        "transaction_type": txn_type,
                        "shares": shares,
                        "price": round(price, 2),
                        "date": t.get("transactionDate") or t.get("filingDate") or "",
                        "filing_date": t.get("filingDate") or "",
                        "total_value": round(shares * price, 2),
                    })
            else:
                print(f"[insider] Finnhub {ticker}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"[insider] Finnhub error for {ticker}: {e}")

    # --- yfinance fallback when Finnhub returns nothing ---
    if not processed:
        try:
            txns = yf.Ticker(ticker).insider_transactions
            if txns is not None and not txns.empty:
                for _, row in txns.iterrows():
                    txn = str(row.get("Transaction", row.get("Text", ""))).lower()
                    if not any(kw in txn for kw in ("purchase", "buy", "sale", "sell")):
                        continue
                    is_buy = "purchase" in txn or ("buy" in txn and "sell" not in txn)
                    shares_raw = row.get("Shares", row.get("#Shares", 0))
                    shares = int(abs(float(shares_raw or 0)))
                    if shares == 0:
                        continue
                    value = float(row.get("Value", 0) or 0)
                    price = value / shares if shares > 0 else 0.0
                    date_val = row.get("Date", "")
                    date_str = str(date_val)[:10] if date_val else ""
                    processed.append({
                        "name": str(row.get("Insider", row.get("Name", "Unknown"))),
                        "title": str(row.get("Position", row.get("Title", ""))),
                        "transaction_type": "buy" if is_buy else "sell",
                        "shares": shares,
                        "price": round(price, 2),
                        "date": date_str,
                        "filing_date": date_str,
                        "total_value": round(abs(value), 2),
                    })
        except Exception as e:
            print(f"[insider] yfinance fallback error for {ticker}: {e}")

    processed.sort(key=lambda x: x["date"], reverse=True)
    processed = processed[:30]

    result = {"ticker": ticker, "transactions": processed}
    _insider_cache[ticker] = (result, now)
    return result


_options_cache: dict[str, tuple[dict, float]] = {}

def _norm_cdf(x: float) -> float:
    """Standard normal CDF via math.erf (no scipy needed)."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def _bs_delta(S: float, K: float, expiry_str: str, r: float, sigma: float, is_call: bool) -> "float | None":
    """Black-Scholes delta. Returns None if inputs are invalid."""
    try:
        T = max((datetime.strptime(expiry_str, "%Y-%m-%d") - datetime.now()).days / 365.0, 1 / 365.0)
        if sigma <= 0 or S <= 0 or K <= 0:
            return None
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        raw = _norm_cdf(d1) if is_call else _norm_cdf(d1) - 1.0
        return round(raw, 4)
    except Exception:
        return None

def _finnhub_options(ticker: str, key: str, date: "str | None", current_price: float) -> "dict | None":
    """Try Finnhub options chain. Returns a result dict on success, None on any failure.
    Finnhub options require a premium subscription; this gracefully returns None for free-tier keys."""
    try:
        resp = requests.get(
            f"https://finnhub.io/api/v1/stock/option-chain?symbol={ticker}&token={key}",
            timeout=8,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data or not data.get("data"):
            return None

        expiry_dates = sorted({d["expirationDate"] for d in data["data"] if d.get("expirationDate")})
        if not expiry_dates:
            return None

        selected = date if (date and date in expiry_dates) else expiry_dates[0]
        block = next((d for d in data["data"] if d.get("expirationDate") == selected), None)
        if not block:
            return None

        price = current_price or safe_float(data.get("lastTradePrice") or 0)

        def _proc_fh(opts: list, is_call: bool) -> list[dict]:
            rows = []
            for o in opts:
                iv_dec = safe_float(o.get("IV") or o.get("impliedVolatility") or 0)
                iv_pct = round(iv_dec * 100, 2) if iv_dec else None
                strike = safe_float(o.get("strike") or 0)
                # Use delta from Finnhub if available (premium), otherwise Black-Scholes
                fh_delta = o.get("delta")
                delta = round(float(fh_delta), 4) if fh_delta is not None else (
                    _bs_delta(price, strike, selected, 0.05, iv_dec, is_call)
                    if price and strike and iv_dec else None
                )
                intrinsic = safe_float(o.get("intrinsicValue") or 0)
                rows.append({
                    "strike":            strike,
                    "lastPrice":         safe_float(o.get("lastPrice")),
                    "bid":               safe_float(o.get("bid")),
                    "ask":               safe_float(o.get("ask")),
                    "volume":            int(o.get("volume") or 0),
                    "openInterest":      int(o.get("openInterest") or 0),
                    "impliedVolatility": iv_pct,
                    "inTheMoney":        intrinsic > 0 if price else False,
                    "delta":             delta,
                })
            return sorted(rows, key=lambda r: r["strike"])

        calls_raw = block.get("options", {}).get("CALL", [])
        puts_raw  = block.get("options", {}).get("PUT", [])
        return {
            "ticker":           ticker,
            "current_price":    round(price, 4),
            "expiration_dates": expiry_dates,
            "selected_date":    selected,
            "calls":            _proc_fh(calls_raw, True),
            "puts":             _proc_fh(puts_raw, False),
        }
    except Exception:
        return None


@app.get("/options/{ticker}")
def get_options_chain(ticker: str, date: str = None, request: Request = None):
    """Fetch options chain for a ticker. Tries yfinance first, falls back to Finnhub.
    Adds Black-Scholes delta for all contracts. Cached 15 min per (ticker, date)."""
    import traceback as _tb

    if request:
        ip = request.client.host if request.client else "unknown"
        if check_rate_limit(ip, "options", 30, 3600):
            raise HTTPException(status_code=429, detail="Rate limit: 30 requests/hr")

    ticker = ticker.upper().strip()

    cache_key = f"{ticker}|{date or ''}"
    if cache_key in _options_cache:
        cached, ts = _options_cache[cache_key]
        if time.time() - ts < 900:
            return cached

    # ── Try yfinance first ───────────────────────────────────────────────────
    yf_error: str | None = None
    try:
        t = yf.Ticker(ticker)
        raw_options = t.options
        expiry_dates: list[str] = list(raw_options) if raw_options else []

        if not expiry_dates:
            raise ValueError(f"yfinance returned no expiry dates for {ticker}")

        selected = date if (date and date in expiry_dates) else expiry_dates[0]

        info = t.info or {}
        current_price = safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or 0) or 0.0

        chain = t.option_chain(selected)

        def _process(df, is_call: bool) -> list[dict]:
            rows = []
            for _, row in df.iterrows():
                iv = safe_float(row.get("impliedVolatility"))
                strike = safe_float(row.get("strike")) or 0.0
                delta = (
                    _bs_delta(current_price, strike, selected, 0.05, iv, is_call)
                    if current_price and strike and iv else None
                )
                rows.append({
                    "strike":            strike,
                    "lastPrice":         safe_float(row.get("lastPrice")),
                    "bid":               safe_float(row.get("bid")),
                    "ask":               safe_float(row.get("ask")),
                    "volume":            int(row.get("volume") or 0),
                    "openInterest":      int(row.get("openInterest") or 0),
                    "impliedVolatility": round(iv * 100, 2) if iv else None,
                    "inTheMoney":        bool(row.get("inTheMoney", False)),
                    "delta":             delta,
                })
            return sorted(rows, key=lambda r: r["strike"])

        result = {
            "ticker":           ticker,
            "current_price":    round(current_price, 4),
            "expiration_dates": expiry_dates,
            "selected_date":    selected,
            "calls":            _process(chain.calls, True),
            "puts":             _process(chain.puts, False),
        }
        _options_cache[cache_key] = (result, time.time())
        return result

    except HTTPException:
        raise
    except Exception as e:
        yf_error = str(e)
        _tb.print_exc()

    # ── Fall back to Finnhub ─────────────────────────────────────────────────
    fh_key = os.environ.get("FINNHUB_API_KEY", "")
    if fh_key:
        fh_result = _finnhub_options(ticker, fh_key, date, 0.0)
        if fh_result:
            _options_cache[cache_key] = (fh_result, time.time())
            return fh_result

    raise HTTPException(
        status_code=500,
        detail=f"Options unavailable: yfinance error: {yf_error}. Finnhub fallback also failed (options require a Finnhub premium subscription).",
    )


# Base cache: index prices + news headlines (shared across all ticker combos, 5-min TTL)
_market_base_cache: dict = {"indexes": {}, "headlines": [], "ts": 0.0}
# Per-ticker-set cache: keyed by sorted ticker string -> full result dict + ts
_market_per_ticker_cache: dict = {}

@app.get("/market-summary")
def market_summary(tickers: str = Query(default="")):
    """Return structured AI market brief (market/holdings/context) + raw index values.
    Accepts optional ?tickers=BND,SPY,... to include per-holding performance.
    Base market data cached 5 min globally; per-ticker AI results cached 5 min each."""
    global _market_base_cache, _market_per_ticker_cache

    user_tickers = [t.strip().upper() for t in tickers.split(",") if t.strip()] if tickers else []
    ticker_key = ",".join(sorted(user_tickers))

    # Check per-ticker cache first
    cached = _market_per_ticker_cache.get(ticker_key)
    if cached and time.time() - cached.get("ts", 0) < 60:
        return cached

    # Refresh base market data (indexes + news) if stale
    now = time.time()
    if now - _market_base_cache["ts"] > 60:
        index_data = {}
        for sym in ["SPY", "QQQ", "DIA", "^VIX"]:
            try:
                info = yf.Ticker(sym).info or {}
                price = safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
                prev_close = safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose") or 0)
                pct = ((price - prev_close) / prev_close * 100) if price > 0 and prev_close > 0 else 0.0
                index_data[sym] = {"price": round(price, 2), "pct": round(pct, 4)}
            except Exception as e:
                print(f"market-summary index error for {sym}: {e}")
                index_data[sym] = {"price": 0.0, "pct": 0.0}

        # Top 3 news headlines from SPY
        headlines: list[str] = []
        try:
            news_items = yf.Ticker("SPY").news or []
            for item in news_items[:5]:
                # yfinance returns varying structures across versions
                title = (
                    item.get("title")
                    or (item.get("content") or {}).get("title")
                    or ""
                )
                if title and len(headlines) < 3:
                    headlines.append(title.strip())
        except Exception as e:
            print(f"market-summary news error: {e}")

        _market_base_cache = {"indexes": index_data, "headlines": headlines, "ts": now}

    index_data = _market_base_cache["indexes"]
    headlines = _market_base_cache["headlines"]

    spy_pct = index_data.get("SPY", {}).get("pct", 0.0)
    qqq_pct = index_data.get("QQQ", {}).get("pct", 0.0)
    dia_pct = index_data.get("DIA", {}).get("pct", 0.0)
    vix_val = index_data.get("^VIX", {}).get("price", 0.0)

    # Fetch per-holding 1-day price changes via batch yfinance download (more reliable than fast_info)
    holdings_data: dict[str, float] = {}
    if user_tickers:
        real_tickers = [t for t in user_tickers if not is_cash_ticker(t)]
        for t in user_tickers:
            if is_cash_ticker(t):
                holdings_data[t] = 0.0
        if real_tickers:
            try:
                dl_arg = real_tickers[0] if len(real_tickers) == 1 else real_tickers
                dl = yf.download(dl_arg, period="2d", auto_adjust=True, progress=False)
                if dl is not None and not dl.empty:
                    if isinstance(dl.columns, pd.MultiIndex):
                        close = dl["Close"]
                        if isinstance(close, pd.Series):
                            close = close.to_frame(name=real_tickers[0])
                    else:
                        close = dl[["Close"]].rename(columns={"Close": real_tickers[0]}) if "Close" in dl.columns else dl.iloc[:, :1].rename(columns={dl.columns[0]: real_tickers[0]})
                    close = close.dropna(how="all")
                    if len(close) >= 2:
                        prev_row = close.iloc[-2]
                        curr_row = close.iloc[-1]
                        for t in real_tickers:
                            if t in close.columns:
                                p0 = safe_float(prev_row.get(t, 0))
                                p1 = safe_float(curr_row.get(t, 0))
                                holdings_data[t] = round(((p1 - p0) / p0 * 100) if p0 > 0 else 0.0, 2)
                            else:
                                holdings_data[t] = 0.0
                    else:
                        # Only one row — fall back to fast_info
                        for t in real_tickers:
                            try:
                                fi = yf.Ticker(t).fast_info
                                p1 = safe_float(getattr(fi, "last_price", 0) or 0)
                                p0 = safe_float(getattr(fi, "previous_close", 0) or 0)
                                holdings_data[t] = round(((p1 - p0) / p0 * 100) if p0 > 0 else 0.0, 2)
                            except Exception:
                                holdings_data[t] = 0.0
            except Exception as e:
                print(f"market-summary holdings batch error: {e}")
                for sym in real_tickers:
                    if sym not in holdings_data:
                        try:
                            fi = yf.Ticker(sym).fast_info
                            p1 = safe_float(getattr(fi, "last_price", 0) or 0)
                            p0 = safe_float(getattr(fi, "previous_close", 0) or 0)
                            holdings_data[sym] = round(((p1 - p0) / p0 * 100) if p0 > 0 else 0.0, 2)
                        except Exception as e2:
                            print(f"market-summary holdings fallback error for {sym}: {e2}")

    # Fetch upcoming earnings dates within 14 days for WHAT TO WATCH section
    # earnings_data maps ticker -> days until earnings (int)
    earnings_data: dict[str, int] = {}
    today_date = datetime.now(timezone.utc).date()
    for sym in (user_tickers or [])[:6]:
        if is_cash_ticker(sym):
            continue
        try:
            cal = yf.Ticker(sym).calendar
            date_str = None
            if cal is not None and not (isinstance(cal, pd.DataFrame) and cal.empty):
                if isinstance(cal, pd.DataFrame) and "Earnings Date" in cal.index:
                    dates = cal.loc["Earnings Date"]
                    if hasattr(dates, "__iter__") and not isinstance(dates, str):
                        date_list = [str(d).split(" ")[0] for d in dates if pd.notna(d)]
                        if date_list:
                            date_str = date_list[0]
                    elif pd.notna(dates):
                        date_str = str(dates).split(" ")[0]
                elif isinstance(cal, dict) and "Earnings Date" in cal:
                    raw_date = cal["Earnings Date"]
                    if isinstance(raw_date, list) and raw_date:
                        date_str = str(raw_date[0]).split(" ")[0]
                    elif raw_date:
                        date_str = str(raw_date).split(" ")[0]
            if date_str:
                try:
                    ed = datetime.strptime(date_str, "%Y-%m-%d").date()
                    days_away = (ed - today_date).days
                    if 0 <= days_away <= 14:
                        earnings_data[sym] = days_away
                except ValueError:
                    pass
        except Exception as e:
            print(f"market-summary earnings error for {sym}: {e}")

    # AI generation — four distinct sections
    market_text = holdings_text = context_text = outlook_text = ""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            direction = lambda p: "up" if p >= 0 else "down"
            sign = lambda p: "+" if p >= 0 else ""

            news_str = " | ".join(headlines) if headlines else "No headlines available"

            if holdings_data:
                best_sym = max(holdings_data, key=lambda k: holdings_data[k])
                worst_sym = min(holdings_data, key=lambda k: holdings_data[k])
                perf_lines = "\n".join(
                    f"  {s}: {sign(v)}{v:.2f}%"
                    for s, v in sorted(holdings_data.items(), key=lambda x: -x[1])
                )
                holdings_block = (
                    f"Today's actual verified price changes:\n"
                    f"{perf_lines}\n\n"
                    f"Use ONLY these numbers. Never say a stock fell if its number is positive. "
                    f"The portfolio leader is the highest number. The laggard is the lowest."
                )
                holdings_key_desc = (
                    f"Write 2-3 sentences about the user's portfolio today using ONLY the exact numbers above. "
                    f"State which holdings rose and which fell with the exact percentages. "
                    f"Connect each move to the market driver. "
                    f"Leader: {best_sym} ({sign(holdings_data[best_sym])}{holdings_data[best_sym]:.2f}%), "
                    f"laggard: {worst_sym} ({sign(holdings_data[worst_sym])}{holdings_data[worst_sym]:.2f}%). "
                    f"Never describe a positive-returning holding as a drag, headwind, or negative."
                )
            else:
                holdings_block = "No user holdings provided."
                holdings_key_desc = '"No holdings provided for this user."'

            if earnings_data:
                earnings_lines = "\n".join(
                    f"  {sym} reports in {days} day{'s' if days != 1 else ''}"
                    for sym, days in sorted(earnings_data.items(), key=lambda x: x[1])
                )
                watch_data_block = f"Upcoming earnings (within 14 days, verified from yfinance):\n{earnings_lines}"
            else:
                watch_data_block = "No earnings reports due within the next 14 days for this portfolio."

            prompt = f"""Market data:
S&P 500 (SPY) {direction(spy_pct)} {abs(spy_pct):.2f}%, Nasdaq (QQQ) {direction(qqq_pct)} {abs(qqq_pct):.2f}%, Dow (DIA) {direction(dia_pct)} {abs(dia_pct):.2f}%, VIX {vix_val:.1f}.
Top news headlines: {news_str}

{holdings_block}

{watch_data_block}

Return a JSON object with exactly these four string keys. Each value must be 2-3 sentences of plain prose.

"market": State exactly what the S&P 500, Nasdaq, and Dow did today with precise percentage moves. Include whether it was a broad move or sector-led. 2-3 sentences.

"market_driver": Explain specifically what caused the move. Name the actual event: if earnings, name the company and whether it beat or missed. If a Fed statement, say what was said. If a CPI or jobs report, give the number and whether it surprised. If a geopolitical or political event, name it plainly. Do not say things like "sentiment remained constructive" or "risk appetite improved" or "tailwinds persisted". Say what actually happened. 2-3 sentences.

"holdings": {holdings_key_desc}

"outlook": Use the upcoming earnings data above. If any holding reports within 14 days, name it specifically (e.g. "TTWO reports in 3 days"), say what to watch for in that report, and close with what it means for the portfolio. If no earnings are due, pick the most relevant near-term market event from the news and explain what to watch. 2-3 sentences.

Hard rules: no em dashes, no asterisks, no markdown, no vague market jargon. Write like a smart friend who knows finance. Plain English only. Return only the JSON object, no wrapper."""

            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=700,
                system="You are a sharp financial analyst writing a daily market brief. Your job is to say exactly what happened and why, using plain English. Never use vague phrases like 'sentiment remained constructive', 'risk appetite improved', 'tailwinds persist', or 'investor appetite'. Name real events, real numbers, real companies. Return ONLY a valid JSON object with keys: market, market_driver, holdings, outlook. No markdown fences, no extra text.",
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
            # Strip markdown code fences if the model adds them
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw)
            market_text = clean_ai_response(parsed.get("market", ""))
            holdings_text = clean_ai_response(parsed.get("holdings", ""))
            context_text = clean_ai_response(parsed.get("market_driver", parsed.get("context", "")))
            outlook_text = clean_ai_response(parsed.get("outlook", ""))
        except Exception as e:
            print(f"market-summary AI error: {e}")

    result = {
        "market": market_text,
        "holdings": holdings_text,
        "context": context_text,
        "outlook": outlook_text,
        "holdings_pct": holdings_data,
        "spy_pct": round(spy_pct, 2),
        "qqq_pct": round(qqq_pct, 2),
        "dia_pct": round(dia_pct, 2),
        "vix": round(vix_val, 1),
        "ts": time.time(),
    }
    _market_per_ticker_cache[ticker_key] = result
    return result


_stats_cache: dict = {"user_count": 847, "ts": 0.0}

@app.get("/stats")
def platform_stats():
    """Return platform-level stats: user count from Supabase, cached 1 hour."""
    import time
    global _stats_cache
    if time.time() - _stats_cache["ts"] < 3600:
        return {"user_count": _stats_cache["user_count"]}
    user_count = 0
    try:
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            # Try auth.users (requires service role)
            resp = requests.get(
                f"{SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                },
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                user_count = data.get("total", 0)
            # Fallback to profiles table count
            if not user_count:
                resp2 = requests.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?select=id",
                    headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Prefer": "count=exact",
                        "Range": "0-0",
                    },
                    timeout=5,
                )
                cr = resp2.headers.get("content-range", "")
                if "/" in cr:
                    user_count = int(cr.split("/")[1])
    except Exception as e:
        print(f"Stats error: {e}")
    result = max(user_count, 847)
    _stats_cache = {"user_count": result, "ts": time.time()}
    return {"user_count": result}


@app.get("/watchlist-data")
def watchlist_data(tickers: str, request: Request):
    """Return price, change_pct, and 7-day sparkline for a comma-separated list of tickers."""
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "watchlist-data", 30, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:20]
    results = []
    for ticker in ticker_list:
        try:
            t = yf.Ticker(ticker)
            info = t.info or {}
            current_price = safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
            prev_close = safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose") or current_price)
            change = current_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0.0
            name = info.get("longName") or info.get("shortName") or ticker
            sector = info.get("sector") or "Other"

            # 7-day sparkline (daily closes)
            hist = t.history(period="7d", interval="1d")
            sparkline = [safe_float(row["Close"]) for _, row in hist.iterrows()] if not hist.empty else []

            results.append({
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "sparkline": sparkline,
            })
        except Exception as e:
            results.append({"ticker": ticker, "name": ticker, "price": 0.0, "change": 0.0, "change_pct": 0.0, "sparkline": [], "error": str(e)})
    return {"results": results}



@app.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(user_id: str = ""):
    """Unsubscribe user from all Corvo emails by disabling all email_preferences toggles."""
    success = False
    if user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={"morning_briefing": False, "week_in_review": False, "monthly_summary": False, "price_alerts": False, "market_close_summary": False},
                timeout=8,
            )
            success = resp.status_code in (200, 204)
            print(f"[unsubscribe] user_id={user_id} status={resp.status_code}")
        except Exception as e:
            print(f"[unsubscribe] error: {e}")

    if success:
        body_text = "You&#39;ve been unsubscribed from Corvo emails. You won&#39;t receive morning briefings or digest emails going forward."
        detail_text = "You can re-enable these at any time in your <a href=\"https://corvo.capital/app\" style=\"color:#c9a84c;\">account settings</a>."
    else:
        body_text = "Something went wrong processing your request."
        detail_text = "Please visit your <a href=\"https://corvo.capital/app\" style=\"color:#c9a84c;\">account settings</a> to manage email preferences."

    return HTMLResponse(content=f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed | Corvo</title>
  <style>
    body {{ margin: 0; padding: 0; background: #0a0a0a; color: #e8e0cc;
            font-family: Arial, sans-serif; display: flex; align-items: center;
            justify-content: center; min-height: 100vh; }}
    .card {{ max-width: 480px; width: 100%; padding: 48px 32px; text-align: center; }}
    .brand {{ font-size: 24px; font-weight: 900; letter-spacing: 6px; color: #c9a84c;
              font-family: 'Courier New', Courier, monospace; margin-bottom: 4px; }}
    .sub {{ font-size: 9px; letter-spacing: 3px; color: #555; text-transform: uppercase;
            margin-bottom: 40px; }}
    .icon {{ font-size: 40px; margin-bottom: 20px; }}
    h1 {{ font-size: 20px; font-weight: 700; color: #e8e0cc; margin: 0 0 12px; }}
    p {{ font-size: 14px; color: #888880; line-height: 1.7; margin: 0 0 12px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">CORVO</div>
    <div class="sub">Portfolio Intelligence</div>
    <div class="icon">{"&#x2705;" if success else "&#x26A0;"}</div>
    <h1>{"Unsubscribed" if success else "Oops"}</h1>
    <p>{body_text}</p>
    <p>{detail_text}</p>
  </div>
</body>
</html>""", status_code=200)


@app.get("/email/unsubscribe", response_class=HTMLResponse)
def email_unsubscribe_type(user_id: str = "", type: str = ""):
    """Unsubscribe a user from a single email type. Called directly from email links."""
    VALID_COLUMNS = {"morning_briefing", "week_in_review", "monthly_summary", "price_alerts", "market_close_summary"}
    LABEL_MAP = {
        "morning_briefing":    "Morning Briefing",
        "week_in_review":      "Week in Review",
        "monthly_summary":     "Monthly Summary",
        "price_alerts":        "Price Alerts",
        "market_close_summary": "Market Close Summary",
    }
    col = type if type in VALID_COLUMNS else None
    success = False
    if col and user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}",
                headers={**_sb_headers(), "Prefer": "return=minimal"},
                json={col: False},
                timeout=8,
            )
            success = resp.status_code in (200, 204)
            print(f"[email-unsubscribe] user_id={user_id} type={col} status={resp.status_code}")
        except Exception as e:
            print(f"[email-unsubscribe] error: {e}")

    label = LABEL_MAP.get(type, "Corvo emails")
    amber = "#c9a84c"
    sans  = "Arial, Helvetica, sans-serif"
    mono  = "'Courier New', Courier, monospace"
    if success:
        icon_html = "&#x2705;"
        title = "Unsubscribed"
        body_text = f"You&#39;ve been unsubscribed from {label} emails."
        detail_text = f'You can re-enable this at any time in your <a href="https://corvo.capital/app" style="color:{amber};">account settings</a>.'
    elif not col:
        icon_html = "&#x26A0;"
        title = "Invalid Link"
        body_text = "This unsubscribe link is not valid."
        detail_text = f'Visit your <a href="https://corvo.capital/app" style="color:{amber};">account settings</a> to manage email preferences.'
    else:
        icon_html = "&#x26A0;"
        title = "Something Went Wrong"
        body_text = "We could not process your request."
        detail_text = f'Visit your <a href="https://corvo.capital/app" style="color:{amber};">account settings</a> to manage email preferences.'

    return HTMLResponse(content=f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Corvo</title>
  <style>
    body {{ margin: 0; padding: 0; background: #0a0a0a; color: #e8e0cc;
            font-family: {sans}; display: flex; align-items: center;
            justify-content: center; min-height: 100vh; }}
    .card {{ max-width: 480px; width: 100%; padding: 48px 32px; text-align: center; }}
    .brand {{ font-size: 24px; font-weight: 900; letter-spacing: 6px; color: {amber};
              font-family: {mono}; margin-bottom: 4px; }}
    .sub {{ font-size: 9px; letter-spacing: 3px; color: #555; text-transform: uppercase;
            margin-bottom: 40px; }}
    .icon {{ font-size: 40px; margin-bottom: 20px; }}
    h1 {{ font-size: 20px; font-weight: 700; color: #e8e0cc; margin: 0 0 12px; }}
    p {{ font-size: 14px; color: #888880; line-height: 1.7; margin: 0 0 12px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">CORVO</div>
    <div class="sub">Portfolio Intelligence</div>
    <div class="icon">{icon_html}</div>
    <h1>{title}</h1>
    <p>{body_text}</p>
    <p>{detail_text}</p>
  </div>
</body>
</html>""", status_code=200)


class UnsubscribeRequest(BaseModel):
    user_id: str
    type: str | None = None


_UNSUB_VALID_COLUMNS = {"morning_briefing", "week_in_review", "monthly_summary", "price_alerts", "market_close_summary"}


@app.post("/unsubscribe")
def unsubscribe_post(req: UnsubscribeRequest):
    """Disable email preferences for the user. If type is provided, disable only that preference; otherwise disable all."""
    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")
    try:
        if req.type and req.type in _UNSUB_VALID_COLUMNS:
            patch_body = {req.type: False}
        else:
            patch_body = {
                "morning_briefing": False,
                "week_in_review": False,
                "monthly_summary": False,
                "price_alerts": False,
                "market_close_summary": False,
                "push_notifications": False,
            }
        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{req.user_id}",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json=patch_body,
            timeout=8,
        )
        success = resp.status_code in (200, 204)
        return {"ok": success}
    except Exception:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")


# ── Push Notification Endpoints ───────────────────────────────────────────────

class PushSubscribeRequest(BaseModel):
    user_id: str
    subscription: dict


@app.get("/push/vapid-public-key")
def get_vapid_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"public_key": VAPID_PUBLIC_KEY}


@app.post("/push/subscribe")
def push_subscribe(req: PushSubscribeRequest, request: Request):
    verified_id = _verify_jwt_user(request)
    if verified_id != req.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        # Upsert by matching endpoint to avoid duplicate subscriptions
        endpoint = req.subscription.get("endpoint", "")
        # Delete old entry for this endpoint, then insert fresh
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{req.user_id}&subscription->>endpoint=eq.{endpoint}",
            headers=_sb_headers(), timeout=5,
        )
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/push_subscriptions",
            headers={**_sb_headers(), "Prefer": "return=minimal"},
            json={"user_id": req.user_id, "subscription": req.subscription},
            timeout=5,
        )
        if resp.status_code not in (200, 201):
            print(f"[push] subscribe insert failed: {resp.status_code} {resp.text}")
            raise HTTPException(status_code=500, detail="Failed to save subscription")
        return {"status": "subscribed"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[push] subscribe error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _send_push(subscription: dict, title: str, body: str, icon: str = "", url: str = "") -> str:
    """
    Send a push notification. Returns:
      "ok"   - delivered
      "dead" - subscription is expired/gone (410/404); safe to delete
      "err"  - transient error; keep the subscription
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return "err"
    try:
        from pywebpush import webpush, WebPushException
        payload: dict = {"title": title, "body": body}
        if icon:
            payload["icon"] = icon
        if url:
            payload["url"] = url
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL if VAPID_CLAIMS_EMAIL.startswith("mailto:") else f"mailto:{VAPID_CLAIMS_EMAIL}"},
        )
        return "ok"
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            return "dead"
        print(f"[push] send error: {e}")
        return "err"


def _send_alert_email(to_email: str, ticker: str, price: float, condition: str, threshold: float, user_id: str = "", email_theme: str = "light"):
    """Send a price alert email via Resend."""
    if not to_email:
        return
    moved = "rose" if condition == "rises" else "fell"
    subject = f"Price alert: {ticker} {moved} {threshold}%"
    mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
    html = _email_html(
        heading=f"{ticker} alert triggered",
        label="Price Alert",
        body_lines=[
            f"<strong style=\"color:{mono_color};font-family:'Courier New',Courier,monospace;font-size:20px;\">${price:.2f}</strong>",
            f"{ticker} {moved} by more than {threshold}% from the previous close.",
            "Log in to review your position and decide your next move.",
        ],
        cta_text="Review now",
        cta_url="https://corvo.capital/app",
        user_id=user_id,
        email_theme=email_theme,
    )
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "Corvo Alerts <alerts@corvo.capital>")
    _resend(to_email, subject, html, from_addr=from_addr)


# ── Price Targets ─────────────────────────────────────────────────────────────

class PriceTargetCreate(BaseModel):
    user_id: str
    ticker: str
    target_price: float
    direction: str  # "above" or "below" (also accepts "Rises above" / "Falls below")


@app.get("/price-targets/{user_id}")
def get_price_targets(user_id: str, request: Request):
    """Return all price targets for a user, including current price and distance."""
    verified_id = _verify_jwt_user(request)
    if verified_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/price_targets?user_id=eq.{user_id}&order=created_at.desc",
        headers=_sb_headers(), timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch targets")
    targets = resp.json()

    # Fetch current prices for unique tickers
    tickers = list({t["ticker"] for t in targets if not t.get("triggered")})
    prices: dict[str, float] = {}
    for ticker in tickers:
        try:
            df = yf.download(ticker, period="1d", interval="1m", progress=False, auto_adjust=True)
            if not df.empty:
                raw = df["Close"].iloc[-1]
                prices[ticker] = float(raw.iloc[0] if hasattr(raw, "iloc") else raw)
        except Exception:
            pass

    for t in targets:
        ticker = t["ticker"]
        t["current_price"] = prices.get(ticker)

    return targets


_DIRECTION_MAP = {
    "above": "above",
    "below": "below",
    "rises above": "above",
    "falls below": "below",
}

def _normalize_direction(raw: str) -> str | None:
    return _DIRECTION_MAP.get(raw.lower().strip())


@app.post("/price-targets")
def create_price_target(req: PriceTargetCreate, request: Request):
    """Create a new price target."""
    verified_id = _verify_jwt_user(request)
    req.user_id = verified_id
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    direction = _normalize_direction(req.direction)
    if not direction:
        raise HTTPException(status_code=400, detail=f"direction must be 'above' or 'below', got '{req.direction}'")
    if req.target_price <= 0:
        raise HTTPException(status_code=400, detail="target_price must be positive")
    if not req.ticker.strip():
        raise HTTPException(status_code=400, detail="ticker is required")
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/price_targets",
        headers={**_sb_headers(), "Prefer": "return=representation"},
        json={
            "user_id": req.user_id,
            "ticker": req.ticker.upper().strip(),
            "target_price": req.target_price,
            "direction": direction,
        },
        timeout=8,
    )
    if resp.status_code not in (200, 201):
        try:
            err = resp.json()
            detail = err.get("message") or err.get("detail") or f"Supabase error {resp.status_code}"
        except Exception:
            detail = f"Supabase error {resp.status_code}"
        raise HTTPException(status_code=400, detail=detail)
    data = resp.json()
    return data[0] if data else {}


@app.patch("/price-targets/{target_id}")
def update_price_target(target_id: str, user_id: str, target_price: float, direction: str):
    """Update a price target's price and direction."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    direction = _normalize_direction(direction) or direction
    if direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail=f"direction must be 'above' or 'below', got '{direction}'")
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/price_targets?id=eq.{target_id}&user_id=eq.{user_id}",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        json={"target_price": target_price, "direction": direction, "updated_at": datetime.now(timezone.utc).isoformat()},
        timeout=8,
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail="Update failed")
    return {"ok": True}


@app.delete("/price-targets/{target_id}")
def delete_price_target(target_id: str, user_id: str):
    """Delete a price target, verifying ownership by user_id."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/price_targets?id=eq.{target_id}&user_id=eq.{user_id}",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        timeout=8,
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail="Delete failed")
    return {"ok": True}


@app.delete("/price-alerts/{alert_id}")
def delete_price_alert(alert_id: str, user_id: str):
    """Delete a price alert, verifying ownership by user_id."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/price_alerts?id=eq.{alert_id}&user_id=eq.{user_id}",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        timeout=8,
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail="Delete failed")
    return {"ok": True}


async def check_price_alerts():
    """Check all untriggered price alerts against current prices."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        # Fetch all untriggered price alerts
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/price_alerts?triggered=eq.false&type=eq.price&select=id,user_id,ticker,condition,threshold",
            headers=_sb_headers(), timeout=10,
        )
        if resp.status_code != 200:
            return
        alerts = resp.json()
        if not alerts:
            return

        # Group by ticker to minimize API calls
        ticker_alerts: dict[str, list[dict]] = {}
        for a in alerts:
            t = a.get("ticker", "").upper()
            if t:
                ticker_alerts.setdefault(t, []).append(a)

        for ticker, ticker_alert_list in ticker_alerts.items():
            try:
                # Get current price via yfinance (1-day data, last close)
                df = yf.download(ticker, period="1d", interval="1m", progress=False, auto_adjust=True)
                if df.empty:
                    continue
                raw_price = df["Close"].iloc[-1]
                current_price = float(raw_price.iloc[0] if hasattr(raw_price, 'iloc') else raw_price)

                # Get reference price (close from previous day)
                df_prev = yf.download(ticker, period="5d", progress=False, auto_adjust=True)
                if df_prev.empty or len(df_prev) < 2:
                    continue
                raw_prev = df_prev["Close"].iloc[-2]
                prev_close = float(raw_prev.iloc[0] if hasattr(raw_prev, 'iloc') else raw_prev)
                if prev_close <= 0:
                    continue
                pct_change = ((current_price - prev_close) / prev_close) * 100

                for alert in ticker_alert_list:
                    condition = alert["condition"]  # "drops" or "rises"
                    threshold = float(alert["threshold"])
                    triggered = (
                        (condition == "drops" and pct_change <= -threshold) or
                        (condition == "rises" and pct_change >= threshold)
                    )
                    if not triggered:
                        continue

                    alert_id = alert["id"]
                    user_id = alert["user_id"]

                    # Mark as triggered
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/price_alerts?id=eq.{alert_id}",
                        headers={**_sb_headers(), "Prefer": "return=minimal"},
                        json={"triggered": True, "triggered_at": datetime.now(timezone.utc).isoformat()},
                        timeout=5,
                    )

                    notif_title = "Corvo Price Alert"
                    notif_body = f"{ticker} has {'dropped' if condition == 'drops' else 'risen'} {threshold}%, now at ${current_price:.2f}"

                    # Fetch preferences once for both push and email
                    pref_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}&select=push_notifications,price_alerts,email_theme",
                        headers=_sb_headers(), timeout=5,
                    )
                    send_push = True
                    send_email = True
                    email_theme = "light"
                    if pref_resp.status_code == 200 and pref_resp.json():
                        prow = pref_resp.json()[0]
                        send_push = prow.get("push_notifications", True) is not False
                        send_email = prow.get("price_alerts", True) is not False
                        email_theme = prow.get("email_theme") or "light"

                    # Send push to all subscriptions for this user
                    if send_push:
                        subs_resp = requests.get(
                            f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=subscription",
                            headers=_sb_headers(), timeout=5,
                        )
                        if subs_resp.status_code == 200:
                            for row in subs_resp.json():
                                _send_push(row["subscription"], notif_title, notif_body)

                    # Send email alert
                    if send_email:
                        user_resp = requests.get(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                            headers=_sb_headers(), timeout=5,
                        )
                        if user_resp.status_code == 200:
                            email = user_resp.json().get("email", "")
                            if email:
                                _send_alert_email(email, ticker, current_price, condition, threshold, user_id=user_id, email_theme=email_theme)

                    print(f"[alerts] triggered: {ticker} {condition} {threshold}% for user {user_id}")
            except Exception as e:
                err_str = str(e)
                if "401" in err_str or "Unauthorized" in err_str or "Crumb" in err_str:
                    print(f"[alerts] yfinance session expired, skipping cycle")
                    break  # Stop this cycle, will retry on next scheduled run
                print(f"[alerts] error checking {ticker}: {e}")
    except Exception as e:
        print(f"[alerts] check_price_alerts error: {e}")

    # ── Portfolio alerts (runs independently of stock alert outcome) ───────────
    try:
        port_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/price_alerts?triggered=eq.false&type=eq.portfolio&select=id,user_id,portfolio_id,condition,threshold",
            headers=_sb_headers(), timeout=10,
        )
        if port_resp.status_code == 200:
            port_alerts = port_resp.json()
            for alert in port_alerts:
                try:
                    user_id = alert["user_id"]
                    portfolio_id = alert.get("portfolio_id")
                    condition = alert["condition"]
                    threshold = float(alert["threshold"])
                    alert_id = alert["id"]

                    if not portfolio_id:
                        continue

                    # Fetch last 2 snapshots for this portfolio
                    snap_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/portfolio_snapshots?portfolio_id=eq.{portfolio_id}&select=date,portfolio_value&order=date.desc&limit=2",
                        headers=_sb_headers(), timeout=8,
                    )
                    if snap_resp.status_code != 200:
                        continue
                    snaps = snap_resp.json()
                    if len(snaps) < 2:
                        continue

                    latest_val = float(snaps[0]["portfolio_value"])
                    prev_val = float(snaps[1]["portfolio_value"])
                    if prev_val <= 0:
                        continue
                    pct_change = ((latest_val - prev_val) / prev_val) * 100

                    triggered = (
                        (condition == "drops" and pct_change <= -threshold) or
                        (condition == "rises" and pct_change >= threshold)
                    )
                    if not triggered:
                        continue

                    # Fetch portfolio name
                    pf_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/portfolios?id=eq.{portfolio_id}&select=name",
                        headers=_sb_headers(), timeout=5,
                    )
                    pf_name = "Your portfolio"
                    if pf_resp.status_code == 200 and pf_resp.json():
                        pf_name = pf_resp.json()[0].get("name") or "Your portfolio"

                    # Mark as triggered
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/price_alerts?id=eq.{alert_id}",
                        headers={**_sb_headers(), "Prefer": "return=minimal"},
                        json={"triggered": True, "triggered_at": datetime.now(timezone.utc).isoformat()},
                        timeout=5,
                    )

                    notif_title = "Corvo Portfolio Alert"
                    notif_body = f"{pf_name} has {'dropped' if condition == 'drops' else 'risen'} {threshold}% (now ${latest_val:,.0f})"

                    # Fetch preferences once for both push and email
                    pref_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}&select=push_notifications,price_alerts,email_theme",
                        headers=_sb_headers(), timeout=5,
                    )
                    send_push = True
                    send_email = True
                    email_theme = "light"
                    if pref_resp.status_code == 200 and pref_resp.json():
                        prow = pref_resp.json()[0]
                        send_push = prow.get("push_notifications", True) is not False
                        send_email = prow.get("price_alerts", True) is not False
                        email_theme = prow.get("email_theme") or "light"

                    # Send push
                    if send_push:
                        subs_resp = requests.get(
                            f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=subscription",
                            headers=_sb_headers(), timeout=5,
                        )
                        if subs_resp.status_code == 200:
                            for row in subs_resp.json():
                                _send_push(row["subscription"], notif_title, notif_body)

                    # Send email
                    if send_email:
                        user_resp = requests.get(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                            headers=_sb_headers(), timeout=5,
                        )
                        if user_resp.status_code == 200:
                            email = user_resp.json().get("email", "")
                            if email:
                                _send_alert_email(email, pf_name, latest_val, condition, threshold, user_id=user_id, email_theme=email_theme)

                    print(f"[alerts] portfolio triggered: {pf_name} {condition} {threshold}% for user {user_id}")
                except Exception as e:
                    print(f"[alerts] portfolio alert error: {e}")
    except Exception as e:
        print(f"[alerts] portfolio check error: {e}")


class SnapshotRequest(BaseModel):
    user_id: str
    portfolio_id: str
    tickers: str   # comma-separated
    weights: str   # comma-separated floats


@app.post("/portfolio/snapshot")
def portfolio_snapshot(req: SnapshotRequest):
    """
    Fetch current prices, compute portfolio value (base $10 000) and cumulative
    return from the first snapshot, then upsert into portfolio_snapshots for today.

    Run this SQL in Supabase once before using the endpoint:
      create table if not exists portfolio_snapshots (
        id uuid default gen_random_uuid() primary key,
        user_id uuid references profiles(id) on delete cascade,
        portfolio_id uuid not null,
        date date not null,
        raw_value numeric not null,
        portfolio_value numeric not null,
        cumulative_return numeric not null,
        created_at timestamptz default now(),
        unique(portfolio_id, date)
      );
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    tickers_list = [t.strip().upper() for t in req.tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers provided")

    try:
        w_list = [float(w) for w in req.weights.split(",")]
    except Exception:
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    if len(w_list) != len(tickers_list):
        w_list = [1.0 / len(tickers_list)] * len(tickers_list)

    total = sum(w_list)
    if total > 0:
        w_list = [w / total for w in w_list]

    # ── Fetch recent prices ────────────────────────────────────────────────────
    try:
        raw = yf.download(
            tickers_list if len(tickers_list) > 1 else tickers_list[0],
            period="5d", auto_adjust=True, progress=False,
        )
        if raw is None or raw.empty:
            raise ValueError("Empty price data")

        if isinstance(raw.columns, pd.MultiIndex):
            lvl0 = raw.columns.get_level_values(0)
            close_df = raw["Close"] if "Close" in lvl0 else raw["Adj Close"]
        else:
            close_df = raw[["Close"]].rename(columns={"Close": tickers_list[0]})

        last_row = close_df.dropna(how="all").iloc[-1]
        prices: dict = {t: safe_float(last_row.get(t, 0)) for t in tickers_list}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Price fetch failed: {exc}")

    # ── Compute weighted price index ───────────────────────────────────────────
    raw_value = 0.0
    valid_weight = 0.0
    for ticker, weight in zip(tickers_list, w_list):
        price = prices.get(ticker, 0.0)
        if price > 0:
            raw_value += price * weight
            valid_weight += weight

    if raw_value <= 0:
        raise HTTPException(status_code=500, detail="No valid prices for tickers")

    if 0 < valid_weight < 1.0:
        raw_value = raw_value / valid_weight  # normalise for partially available tickers

    today = datetime.now(timezone.utc).date().isoformat()

    # ── Get first snapshot as the base ────────────────────────────────────────
    first_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/portfolio_snapshots",
        headers=_sb_headers(),
        params={
            "portfolio_id": f"eq.{req.portfolio_id}",
            "select": "date,raw_value",
            "order": "date.asc",
            "limit": "1",
        },
        timeout=10,
    )

    cumulative_return = 0.0
    portfolio_value = 10000.0

    if first_resp.status_code == 200:
        rows = first_resp.json()
        if rows and rows[0].get("date") != today:
            base_raw = safe_float(rows[0].get("raw_value", 0))
            if base_raw > 0:
                cumulative_return = (raw_value / base_raw) - 1.0
                portfolio_value = 10000.0 * (1.0 + cumulative_return)

    # ── Upsert (merge on portfolio_id + date unique constraint) ──────────────
    upsert_resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/portfolio_snapshots",
        headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
        json={
            "user_id": req.user_id,
            "portfolio_id": req.portfolio_id,
            "date": today,
            "raw_value": raw_value,
            "portfolio_value": round(portfolio_value, 4),
            "cumulative_return": round(cumulative_return, 6),
        },
        timeout=10,
    )
    if upsert_resp.status_code not in (200, 201, 204):
        print(f"[snapshot] upsert failed: {upsert_resp.status_code} {upsert_resp.text[:200]}")
        raise HTTPException(status_code=500, detail="Failed to save portfolio snapshot")

    return {
        "ok": True,
        "date": today,
        "portfolio_value": round(portfolio_value, 2),
        "cumulative_return_pct": round(cumulative_return * 100, 4),
    }


# ── Health Score cache (keyed by user_id + UTC date + sorted tickers hash) ────
_health_score_cache: dict[str, tuple[dict, str]] = {}


def _hs_cache_key(user_id: str, tickers: list[str]) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tkr_hash = "|".join(sorted(t.upper() for t in tickers))
    uid = user_id or "anon"
    return f"{uid}:{today}:{tkr_hash}"


def _hs_load_from_supabase(user_id: str, date_str: str, tkr_hash: str) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return None
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/health_score_cache"
            f"?user_id=eq.{user_id}&date=eq.{date_str}&tickers_hash=eq.{tkr_hash}&select=score,headline,actions",
            headers=_sb_headers(), timeout=5,
        )
        if resp.status_code == 200:
            rows = resp.json()
            if rows:
                row = rows[0]
                return {"score": row["score"], "headline": row["headline"], "actions": row["actions"], "cached": True}
    except Exception as e:
        print(f"[health-score] supabase load error: {e}")
    return None


def _hs_save_to_supabase(user_id: str, date_str: str, tkr_hash: str, result: dict):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/health_score_cache",
            headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
            json={
                "user_id": user_id,
                "date": date_str,
                "tickers_hash": tkr_hash,
                "score": result["score"],
                "headline": result["headline"],
                "actions": result["actions"],
            },
            timeout=5,
        )
    except Exception as e:
        print(f"[health-score] supabase save error: {e}")


class HealthScoreRequest(BaseModel):
    user_id: str = ""
    tickers: list[str] = []
    weights: list[float] = []
    annualized_return: float = 0.0
    portfolio_volatility: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    rf_rate: float = 0.04
    individual_returns: dict = {}
    portfolio_value: float | None = None


@app.post("/portfolio/health-score")
def portfolio_health_score(req: HealthScoreRequest):
    tickers = [t.upper() for t in req.tickers if t]
    weights = req.weights or [1.0 / max(len(tickers), 1)] * len(tickers)
    if len(weights) != len(tickers):
        weights = [1.0 / max(len(tickers), 1)] * len(tickers)

    # Compute numeric sub-scores (same formula as client-side HealthScore.tsx)
    ann_ret = req.annualized_return
    vol = req.portfolio_volatility
    sharpe = req.sharpe_ratio
    dd = req.max_drawdown
    rS = min(max(((ann_ret + 0.3) / 0.6) * 100, 0), 100)
    shS = min(max((sharpe / 3) * 100, 0), 100)
    vS = min(max((1 - vol / 0.6) * 100, 0), 100)
    dS = min(max((1 + dd / 0.5) * 100, 0), 100)
    score = round(rS * 0.3 + shS * 0.3 + vS * 0.25 + dS * 0.15)

    # Check in-memory cache first
    cache_key = _hs_cache_key(req.user_id, tickers)
    if cache_key in _health_score_cache:
        cached, _ = _health_score_cache[cache_key]
        return cached

    # Check Supabase cache
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tkr_hash = "|".join(sorted(t.upper() for t in tickers))
    sb_cached = _hs_load_from_supabase(req.user_id, today, tkr_hash)
    if sb_cached:
        _health_score_cache[cache_key] = (sb_cached, today)
        return sb_cached

    # Build context for Claude
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"score": score, "headline": "", "actions": [], "cached": False}

    client = anthropic.Anthropic(api_key=api_key)

    # Identify key risk factors
    max_weight_ticker = max(zip(tickers, weights), key=lambda x: x[1]) if tickers else ("", 0)
    top_concentration = max_weight_ticker[1] if max_weight_ticker else 0
    ind_rets = req.individual_returns or {}

    holdings_lines = []
    for t, w in zip(tickers, weights):
        ret_val = ind_rets.get(t)
        ret_str = f"{ret_val:.1%} CAGR" if ret_val is not None else "n/a"
        holdings_lines.append(f"  {t}: {w:.1%} weight, {ret_str}")
    holdings_str = "\n".join(holdings_lines)

    score_label = "Excellent" if score >= 75 else "Good" if score >= 50 else "Fair" if score >= 25 else "Weak"

    system_prompt = (
        "You are a plain-English financial advisor for a retail investor. "
        "Write in clear, direct language. No em dashes, no asterisks, no markdown, no emoji. "
        "Reference specific tickers and real numbers from the portfolio provided. "
        "Never give generic advice. Every sentence must reference the user's actual holdings or metrics."
    )

    user_prompt = f"""Portfolio Health Score: {score}/100 ({score_label})

Holdings:
{holdings_str}

Metrics:
  Annualized return: {ann_ret:.1%}
  Annualized volatility: {vol:.1%}
  Sharpe ratio: {sharpe:.2f}
  Max drawdown: {dd:.1%}
  Risk-free rate: {req.rf_rate:.1%}

Sub-scores (0-100):
  Returns score: {rS:.0f}
  Risk-adjusted score: {shS:.0f}
  Stability score: {vS:.0f}
  Resilience score: {dS:.0f}

Generate a JSON response with exactly this structure:
{{
  "headline": "<one sentence, max 18 words, naming what is driving the score up or down, referencing specific tickers or metrics>",
  "actions": [
    {{
      "action": "<specific action the investor can take today, referencing actual tickers and numbers, max 25 words>",
      "reason": "<why this matters for their score or risk, max 20 words>"
    }},
    {{
      "action": "<second specific action>",
      "reason": "<why this matters>"
    }}
  ]
}}

Rules:
- Headline must name the score driver specifically (e.g. which ticker is concentrated, how high volatility is).
- Actions must reference actual tickers and percentages from the holdings above.
- If the score is already Excellent (75+), highlight what is working and one way to protect gains.
- Include a third action only if there is a genuinely distinct third issue to address.
- Output only valid JSON, no other text."""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = msg.content[0].text.strip()
        import json as _json
        # Strip any markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        parsed = _json.loads(raw)
        headline = clean_ai_response(parsed.get("headline", ""))
        actions_raw = parsed.get("actions", [])
        actions = [
            {"action": clean_ai_response(a.get("action", "")), "reason": clean_ai_response(a.get("reason", ""))}
            for a in actions_raw if a.get("action")
        ]
    except Exception as e:
        print(f"[health-score] Claude error: {e}")
        headline = ""
        actions = []

    result = {"score": score, "headline": headline, "actions": actions, "cached": False}
    _health_score_cache[cache_key] = (result, today)
    _hs_save_to_supabase(req.user_id, today, tkr_hash, result)

    return result


@app.get("/portfolio/history")
def get_portfolio_history(portfolio_id: str, user_id: str = ""):
    """Return all snapshots for a portfolio ordered by date ascending."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"snapshots": []}

    params: dict = {
        "portfolio_id": f"eq.{portfolio_id}",
        "select": "date,portfolio_value,cumulative_return",
        "order": "date.asc",
    }
    if user_id:
        params["user_id"] = f"eq.{user_id}"

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/portfolio_snapshots",
        headers=_sb_headers(),
        params=params,
        timeout=10,
    )

    if resp.status_code != 200:
        return {"snapshots": []}

    return {"snapshots": resp.json()}


@app.get("/portfolio/calc-history")
def calc_portfolio_history(tickers: str, weights: str, period: str = "max"):
    """
    Compute historical portfolio cumulative returns from yfinance data.
    Used as a fallback when portfolio_snapshots are not yet available.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"dates": [], "cumulative_returns": []}

    try:
        w_list = [float(w) for w in weights.split(",")]
    except Exception:
        w_list = [1.0 / len(ticker_list)] * len(ticker_list)

    if len(w_list) != len(ticker_list):
        w_list = [1.0 / len(ticker_list)] * len(ticker_list)

    total = sum(w_list)
    if total > 0:
        w_list = [w / total for w in w_list]

    period_map = {
        "1W": "7d", "1M": "1mo", "3M": "3mo", "6M": "6mo",
        "1Y": "1y", "All": "max", "max": "max",
    }
    yf_period = period_map.get(period, "max")

    try:
        raw = yf.download(
            ticker_list if len(ticker_list) > 1 else ticker_list[0],
            period=yf_period,
            auto_adjust=True,
            progress=False,
        )
        if raw is None or raw.empty:
            return {"dates": [], "cumulative_returns": []}

        if isinstance(raw.columns, pd.MultiIndex):
            lvl0 = raw.columns.get_level_values(0)
            close_df = raw["Close"] if "Close" in lvl0 else raw["Adj Close"]
        else:
            close_df = raw[["Close"]].rename(columns={"Close": ticker_list[0]})

        close_df = close_df.dropna(how="all")

        if len(ticker_list) == 1:
            col_name = ticker_list[0] if ticker_list[0] in close_df.columns else close_df.columns[0]
            series = close_df[col_name].dropna()
            if len(series) < 2:
                return {"dates": [], "cumulative_returns": []}
            port_value = series / series.iloc[0]
        else:
            port_value = None
            avail_total = 0.0
            for t, w in zip(ticker_list, w_list):
                if t not in close_df.columns:
                    continue
                col = close_df[t].dropna()
                if len(col) < 2:
                    continue
                norm = col / col.iloc[0]
                port_value = norm * w if port_value is None else port_value.add(norm * w, fill_value=0)
                avail_total += w
            if port_value is None or avail_total == 0:
                return {"dates": [], "cumulative_returns": []}
            if avail_total < 1.0:
                port_value = port_value / avail_total

        port_value = port_value.dropna()
        if len(port_value) < 2:
            return {"dates": [], "cumulative_returns": []}

        cum_returns = [round(float(v) - 1.0, 6) for v in port_value.values]
        dates = [str(d.date()) if hasattr(d, "date") else str(d)[:10] for d in port_value.index]
        return {"dates": dates, "cumulative_returns": cum_returns}

    except Exception:
        return {"dates": [], "cumulative_returns": []}


# ── Tax Loss Harvesting ────────────────────────────────────────────────────────

# Sector → list of replacement tickers (wash-sale-safe: different enough from common holdings)
_SECTOR_REPLACEMENTS: dict[str, list[str]] = {
    "Technology": ["VGT", "SOXX", "IGV", "FTEC", "SMH"],
    "Communication Services": ["VOX", "IYZ", "FCOM"],
    "Consumer Cyclical": ["VCR", "XLY", "IEDI"],
    "Consumer Defensive": ["VDC", "XLP", "FSTA"],
    "Healthcare": ["VHT", "IYH", "FHLC", "XLV"],
    "Financials": ["VFH", "XLF", "KBWB", "IYF"],
    "Energy": ["VDE", "XLE", "IYE", "FENY"],
    "Industrials": ["VIS", "XLI", "IYJ", "FIND"],
    "Basic Materials": ["VAW", "XLB", "IYM"],
    "Real Estate": ["VNQ", "IYR", "XLRE"],
    "Utilities": ["VPU", "XLU", "IDU"],
}
_DEFAULT_REPLACEMENTS = ["VTI", "ITOT", "SCHB", "IVV", "VOO"]


def _get_sector(ticker: str) -> str:
    try:
        info = yf.Ticker(ticker).info
        return info.get("sector") or "Other"
    except Exception:
        return "Other"


def _get_current_price(ticker: str) -> float | None:
    try:
        hist = yf.Ticker(ticker).history(period="2d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception:
        pass
    return None


def _pick_replacement(ticker: str, sector: str, portfolio_tickers: set[str]) -> str:
    """Pick a replacement ticker that is not in the portfolio (wash-sale safe)."""
    candidates = _SECTOR_REPLACEMENTS.get(sector, _DEFAULT_REPLACEMENTS)
    # Never suggest the original ticker or anything already held
    for c in candidates:
        if c.upper() not in portfolio_tickers and c.upper() != ticker.upper():
            return c
    # Fallback to broad market ETF not already held
    for c in _DEFAULT_REPLACEMENTS:
        if c.upper() not in portfolio_tickers:
            return c
    return "VTI"


def _generate_tlh_reasoning(ticker: str, replacement: str, sector: str, loss_pct: float, portfolio_value: float, loss_dollars: float) -> str:
    """Use Claude to explain the tax loss harvesting suggestion."""
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return f"Sell {ticker} to realize the loss, then buy {replacement} to maintain {sector} exposure while respecting the wash-sale rule."
        client = anthropic.Anthropic(api_key=api_key)
        prompt = (
            f"A portfolio holds {ticker} (sector: {sector}) which is down {abs(loss_pct):.1f}% "
            f"(${abs(loss_dollars):,.0f} loss on a ${portfolio_value:,.0f} portfolio). "
            f"The suggested replacement is {replacement}. "
            f"In 1-2 concise sentences, explain why selling {ticker} and buying {replacement} is a smart tax loss harvesting move. "
            f"Mention the wash-sale rule, the similar market exposure, and the tax benefit. Be direct and specific. "
            f"Never use em dashes. Never use asterisks or markdown formatting. Write in plain prose only."
        )
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return clean_ai_response(response.content[0].text)
    except Exception:
        return f"Sell {ticker} to realize the {abs(loss_pct):.1f}% loss, then buy {replacement} to maintain {sector} sector exposure. Wait 31 days to repurchase {ticker} to avoid the wash-sale rule."


@app.get("/portfolio/tax-loss")
def portfolio_tax_loss(
    tickers: str = "AAPL",
    weights: str = "",
    purchase_prices: str = "",
    portfolio_value: float = 10000.0,
):
    """
    For each ticker, compare current price vs purchase price.
    For tickers at a loss, suggest a wash-sale-safe replacement and AI reasoning.
    Returns: { losses: [{ticker, loss_pct, loss_dollars, suggested_replacement, reasoning}], total_harvestable_loss }
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"losses": [], "total_harvestable_loss": 0.0}

    weight_list: list[float] = []
    if weights:
        try:
            weight_list = [float(w) for w in weights.split(",")]
        except ValueError:
            weight_list = []
    if len(weight_list) != len(ticker_list):
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)
    total_w = sum(weight_list) or 1.0
    normalized_weights = [w / total_w for w in weight_list]

    purchase_price_list: list[float | None] = []
    if purchase_prices:
        for p in purchase_prices.split(","):
            try:
                val = float(p.strip())
                purchase_price_list.append(val if val > 0 else None)
            except ValueError:
                purchase_price_list.append(None)
    while len(purchase_price_list) < len(ticker_list):
        purchase_price_list.append(None)

    portfolio_tickers = set(ticker_list)
    losses = []
    total_harvestable = 0.0

    for ticker, weight, purchase_price in zip(ticker_list, normalized_weights, purchase_price_list):
        if purchase_price is None:
            continue
        current_price = _get_current_price(ticker)
        if current_price is None:
            continue
        loss_pct = (current_price - purchase_price) / purchase_price * 100
        if loss_pct >= 0:
            continue  # Not at a loss

        alloc_value = portfolio_value * weight
        loss_dollars = alloc_value * (loss_pct / 100)
        total_harvestable += loss_dollars

        sector = _get_sector(ticker)
        replacement = _pick_replacement(ticker, sector, portfolio_tickers)
        reasoning = _generate_tlh_reasoning(ticker, replacement, sector, loss_pct, alloc_value, loss_dollars)

        losses.append({
            "ticker": ticker,
            "loss_pct": round(loss_pct, 2),
            "loss_dollars": round(loss_dollars, 2),
            "current_price": round(current_price, 2),
            "purchase_price": round(purchase_price, 2),
            "suggested_replacement": replacement,
            "sector": sector,
            "reasoning": reasoning,
        })

    # Sort by largest loss first
    losses.sort(key=lambda x: x["loss_dollars"])

    return {
        "losses": losses,
        "total_harvestable_loss": round(total_harvestable, 2),
    }


# ── Capital Gains Estimator ───────────────────────────────────────────────────

@app.get("/portfolio/capital-gains")
def portfolio_capital_gains(
    tickers: str = "AAPL",
    weights: str = "",
    cost_basis: str = "",
    purchase_dates: str = "",
    portfolio_value: float = 10000.0,
    ltcg_rate: int = 15,
    stcg_rate: int = 22,
):
    """
    For each ticker with a cost basis, compute unrealized gain/loss, classify ST vs LT,
    and estimate tax owed using 2024 federal brackets.
    ltcg_rate: 0, 15, or 20 (caller selects based on income bracket)
    stcg_rate: 22 (ordinary income; default middle bracket)
    """
    from datetime import date, timedelta

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"holdings": [], "total_unrealized_gain_loss": 0.0, "total_estimated_tax": 0.0}

    weight_list: list[float] = []
    if weights:
        try:
            weight_list = [float(w) for w in weights.split(",")]
        except ValueError:
            weight_list = []
    if len(weight_list) != len(ticker_list):
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)
    total_w = sum(weight_list) or 1.0
    normalized_weights = [w / total_w for w in weight_list]

    basis_list: list[float | None] = []
    for b in cost_basis.split(","):
        try:
            v = float(b.strip())
            basis_list.append(v if v > 0 else None)
        except ValueError:
            basis_list.append(None)
    while len(basis_list) < len(ticker_list):
        basis_list.append(None)

    date_list: list[str | None] = []
    for d in purchase_dates.split(","):
        d = d.strip()
        date_list.append(d if d else None)
    while len(date_list) < len(ticker_list):
        date_list.append(None)

    today = date.today()
    holdings = []
    total_gain_loss = 0.0
    total_tax = 0.0

    for ticker, weight, basis, purchase_date_str in zip(ticker_list, normalized_weights, basis_list, date_list):
        if basis is None or basis <= 0:
            continue

        current_price = _get_current_price(ticker)
        if current_price is None:
            continue

        gain_per_share = current_price - basis
        gain_pct = gain_per_share / basis * 100

        allocated_value = portfolio_value * weight
        # Estimated shares owned based on allocation and cost basis
        approx_shares = allocated_value / basis
        estimated_gain_dollars = approx_shares * gain_per_share

        holding_period_days: int | None = None
        is_long_term: bool | None = None
        if purchase_date_str:
            try:
                pdate = date.fromisoformat(purchase_date_str[:10])
                holding_period_days = (today - pdate).days
                is_long_term = holding_period_days > 365
            except Exception:
                pass

        # Tax rate: if holding period unknown, default to LTCG rate (conservative assumption)
        if is_long_term is True:
            tax_rate = ltcg_rate
        elif is_long_term is False:
            tax_rate = stcg_rate
        else:
            tax_rate = ltcg_rate  # unknown holding period — show LTCG as default

        estimated_tax = max(0.0, estimated_gain_dollars * tax_rate / 100)

        if is_long_term is None:
            term_label = "unknown"
        elif is_long_term:
            term_label = "long-term"
        else:
            term_label = "short-term"

        # Plain-English insight
        if estimated_gain_dollars > 0:
            if is_long_term is False:
                insight = f"Short-term gain taxed as ordinary income at {tax_rate}%. Consider holding until {(date.fromisoformat(purchase_date_str[:10]) + timedelta(days=366)).strftime('%b %d, %Y')} to qualify for the lower {ltcg_rate}% long-term rate and save ~${(estimated_gain_dollars * (stcg_rate - ltcg_rate) / 100):,.0f}." if purchase_date_str else f"Short-term gain taxed at {tax_rate}%."
            elif is_long_term is True:
                insight = f"Long-term gain qualifies for the {ltcg_rate}% preferential rate. Estimated tax if you sell today is ${estimated_tax:,.0f}."
            else:
                insight = f"Enter your purchase date to determine if this gain qualifies for the lower long-term rate."
        elif estimated_gain_dollars < 0:
            insight = f"Unrealized loss of ${abs(estimated_gain_dollars):,.0f}. Selling now could generate a tax loss to offset other gains."
        else:
            insight = "No gain or loss at current prices."

        total_gain_loss += estimated_gain_dollars
        total_tax += estimated_tax

        holdings.append({
            "ticker": ticker,
            "weight": round(weight, 4),
            "cost_basis": round(basis, 2),
            "current_price": round(current_price, 2),
            "purchase_date": purchase_date_str,
            "holding_period_days": holding_period_days,
            "is_long_term": is_long_term,
            "term_label": term_label,
            "gain_loss_per_share": round(gain_per_share, 2),
            "gain_loss_pct": round(gain_pct, 2),
            "allocated_value": round(allocated_value, 2),
            "estimated_gain_loss_dollars": round(estimated_gain_dollars, 2),
            "tax_rate": tax_rate,
            "estimated_tax": round(estimated_tax, 2),
            "insight": insight,
        })

    # Sort: largest gains first, losses last
    holdings.sort(key=lambda x: x["estimated_gain_loss_dollars"], reverse=True)

    return {
        "holdings": holdings,
        "total_unrealized_gain_loss": round(total_gain_loss, 2),
        "total_estimated_tax": round(total_tax, 2),
        "ltcg_rate_used": ltcg_rate,
        "stcg_rate_used": stcg_rate,
    }


# ── Dividend Calendar ─────────────────────────────────────────────────────────

@app.get("/portfolio/dividend-calendar")
def portfolio_dividend_calendar(
    tickers: str = "AAPL",
    weights: str = "",
    portfolio_value: float = 10000.0,
):
    """
    For each ticker, fetch the next ex-dividend date and pay date via yfinance.
    Returns a 90-day forward calendar of upcoming dividend events sorted by ex-date.
    """
    from datetime import date, timedelta

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"calendar": [], "total_projected_income_90d": 0.0}

    weight_list: list[float] = []
    if weights:
        try:
            weight_list = [float(w) for w in weights.split(",")]
        except ValueError:
            weight_list = []
    if len(weight_list) != len(ticker_list):
        weight_list = [1.0 / len(ticker_list)] * len(ticker_list)
    total_w = sum(weight_list) or 1.0
    normalized_weights = [w / total_w for w in weight_list]

    today = date.today()
    cutoff = today + timedelta(days=90)
    calendar = []
    total_income = 0.0

    for ticker, weight in zip(ticker_list, normalized_weights):
        if is_cash_ticker(ticker):
            continue
        try:
            t_obj = yf.Ticker(ticker)
            try:
                info = t_obj.info
            except Exception:
                info = {}

            ex_div_ts = info.get("exDividendDate")
            ex_div_date: date | None = None
            if ex_div_ts:
                try:
                    ex_div_date = datetime.fromtimestamp(int(ex_div_ts), tz=timezone.utc).date()
                except Exception:
                    ex_div_date = None

            if ex_div_date is None or ex_div_date < today or ex_div_date > cutoff:
                continue

            div_rate = safe_float(info.get("dividendRate"))  # annual
            trailing_rate = safe_float(info.get("trailingAnnualDividendRate"))
            annual_div = div_rate or trailing_rate or 0.0

            # Determine frequency to estimate per-payment amount
            freq_str = "quarterly"
            freq_count = 4
            if div_rate and trailing_rate and trailing_rate > 0:
                ratio = div_rate / trailing_rate
                if ratio > 0.9:
                    # Annual = once/year
                    freq_count = 1
                    freq_str = "annual"
            # Fallback heuristics from lastDividendValue
            last_div = safe_float(info.get("lastDividendValue")) or 0.0
            if annual_div > 0 and last_div > 0:
                ratio = annual_div / last_div
                if 11 <= ratio <= 13:
                    freq_count = 12
                    freq_str = "monthly"
                elif 3.5 <= ratio <= 4.5:
                    freq_count = 4
                    freq_str = "quarterly"
                elif 1.8 <= ratio <= 2.2:
                    freq_count = 2
                    freq_str = "semi-annual"
                elif ratio <= 1.2:
                    freq_count = 1
                    freq_str = "annual"

            dividend_per_payment = last_div if last_div > 0 else (annual_div / freq_count if annual_div > 0 else 0.0)

            # Estimate pay date: typically ~3-4 weeks after ex-date
            try:
                cal = t_obj.calendar
                pay_date_str: str | None = None
                if isinstance(cal, dict):
                    raw_pay = cal.get("Dividend Date")
                    if raw_pay:
                        try:
                            if hasattr(raw_pay, "date"):
                                pay_date_str = raw_pay.date().isoformat()
                            else:
                                pay_date_str = str(raw_pay)[:10]
                        except Exception:
                            pay_date_str = None
            except Exception:
                pay_date_str = None

            if pay_date_str is None:
                pay_date_str = (ex_div_date + timedelta(days=28)).isoformat()

            allocated_value = portfolio_value * weight
            div_yield_pct = (safe_float(info.get("dividendYield")) or 0.0) * 100  # yfinance returns decimal fraction; convert to pct
            projected_income = allocated_value * div_yield_pct / 100 / freq_count if div_yield_pct else allocated_value * dividend_per_payment / (safe_float(info.get("regularMarketPrice")) or safe_float(info.get("currentPrice")) or 1.0) if dividend_per_payment else 0.0

            days_until_ex = (ex_div_date - today).days
            total_income += projected_income

            calendar.append({
                "ticker": ticker,
                "company": info.get("longName") or info.get("shortName") or ticker,
                "ex_date": ex_div_date.isoformat(),
                "pay_date": pay_date_str,
                "dividend_per_share": round(dividend_per_payment, 4),
                "frequency": freq_str,
                "yield_pct": round(div_yield_pct, 4),
                "projected_income": round(projected_income, 2),
                "days_until_ex": days_until_ex,
                "allocated_value": round(allocated_value, 2),
            })

        except Exception as e:
            print(f"dividend-calendar error for {ticker}: {e}")

    calendar.sort(key=lambda x: x["ex_date"])

    return {
        "calendar": calendar,
        "total_projected_income_90d": round(total_income, 2),
    }


# ── Portfolio Share Image ─────────────────────────────────────────────────────

@app.get("/portfolio/share-image")
def portfolio_share_image(
    tickers: str = "AAPL,MSFT",
    weights: str = "50,50",
    ret: float = 18.4,
    sharpe: float = 1.92,
    health: int = 78,
    drawdown: float = -14.2,
    vol: float = 0.0,
    theme: str = "dark",
):
    """Generate a 1200x630 OG-style portfolio card image — clean minimal design."""
    from fastapi.responses import StreamingResponse
    import io, datetime
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow not installed")

    W, H = 1200, 630
    is_light = theme == "light"
    GREEN = (92, 184, 138)
    RED   = (224, 92, 92)
    AMBER = (201, 168, 76)

    if is_light:
        BG           = (248, 246, 241)
        TEXT_DIM     = (140, 130, 110)
        CARD_BG      = (255, 255, 255, 255)
        CARD_OUTLINE = (220, 214, 200, 255)
        PILL_BG      = (201, 168, 76, 30)
        PILL_OUT     = (201, 168, 76, 120)
        DIVIDER_CLR  = (201, 168, 76, 100)
    else:
        BG           = (8, 12, 21)
        TEXT_DIM     = (100, 95, 80)
        CARD_BG      = (13, 21, 37, 255)
        CARD_OUTLINE = (40, 52, 75, 255)
        PILL_BG      = (201, 168, 76, 22)
        PILL_OUT     = (201, 168, 76, 70)
        DIVIDER_CLR  = (201, 168, 76, 80)

    img  = Image.new("RGBA", (W, H), (*BG, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # ── 4px amber top border ──
    draw.rectangle([(0, 0), (W, 4)], fill=(*AMBER, 255))

    # ── Fonts ──
    def try_font(path, size):
        try:    return ImageFont.truetype(path, size)
        except: return ImageFont.load_default()

    FONT_PATHS = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    MONO_PATHS = [
        "/System/Library/Fonts/SFNSMono.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
    ]
    fp = next((p for p in FONT_PATHS if os.path.exists(p)), None)
    mp = next((p for p in MONO_PATHS if os.path.exists(p)), None)

    font_corvo   = try_font(fp, 48) if fp else ImageFont.load_default()
    font_tagline = try_font(mp, 14) if mp else ImageFont.load_default()
    font_date    = try_font(fp, 16) if fp else ImageFont.load_default()
    font_tickers = try_font(mp, 16) if mp else ImageFont.load_default()
    font_ret     = try_font(mp, 96) if mp else ImageFont.load_default()
    font_ret_lbl = try_font(mp, 14) if mp else ImageFont.load_default()
    font_card_val= try_font(fp, 32) if fp else ImageFont.load_default()
    font_card_lbl= try_font(mp, 13) if mp else ImageFont.load_default()
    font_pill    = try_font(mp, 17) if mp else ImageFont.load_default()
    font_footer  = try_font(fp, 15) if fp else ImageFont.load_default()

    LM = 60  # left margin

    # ── TOP SECTION (y=30–130) ──
    # "CORVO" large bold amber
    draw.text((LM, 30), "CORVO", font=font_corvo, fill=AMBER)

    # "PORTFOLIO INTELLIGENCE" tiny spaced letters below
    tag = "PORTFOLIO  INTELLIGENCE"
    draw.text((LM, 88), tag, font=font_tagline, fill=TEXT_DIM)

    # Date top-right
    date_str = datetime.date.today().strftime("%b %d, %Y").upper()
    bbox = draw.textbbox((0, 0), date_str, font=font_date)
    date_x = W - LM - (bbox[2] - bbox[0])
    draw.text((date_x, 34), date_str, font=font_date, fill=TEXT_DIM)

    # Ticker list top-right below date (e.g. "AAPL · MSFT · NVDA")
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    weight_list_raw = [w.strip() for w in weights.split(",") if w.strip()]
    try:
        wts     = [float(w) for w in weight_list_raw]
        total_w = sum(wts) or 1
        wts     = [w / total_w * 100 for w in wts]
    except Exception:
        wts = [100 / len(ticker_list)] * len(ticker_list)

    ticker_str = "  ·  ".join(ticker_list[:6])
    bbox = draw.textbbox((0, 0), ticker_str, font=font_tickers)
    tick_x = W - LM - (bbox[2] - bbox[0])
    draw.text((tick_x, 62), ticker_str, font=font_tickers, fill=TEXT_DIM)

    # ── CENTER LEFT (y=160–340): giant return ──
    ret_sign  = "+" if ret >= 0 else ""
    ret_color = GREEN if ret >= 0 else RED
    ret_str   = f"{ret_sign}{ret:.1f}%"

    bbox = draw.textbbox((0, 0), ret_str, font=font_ret)
    rh   = bbox[3] - bbox[1]
    ret_y = 160
    draw.text((LM, ret_y), ret_str, font=font_ret, fill=ret_color)

    lbl = "P O R T F O L I O   R E T U R N"
    draw.text((LM, ret_y + rh + 14), lbl, font=font_ret_lbl, fill=(*AMBER, 180))

    # ── CENTER RIGHT (y=155–345): 2×2 metric cards ──
    vol_display = vol if vol >= 1.0 else vol * 100
    health_color = GREEN if health >= 70 else (AMBER if health >= 50 else RED)
    metrics = [
        ("SHARPE  RATIO",  f"{sharpe:.2f}",       (*AMBER, 255) if is_light else (220, 210, 185, 255)),
        ("VOLATILITY",     f"{vol_display:.1f}%",  (*AMBER, 255) if is_light else (220, 210, 185, 255)),
        ("HEALTH  SCORE",  f"{health}/100",        (*health_color, 255)),
        ("MAX  DRAWDOWN",  f"{drawdown:.1f}%",     (*RED, 255)),
    ]

    CARD_X   = 620
    CARD_W   = 240
    CARD_H   = 88
    CARD_GAP = 16
    CARD_Y0  = 155

    for i, (mlabel, mval, mcolor) in enumerate(metrics):
        col_i = i % 2
        row_i = i // 2
        cx = CARD_X + col_i * (CARD_W + CARD_GAP)
        cy = CARD_Y0 + row_i * (CARD_H + CARD_GAP)

        # Card background — use RGBA image overlay for subtle fill
        card_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card_layer, "RGBA")
        cd.rounded_rectangle(
            [cx, cy, cx + CARD_W, cy + CARD_H],
            radius=10, fill=CARD_BG, outline=CARD_OUTLINE, width=1,
        )
        img  = Image.alpha_composite(img, card_layer)
        draw = ImageDraw.Draw(img, "RGBA")

        # Value (large, top area)
        bbox = draw.textbbox((0, 0), mval, font=font_card_val)
        vw = bbox[2] - bbox[0]
        draw.text((cx + (CARD_W - vw) // 2, cy + 14), mval, font=font_card_val, fill=mcolor)

        # Label (small spaced, bottom area)
        bbox = draw.textbbox((0, 0), mlabel, font=font_card_lbl)
        lw = bbox[2] - bbox[0]
        draw.text((cx + (CARD_W - lw) // 2, cy + CARD_H - 26), mlabel, font=font_card_lbl, fill=TEXT_DIM)

    # ── BOTTOM SECTION (y=380–440): amber divider + ticker pills ──
    DIV_Y = 375
    draw.line([(LM, DIV_Y), (W - LM, DIV_Y)], fill=DIVIDER_CLR, width=1)

    pill_gap   = 12
    pill_h     = 34
    pill_y     = DIV_Y + 20
    pill_sizes = []
    for t, w in zip(ticker_list, wts):
        txt  = f"{t}  {w:.0f}%"
        bbox = draw.textbbox((0, 0), txt, font=font_pill)
        pill_sizes.append((txt, (bbox[2] - bbox[0]) + 28))

    # Single centered row (trim to fit)
    MAX_ROW_W = W - LM * 2
    row: list[tuple[str, int]] = []
    row_w = 0
    for item in pill_sizes:
        needed = item[1] + (pill_gap if row else 0)
        if row_w + needed > MAX_ROW_W:
            break
        row.append(item)
        row_w += needed

    if row:
        rx = (W - row_w) // 2
        for txt, pw in row:
            pill_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pill_layer, "RGBA")
            pd.rounded_rectangle(
                [rx, pill_y, rx + pw, pill_y + pill_h],
                radius=8, fill=PILL_BG, outline=PILL_OUT, width=1,
            )
            img  = Image.alpha_composite(img, pill_layer)
            draw = ImageDraw.Draw(img, "RGBA")
            bbox = draw.textbbox((0, 0), txt, font=font_pill)
            th   = bbox[3] - bbox[1]
            draw.text((rx + 14, pill_y + (pill_h - th) // 2), txt, font=font_pill, fill=AMBER)
            rx  += pw + pill_gap

    # ── FOOTER (y=580) ──
    footer = "Analyzed with Corvo  ·  corvo.capital  ·  Not financial advice"
    bbox   = draw.textbbox((0, 0), footer, font=font_footer)
    draw.text(((W - (bbox[2] - bbox[0])) // 2, 588), footer, font=font_footer, fill=TEXT_DIM)

    # ── Export ──
    final = img.convert("RGB")
    buf   = io.BytesIO()
    final.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png", headers={
        "Cache-Control": "no-cache",
        "Content-Disposition": 'inline; filename="portfolio-card.png"',
    })


# ── Morning Market Brief Push ──────────────────────────────────────────────────

_BRIEF_INDICES = ["SPY", "QQQ", "IWM", "DIA"]
_BRIEF_MOVERS  = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"]


def _brief_one_day_change(ticker: str) -> float:
    """Return 1-day % change using live price from .info (matches watchlist-data logic)."""
    try:
        info = yf.Ticker(ticker).info or {}
        price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
        prev  = float(info.get("previousClose") or info.get("regularMarketPreviousClose") or price)
        if price > 0 and prev > 0:
            return round((price - prev) / prev * 100, 2)
    except Exception:
        pass
    # Fallback: 2-day history close-to-close
    try:
        hist = yf.Ticker(ticker).history(period="2d")
        if len(hist) >= 2:
            prev, curr = float(hist["Close"].iloc[-2]), float(hist["Close"].iloc[-1])
            return round((curr - prev) / prev * 100, 2)
    except Exception:
        pass
    return 0.0


def _brief_fetch_indices() -> dict[str, float]:
    return {t: _brief_one_day_change(t) for t in _BRIEF_INDICES}


def _brief_fetch_movers() -> list[dict]:
    try:
        data = yf.download(_BRIEF_MOVERS, period="2d", auto_adjust=True, progress=False)
        # Extract close prices and volumes (handle both flat and MultiIndex column structures)
        if isinstance(data.columns, pd.MultiIndex):
            closes  = data["Close"]
            volumes = data["Volume"].iloc[-1].dropna()
        else:
            closes  = data[["Close"]].rename(columns={"Close": _BRIEF_MOVERS[0]}) if "Close" in data.columns else data.iloc[:, :1]
            volumes = data["Volume"].iloc[-1].dropna() if "Volume" in data.columns else pd.Series(dtype=float)
        top5 = volumes.nlargest(5).index.tolist()
        # Compute change_pct from batch closes (same logic as market-summary)
        changes: dict[str, float] = {}
        if len(closes) >= 2:
            prev_row, curr_row = closes.iloc[-2], closes.iloc[-1]
            for t in top5:
                if t in closes.columns:
                    p0, p1 = safe_float(prev_row[t]), safe_float(curr_row[t])
                    changes[t] = round((p1 - p0) / p0 * 100, 2) if p0 > 0 else 0.0
        return [{"ticker": t, "change": changes.get(t, _brief_one_day_change(t)), "volume": int(volumes.get(t, 0))} for t in top5]
    except Exception:
        return [{"ticker": t, "change": _brief_one_day_change(t), "volume": 0} for t in _BRIEF_MOVERS[:5]]


def _brief_generate(indices: dict[str, float], movers: list[dict]) -> dict:
    """Call Claude to write a structured market brief. Returns a dict with sections."""
    import anthropic as _anthropic
    import json as _json
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {}
    client = _anthropic.Anthropic(api_key=api_key)
    index_lines  = "\n".join([f"  {t}: {v:+.2f}%" for t, v in indices.items()])
    mover_lines  = "\n".join([f"  {m['ticker']}: {m['change']:+.2f}% (vol {m['volume']:,})" for m in movers])
    from datetime import date as _date
    today_str = _date.today().strftime("%A, %B %-d")
    prompt = (
        "You are a market analyst. Return ONLY a valid JSON object (no markdown fences, no extra text) "
        "with exactly these keys:\n\n"
        "{\n"
        '  "market_summary": "2-3 sentences on what the major indexes did today and why",\n'
        '  "market_driver": "1 sentence on the single biggest reason markets moved",\n'
        '  "portfolio_impact": "2-3 sentences on how today\'s moves would affect a diversified equity holder, referencing the most active stocks",\n'
        '  "outlook": "1-2 sentences on the key thing to watch next"\n'
        "}\n\n"
        f"INDEX PERFORMANCE (1-day, live data):\n{index_lines}\n\n"
        f"TOP 5 MOST ACTIVE STOCKS (1-day, live data):\n{mover_lines}\n\n"
        "RULES:\n"
        "- Use ONLY the exact percentages listed above. Never infer, estimate, or reference any price or percentage move not explicitly listed.\n"
        "- If a percentage is 0.00%, say the index was flat.\n"
        "- Plain prose only. No asterisks, no em dashes, no markdown, no bullet points.\n"
        "- Be direct and analytical. No fluff.\n"
        "- Return only the JSON object, nothing else."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system="You are a market analyst. Return only valid JSON, no markdown, no commentary.",
        messages=[{"role": "user", "content": prompt}],
    )
    raw = clean_ai_response(response.content[0].text).strip()
    # Strip markdown fences if Claude wraps it anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        sections = _json.loads(raw)
    except Exception:
        # Fallback: return a single market_summary from the raw text
        sections = {"market_summary": raw, "market_driver": "", "portfolio_impact": "", "outlook": ""}
    return {k: clean_ai_response(v) for k, v in sections.items() if isinstance(v, str)}


def _brief_push_body(brief: str, indices: dict[str, float]) -> str:
    """Build the push notification body: first sentence + SPY/QQQ snapshot."""
    first_sentence = brief.split(".")[0].strip() + "." if brief else "Markets are open."
    spy  = indices.get("SPY", 0.0)
    qqq  = indices.get("QQQ", 0.0)
    index_note = f"  SPY {spy:+.2f}%  ·  QQQ {qqq:+.2f}%"
    return f"{first_sentence}\n{index_note}"


async def send_morning_brief() -> dict:
    """
    Generate AI market brief and push to all subscribers.
    Returns a summary dict (sent, failed, removed, skipped).
    """
    print("[morning-brief] generating market brief…")
    try:
        indices = await asyncio.get_event_loop().run_in_executor(None, _brief_fetch_indices)
        movers  = await asyncio.get_event_loop().run_in_executor(None, _brief_fetch_movers)
        brief   = await asyncio.get_event_loop().run_in_executor(None, _brief_generate, indices, movers)
    except Exception as e:
        print(f"[morning-brief] data fetch/generate error: {e}")
        return {"error": str(e)}

    if not brief:
        print("[morning-brief] no brief generated (API key missing?)")
        return {"skipped": "no brief"}

    title = "📈 Morning Market Brief"
    body  = _brief_push_body(brief, indices)
    icon  = "https://corvo.capital/corvo-logo.png"
    url   = "https://corvo.capital/app"

    # Fetch all push subscriptions
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[morning-brief] Supabase not configured, skipping push")
        return {"skipped": "supabase not configured", "brief": brief}

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,subscription",
            headers=_sb_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"[morning-brief] failed to fetch subscriptions: {resp.status_code}")
            return {"error": f"supabase {resp.status_code}"}
        rows = resp.json()
    except Exception as e:
        print(f"[morning-brief] supabase fetch error: {e}")
        return {"error": str(e)}

    # Fetch users who have explicitly disabled push notifications
    optout_users: set[str] = set()
    try:
        optout_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/email_preferences?push_notifications=eq.false&select=user_id",
            headers=_sb_headers(), timeout=5,
        )
        if optout_resp.status_code == 200:
            optout_users = {r["user_id"] for r in optout_resp.json()}
    except Exception:
        pass

    sent = failed = removed = 0
    dead_ids: list[str] = []

    for row in rows:
        if row.get("user_id") in optout_users:
            continue
        sub = row.get("subscription", {})
        row_id = row.get("id")
        result = _send_push(sub, title, body, icon=icon, url=url)
        if result == "ok":
            sent += 1
        elif result == "dead":
            failed += 1
            if row_id:
                dead_ids.append(str(row_id))
        else:
            failed += 1

    # Prune dead subscriptions
    for dead_id in dead_ids:
        try:
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{dead_id}",
                headers=_sb_headers(),
                timeout=5,
            )
            removed += 1
        except Exception:
            pass

    print(f"[morning-brief] done, sent={sent} failed={failed} removed={removed}")
    return {"sent": sent, "failed": failed, "removed": removed, "brief_preview": brief[:120]}


def _seconds_until_9am_et() -> float:
    """Return seconds until the next 9:00 AM US/Eastern, minimum 60 s."""
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now_et = datetime.now(ZoneInfo("America/New_York"))
    target = now_et.replace(hour=9, minute=0, second=0, microsecond=0)
    if now_et >= target:
        target += timedelta(days=1)
    return max((target - now_et).total_seconds(), 60.0)


async def morning_brief_loop():
    """Background task: fire market brief push at 9am ET every day."""
    print("[morning-brief] scheduler started")
    while True:
        wait = _seconds_until_9am_et()
        print(f"[morning-brief] sleeping {wait/3600:.2f}h until 9am ET")
        await asyncio.sleep(wait)
        try:
            await send_morning_brief()
        except Exception as e:
            print(f"[morning-brief] loop error: {e}")
        # Sleep 60 s after firing so we don't re-trigger within the same minute
        await asyncio.sleep(60)


@app.get("/push/test-brief")
async def test_morning_brief(request: Request):
    """Manually trigger the morning market brief push (for testing). Requires X-Admin-Key header."""
    _require_admin_key(request)
    result = await send_morning_brief()
    return result


@app.get("/push/test")
async def push_test(user_id: str = "", request: Request = None):
    """Send a test push notification to all subscriptions for the given user. Requires X-Admin-Key header."""
    _require_admin_key(request)
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        subs_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=id,subscription",
            headers=_sb_headers(), timeout=5,
        )
        if subs_resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Supabase error {subs_resp.status_code}")
        rows = subs_resp.json()
        if not rows:
            return {"status": "no_subscriptions", "sent": 0}
        sent = dead = 0
        dead_ids: list[str] = []
        for row in rows:
            result = _send_push(
                row["subscription"],
                "Corvo test notification",
                "Push notifications are working correctly.",
                url="https://corvo.capital/app",
            )
            if result == "ok":
                sent += 1
            elif result == "dead":
                dead += 1
                if row.get("id"):
                    dead_ids.append(str(row["id"]))
        for dead_id in dead_ids:
            try:
                requests.delete(
                    f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{dead_id}",
                    headers=_sb_headers(), timeout=5,
                )
            except Exception:
                pass
        return {"status": "ok", "sent": sent, "dead": dead}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ── Market Brief HTTP endpoint (cached) ───────────────────────────────────────
_market_brief_cache: dict = {}
_BRIEF_TTL = 3600  # 1 hour


@app.get("/market-brief")
async def market_brief_endpoint(force: bool = False):
    """Return AI-generated daily market brief, cached 1 hour. Used by the frontend."""
    now = time.time()
    cached = _market_brief_cache.get("data")
    if not force and cached and (now - _market_brief_cache.get("ts", 0)) < _BRIEF_TTL:
        return cached

    try:
        loop = asyncio.get_event_loop()
        indices  = await loop.run_in_executor(None, _brief_fetch_indices)
        movers   = await loop.run_in_executor(None, _brief_fetch_movers)
        sections = await loop.run_in_executor(None, _brief_generate, indices, movers)
        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # Keep legacy `brief` field (first section text) for push notification compat
        legacy_brief = sections.get("market_summary", "")
        result = {
            "brief": legacy_brief,
            "sections": sections,
            "generated_at": generated_at,
            "indices": {k: safe_float(v) for k, v in indices.items()},
            "movers": movers,
        }
        _market_brief_cache["data"] = result
        _market_brief_cache["ts"] = now
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _gen_price_target_recommendation(ticker: str, current_price: float, target_price: float, direction: str) -> str:
    """Generate a one-sentence AI action recommendation for a triggered price target."""
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return ""
        client = anthropic.Anthropic(api_key=api_key)
        prompt = (
            f"{ticker} has {'reached' if direction == 'above' else 'fallen to'} your price target of ${target_price:.2f}. "
            f"Current price is ${current_price:.2f}. "
            "In exactly one sentence, give a specific, actionable recommendation for what the investor should consider doing now. "
            "Be direct and concrete. Do not use asterisks or em dashes."
        )
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip() if resp.content else ""
    except Exception as e:
        print(f"[price-targets] AI recommendation error: {e}")
        return ""


async def check_price_targets():
    """Check all untriggered price targets against current prices."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/price_targets?triggered=eq.false&select=id,user_id,ticker,target_price,direction,notes",
            headers=_sb_headers(), timeout=10,
        )
        if resp.status_code != 200:
            return
        targets = resp.json()
        if not targets:
            return

        # Group targets by ticker to minimise API calls
        ticker_targets: dict[str, list[dict]] = {}
        for t in targets:
            ticker = t.get("ticker", "").upper()
            if ticker:
                ticker_targets.setdefault(ticker, []).append(t)

        for ticker, target_list in ticker_targets.items():
            try:
                df = yf.download(ticker, period="1d", interval="1m", progress=False, auto_adjust=True)
                if df.empty:
                    continue
                raw = df["Close"].iloc[-1]
                current_price = float(raw.iloc[0] if hasattr(raw, "iloc") else raw)

                for target in target_list:
                    target_price = float(target["target_price"])
                    direction = target["direction"]
                    triggered = (
                        (direction == "above" and current_price >= target_price) or
                        (direction == "below" and current_price <= target_price)
                    )
                    if not triggered:
                        continue

                    target_id = target["id"]
                    user_id = target["user_id"]

                    # Mark triggered
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/price_targets?id=eq.{target_id}",
                        headers={**_sb_headers(), "Prefer": "return=minimal"},
                        json={"triggered": True, "triggered_at": datetime.now(timezone.utc).isoformat()},
                        timeout=5,
                    )

                    # Generate AI recommendation (run in executor to avoid blocking)
                    recommendation = await asyncio.get_event_loop().run_in_executor(
                        None, _gen_price_target_recommendation, ticker, current_price, target_price, direction
                    )

                    notif_title = f"Price target hit: {ticker}"
                    direction_word = "reached" if direction == "above" else "fallen to"
                    notif_body = f"{ticker} has {direction_word} your target of ${target_price:.2f}. Now at ${current_price:.2f}."

                    # Fetch preferences once for both push and email
                    pref_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}&select=push_notifications,price_alerts,email_theme",
                        headers=_sb_headers(), timeout=5,
                    )
                    send_push = True
                    send_email = True
                    email_theme = "light"
                    if pref_resp.status_code == 200 and pref_resp.json():
                        prow = pref_resp.json()[0]
                        send_push = prow.get("push_notifications", True) is not False
                        send_email = prow.get("price_alerts", True) is not False
                        email_theme = prow.get("email_theme") or "light"

                    # Push notification
                    if send_push:
                        subs_resp = requests.get(
                            f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=subscription",
                            headers=_sb_headers(), timeout=5,
                        )
                        if subs_resp.status_code == 200:
                            for row in subs_resp.json():
                                _send_push(row["subscription"], notif_title, notif_body)

                    # Email notification
                    if send_email:
                        user_resp = requests.get(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                            headers=_sb_headers(), timeout=5,
                        )
                        if user_resp.status_code == 200:
                            email = user_resp.json().get("email", "")
                            if email:
                                _send_price_target_email(
                                    email, ticker, current_price, target_price, direction,
                                    recommendation, user_id=user_id, email_theme=email_theme
                                )

                    print(f"[price-targets] triggered: {ticker} {direction} ${target_price:.2f} @ ${current_price:.2f} for user {user_id}")
            except Exception as e:
                err_str = str(e)
                if "401" in err_str or "Unauthorized" in err_str or "Crumb" in err_str:
                    print(f"[price-targets] yfinance session expired, skipping cycle")
                    break
                print(f"[price-targets] error checking {ticker}: {e}")
    except Exception as e:
        print(f"[price-targets] check error: {e}")


def _send_price_target_email(
    to_email: str, ticker: str, current_price: float, target_price: float,
    direction: str, recommendation: str, user_id: str = "", email_theme: str = "light"
):
    """Send a price target hit email via Resend."""
    if not to_email:
        return
    direction_word = "reached" if direction == "above" else "fallen to"
    subject = f"Price target hit: {ticker} has {direction_word} ${target_price:.2f}"
    mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
    body_lines = [
        f"<strong style=\"color:{mono_color};font-family:'Courier New',Courier,monospace;font-size:20px;\">${current_price:.2f}</strong>",
        f"{ticker} has {direction_word} your price target of ${target_price:.2f}.",
    ]
    if recommendation:
        body_lines.append(recommendation)
    body_lines.append("Log in to review your position and act on this signal.")
    html = _email_html(
        heading=f"{ticker} target hit",
        label="Price Target",
        body_lines=body_lines,
        cta_text="Review portfolio",
        cta_url="https://corvo.capital/app",
        user_id=user_id,
        email_theme=email_theme,
    )
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "Corvo Alerts <alerts@corvo.capital>")
    _resend(to_email, subject, html, from_addr=from_addr)


async def price_alert_loop():
    """Background loop: check price alerts and price targets every 60 seconds."""
    print("[alerts] background price alert checker started")
    while True:
        try:
            await check_price_alerts()
        except Exception as e:
            print(f"[alerts] loop error: {e}")
        try:
            await check_price_targets()
        except Exception as e:
            print(f"[price-targets] loop error: {e}")
        await asyncio.sleep(60)


# ── Scheduled Email System ────────────────────────────────────────────────────


def _finnhub_quote(ticker: str) -> "dict | None":
    """Fetch a live Finnhub quote. Returns {c, d, dp, pc} or None on failure."""
    key = os.environ.get("FINNHUB_API_KEY", "")
    if not key:
        return None
    try:
        resp = requests.get(
            f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={key}",
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("c", 0) > 0:
                return data
    except Exception as e:
        print(f"[finnhub] quote error for {ticker}: {e}")
    return None


def _fetch_user_email_data(user_id: str):
    """Return (email, display_name, tickers, weights) for the user's first portfolio, or None."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"[email-data] skip {user_id}: missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return None
    try:
        ur = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_sb_headers(), timeout=8,
        )
        print(f"[email-data] auth.users query: status={ur.status_code}")
        if ur.status_code != 200:
            print(f"[email-data] skip {user_id}: Supabase auth.users returned status {ur.status_code} body={ur.text[:200]}")
            return None
        ud = ur.json()
        email = ud.get("email", "")
        if not email:
            print(f"[email-data] skip {user_id}: no email found in auth.users (field missing or empty)")
            return None
        meta = ud.get("user_metadata") or {}
        display_name = meta.get("full_name") or meta.get("name") or email.split("@")[0]
        pr = requests.get(
            f"{SUPABASE_URL}/rest/v1/portfolios?user_id=eq.{user_id}&select=tickers,weights&limit=1",
            headers=_sb_headers(), timeout=8,
        )
        print(f"[email-data] portfolios query for {user_id}: status={pr.status_code} rows={len(pr.json()) if pr.status_code == 200 else 'n/a'}")
        if pr.status_code != 200:
            print(f"[email-data] skip {user_id}: portfolios query failed status={pr.status_code} body={pr.text[:200]}")
            return None
        if not pr.json():
            print(f"[email-data] skip {user_id}: no portfolio found in database")
            return None
        pf = pr.json()[0]
        tickers = pf.get("tickers") or []
        weights_raw = pf.get("weights") or []
        if not tickers:
            print(f"[email-data] skip {user_id}: portfolio exists but tickers list is empty")
            return None
        weights = [float(w) for w in weights_raw[:len(tickers)]]
        total = sum(weights)
        if total <= 0:
            weights = [1.0 / len(tickers)] * len(tickers)
        else:
            weights = [w / total for w in weights]
        print(f"[email-data] success {user_id}: tickers={tickers}")
        return email, display_name, tickers, weights
    except Exception as e:
        print(f"[email-data] skip {user_id}: Supabase error: {e}")
        return None


def _fetch_email_theme(user_id: str) -> str:
    """Return the user's email_theme preference ('light' or 'dark'), defaulting to 'light'."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not user_id:
        return "light"
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{user_id}&select=email_theme",
            headers=_sb_headers(), timeout=5,
        )
        if resp.status_code == 200 and resp.json():
            return resp.json()[0].get("email_theme") or "light"
    except Exception:
        pass
    return "light"


def _opted_in_user_ids(column: str) -> list:
    """Return user_ids with the given email_preferences column set to true."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/email_preferences?{column}=eq.true&select=user_id",
            headers=_sb_headers(), timeout=10,
        )
        if resp.status_code == 200:
            return [r["user_id"] for r in resp.json()]
    except Exception as e:
        print(f"[email-prefs] error fetching {column}: {e}")
    return []


def _portfolio_return_yf(tickers: list, weights: list, period: str):
    """Compute weighted portfolio % return over the given yfinance period."""
    try:
        if not tickers:
            return None
        dl = tickers[0] if len(tickers) == 1 else tickers
        df = yf.download(dl, period=period, auto_adjust=True, progress=False)
        if df.empty or len(df) < 2:
            return None
        close = df["Close"] if isinstance(df.columns, pd.MultiIndex) else df[["Close"]].rename(columns={"Close": tickers[0]})
        ret = 0.0
        for i, ticker in enumerate(tickers):
            if i >= len(weights) or ticker not in close.columns:
                continue
            col = close[ticker].dropna()
            if len(col) < 2:
                continue
            r = (float(col.iloc[-1]) - float(col.iloc[0])) / float(col.iloc[0]) * 100
            ret += weights[i] * r
        return round(ret, 2)
    except Exception as e:
        print(f"[yf-return] error ({period}): {e}")
        return None


def _haiku_teaser(prompt: str, max_tokens: int = 100) -> str:
    """Call Claude Haiku for a short email teaser. Returns '' on error."""
    try:
        import anthropic as _anth
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not key:
            return ""
        client = _anth.Anthropic(api_key=key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return clean_ai_response(resp.content[0].text.strip())
    except Exception as e:
        print(f"[haiku] error: {e}")
        return ""


# ── Email Timing Helpers ───────────────────────────────────────────────────────

def _seconds_until_6am_et() -> float:
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now = datetime.now(ZoneInfo("America/New_York"))
    target = now.replace(hour=6, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 60.0)


def _seconds_until_monday_6am_et() -> float:
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now = datetime.now(ZoneInfo("America/New_York"))
    days_ahead = (7 - now.weekday()) % 7
    target = (now + timedelta(days=days_ahead)).replace(hour=6, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=7)
    return max((target - now).total_seconds(), 60.0)


def _seconds_until_first_of_month_6am_et() -> float:
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now = datetime.now(ZoneInfo("America/New_York"))
    if now.day == 1 and now.hour < 6:
        target = now.replace(hour=6, minute=0, second=0, microsecond=0)
    else:
        year = now.year if now.month < 12 else now.year + 1
        month = now.month + 1 if now.month < 12 else 1
        target = datetime(year, month, 1, 6, 0, 0, tzinfo=ZoneInfo("America/New_York"))
    return max((target - now).total_seconds(), 60.0)


# ── Morning Briefing Email ─────────────────────────────────────────────────────

async def send_morning_briefing_emails(target_user_id=None) -> dict:
    """Send morning briefing emails to opted-in users at 6am ET."""
    user_ids = [target_user_id] if target_user_id else _opted_in_user_ids("morning_briefing")
    if not user_ids:
        return {"sent": 0, "skipped": "no opted-in users"}
    from datetime import date as _date
    today_str = _date.today().strftime("%B %-d, %Y")
    subject = f"Your morning briefing for {today_str}"
    sent = failed = skipped = 0
    loop = asyncio.get_event_loop()

    for uid in user_ids:
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, uid)
            if not data:
                print(f"[morning-brief-email] skip {uid}: _fetch_user_email_data returned None (see [email-data] log above for specific reason)")
                skipped += 1
                continue
            email, display_name, tickers, weights = data
            email_theme = await loop.run_in_executor(None, _fetch_email_theme, uid)
            finnhub_key = os.environ.get("FINNHUB_API_KEY", "")
            print(f"[morning-brief-email] user={uid} email={email} tickers={tickers} finnhub_key_present={bool(finnhub_key)}")
            portfolio_change = None
            top_mover = ""
            market_note = ""

            if finnhub_key:
                def _fetch_morning_data():
                    changes = {}
                    for i, ticker in enumerate(tickers[:12]):
                        q = _finnhub_quote(ticker)
                        if q and q.get("dp") is not None:
                            changes[ticker] = q["dp"]
                        time.sleep(0.06)
                    return changes
                changes = await loop.run_in_executor(None, _fetch_morning_data)
                if changes:
                    wsum = sum(weights[tickers.index(t)] * changes[t] for t in changes if t in tickers)
                    wt = sum(weights[tickers.index(t)] for t in changes if t in tickers)
                    if wt > 0:
                        portfolio_change = round(wsum / wt, 2)
                    mv = max(changes.items(), key=lambda x: abs(x[1]))
                    mv_dir = "up" if mv[1] >= 0 else "down"
                    top_mover = f"{mv[0]} is {mv_dir} {abs(mv[1]):.2f}% so far today."
                spy_q = await loop.run_in_executor(None, _finnhub_quote, "SPY")
                if spy_q and spy_q.get("dp") is not None:
                    sp = spy_q["dp"]
                    market_note = f"The S&P 500 is {'up' if sp >= 0 else 'down'} {abs(sp):.2f}% today."

            if portfolio_change is None:
                print(f"[morning-brief-email] skip {uid}: portfolio_change is None — FINNHUB_API_KEY missing or all quotes returned no data")
                skipped += 1
                continue

            sign = "+" if portfolio_change >= 0 else ""
            pct_str = f"{sign}{portfolio_change:.2f}%"
            prompt = (
                f"Write 2 sharp sentences for a morning portfolio email to {display_name}. "
                f"Their portfolio is {pct_str} today. {market_note} {top_mover} "
                "Be direct. Use only the numbers given. No em dashes, no asterisks, no markdown."
            )
            teaser = await loop.run_in_executor(None, _haiku_teaser, prompt, 90)
            if not teaser:
                teaser = f"Your portfolio is {pct_str} today. {market_note}"
            mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
            html = _email_html(
                heading=f"Good morning, {display_name}",
                label="Morning Briefing",
                body_lines=[
                    f"Your portfolio: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">{pct_str}</strong> today.",
                    teaser,
                ],
                cta_text="See your full briefing",
                cta_url="https://corvo.capital/app?section=briefing",
                user_id=uid,
                unsub_type="morning_briefing",
                email_theme=email_theme,
            )
            ok = await loop.run_in_executor(None, _resend, email, subject, html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1
        except Exception as e:
            print(f"[morning-brief-email] error for {uid}: {e}")
            failed += 1

    print(f"[morning-brief-email] done: sent={sent} failed={failed} skipped={skipped}")
    return {"sent": sent, "failed": failed, "skipped": skipped}


async def morning_briefing_email_loop():
    """Background task: send morning briefing emails at 6am ET daily."""
    print("[morning-brief-email] scheduler started")
    while True:
        wait = _seconds_until_6am_et()
        print(f"[morning-brief-email] sleeping {wait/3600:.2f}h until 6am ET")
        await asyncio.sleep(wait)
        try:
            await send_morning_briefing_emails()
        except Exception as e:
            print(f"[morning-brief-email] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/email/test-morning-briefing")
async def test_morning_briefing_email(user_id: str = "", request: Request = None):
    """Manually trigger the morning briefing email for one user (or all opted-in). Requires X-Admin-Key header."""
    _require_admin_key(request)
    uid = user_id or None
    return await send_morning_briefing_emails(target_user_id=uid)


# ── Week in Review Email ────────────────────────────────────────────────────────

async def send_week_in_review_emails(target_user_id=None) -> dict:
    """Send week-in-review emails to opted-in users every Monday at 6am ET."""
    user_ids = [target_user_id] if target_user_id else _opted_in_user_ids("week_in_review")
    if not user_ids:
        return {"sent": 0, "skipped": "no opted-in users"}
    from datetime import date as _date, timedelta as _td
    today = _date.today()
    week_start = today - _td(days=today.weekday() + 7)
    week_end = week_start + _td(days=4)
    subject = f"Your week in review: {week_start.strftime('%b %-d')} to {week_end.strftime('%b %-d')}"
    sent = failed = skipped = 0
    loop = asyncio.get_event_loop()

    for uid in user_ids:
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, uid)
            if not data:
                skipped += 1
                continue
            email, display_name, tickers, weights = data
            email_theme = await loop.run_in_executor(None, _fetch_email_theme, uid)
            ctx = await loop.run_in_executor(None, _portfolio_week_context, tickers, weights)
            if "portfolio_return" not in ctx:
                skipped += 1
                continue

            port_ret = ctx["portfolio_return"]
            sign = "+" if port_ret >= 0 else ""
            pct_str = f"{sign}{port_ret:.2f}%"
            verdict = await loop.run_in_executor(None, _weekly_advisor_verdict, display_name, ctx, False)
            if not verdict:
                verdict = f"Your portfolio returned {pct_str} last week."

            mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
            html = _email_html(
                heading=f"Your week in review, {display_name}",
                label="Week in Review",
                body_lines=[
                    f"Last week: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">{pct_str}</strong>",
                    verdict,
                ],
                cta_text="See your full week",
                cta_url="https://corvo.capital/app",
                user_id=uid,
                unsub_type="week_in_review",
                email_theme=email_theme,
            )
            ok = await loop.run_in_executor(None, _resend, email, subject, html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1
        except Exception as e:
            print(f"[week-in-review-email] error for {uid}: {e}")
            failed += 1

    print(f"[week-in-review-email] done: sent={sent} failed={failed} skipped={skipped}")
    return {"sent": sent, "failed": failed, "skipped": skipped}


async def week_in_review_loop():
    """Background task: send week-in-review emails every Monday at 6am ET."""
    print("[week-in-review-email] scheduler started")
    while True:
        wait = _seconds_until_monday_6am_et()
        print(f"[week-in-review-email] sleeping {wait/3600:.1f}h until Monday 6am ET")
        await asyncio.sleep(wait)
        try:
            await send_week_in_review_emails()
        except Exception as e:
            print(f"[week-in-review-email] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/email/test-week-in-review")
async def test_week_in_review_email(user_id: str = "", request: Request = None):
    """Manually trigger the week-in-review email for one user (or all opted-in). Requires X-Admin-Key header."""
    _require_admin_key(request)
    return await send_week_in_review_emails(target_user_id=user_id or None)


# ── Monthly Summary Email ───────────────────────────────────────────────────────

async def send_monthly_summary_emails(target_user_id=None) -> dict:
    """Send monthly summary emails to opted-in users on the 1st of each month at 6am ET."""
    user_ids = [target_user_id] if target_user_id else _opted_in_user_ids("monthly_summary")
    if not user_ids:
        return {"sent": 0, "skipped": "no opted-in users"}
    from datetime import date as _date
    today = _date.today()
    last_month_num = today.month - 1 if today.month > 1 else 12
    last_month_year = today.year if today.month > 1 else today.year - 1
    month_name = _date(last_month_year, last_month_num, 1).strftime("%B %Y")
    subject = f"Your month in review: {month_name}"
    sent = failed = skipped = 0
    loop = asyncio.get_event_loop()

    for uid in user_ids:
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, uid)
            if not data:
                skipped += 1
                continue
            email, display_name, tickers, weights = data
            email_theme = await loop.run_in_executor(None, _fetch_email_theme, uid)
            monthly_return = await loop.run_in_executor(None, _portfolio_return_yf, tickers, weights, "1mo")
            if monthly_return is None:
                skipped += 1
                continue
            sign = "+" if monthly_return >= 0 else ""
            pct_str = f"{sign}{monthly_return:.2f}%"
            prompt = (
                f"Write 1-2 sentences for a monthly portfolio summary email to {display_name}. "
                f"Their portfolio returned {pct_str} in {month_name}. "
                "Be insightful and direct. No em dashes, no asterisks, no markdown."
            )
            teaser = await loop.run_in_executor(None, _haiku_teaser, prompt, 80)
            if not teaser:
                teaser = f"Your portfolio returned {pct_str} in {month_name}."
            mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
            html = _email_html(
                heading=f"{month_name} in review, {display_name}",
                label="Monthly Summary",
                body_lines=[
                    f"Portfolio return: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">{pct_str}</strong>",
                    teaser,
                ],
                cta_text="See your full month",
                cta_url="https://corvo.capital/app",
                user_id=uid,
                unsub_type="monthly_summary",
                email_theme=email_theme,
            )
            ok = await loop.run_in_executor(None, _resend, email, subject, html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1
        except Exception as e:
            print(f"[monthly-summary-email] error for {uid}: {e}")
            failed += 1

    print(f"[monthly-summary-email] done: sent={sent} failed={failed} skipped={skipped}")
    return {"sent": sent, "failed": failed, "skipped": skipped}


async def monthly_summary_loop():
    """Background task: send monthly summary emails on the 1st of each month at 6am ET."""
    print("[monthly-summary-email] scheduler started")
    while True:
        wait = _seconds_until_first_of_month_6am_et()
        print(f"[monthly-summary-email] sleeping {wait/3600:.1f}h until 1st of month 6am ET")
        await asyncio.sleep(wait)
        try:
            await send_monthly_summary_emails()
        except Exception as e:
            print(f"[monthly-summary-email] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/email/test-monthly-summary")
async def test_monthly_summary_email(user_id: str = "", request: Request = None):
    """Manually trigger the monthly summary email for one user (or all opted-in). Requires X-Admin-Key header."""
    _require_admin_key(request)
    return await send_monthly_summary_emails(target_user_id=user_id or None)




# ── Market Close Summary ────────────────────────────────────────────────────────


def _seconds_until_4_05pm_et() -> float:
    """Return seconds until the next 4:05 PM ET on a weekday (Mon-Fri), minimum 60 s."""
    from zoneinfo import ZoneInfo
    from datetime import timedelta

    now = datetime.now(ZoneInfo("America/New_York"))
    target = now.replace(hour=16, minute=5, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    # Skip Saturday (5) and Sunday (6)
    while target.weekday() >= 5:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 60.0)


async def send_market_close_summary_emails(target_user_id=None) -> dict:
    """Send market close summary emails and push notifications to opted-in users at 4:05pm ET."""
    user_ids = [target_user_id] if target_user_id else _opted_in_user_ids("market_close_summary")
    if not user_ids:
        return {"sent": 0, "skipped": "no opted-in users"}
    from datetime import date as _date

    today_str = _date.today().strftime("%B %-d, %Y")
    subject = f"Your market close summary for {today_str}"
    sent = failed = skipped = push_sent = push_failed = 0
    loop = asyncio.get_event_loop()
    finnhub_key = os.environ.get("FINNHUB_API_KEY", "")

    for uid in user_ids:
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, uid)
            if not data:
                print(f"[mkt-close] skip {uid}: _fetch_user_email_data returned None")
                skipped += 1
                continue
            email, display_name, tickers, weights = data
            email_theme = await loop.run_in_executor(None, _fetch_email_theme, uid)

            if not finnhub_key:
                print(f"[mkt-close] skip {uid}: FINNHUB_API_KEY missing")
                skipped += 1
                continue

            def _fetch_close_data():
                quotes = {}
                for ticker in tickers[:12]:
                    q = _finnhub_quote(ticker)
                    if q and q.get("c", 0) > 0 and q.get("pc", 0) > 0:
                        quotes[ticker] = q
                    time.sleep(0.06)
                return quotes

            quotes = await loop.run_in_executor(None, _fetch_close_data)
            if not quotes:
                print(f"[mkt-close] skip {uid}: no Finnhub quotes returned")
                skipped += 1
                continue

            # Weighted portfolio % change
            wsum = 0.0
            wt = 0.0
            ticker_changes: dict[str, float] = {}
            for i, ticker in enumerate(tickers):
                if ticker not in quotes or i >= len(weights):
                    continue
                dp = quotes[ticker].get("dp") or 0.0
                ticker_changes[ticker] = dp
                wsum += weights[i] * dp
                wt += weights[i]

            if wt <= 0 or not ticker_changes:
                print(f"[mkt-close] skip {uid}: no weighted change data")
                skipped += 1
                continue

            portfolio_pct = round(wsum / wt, 2)
            pct_sign = "+" if portfolio_pct >= 0 else ""
            pct_str = f"{pct_sign}{portfolio_pct:.2f}%"
            dollar_per_10k = round(portfolio_pct / 100 * 10000)
            dollar_sign = "+" if dollar_per_10k >= 0 else ""
            dollar_str = f"{dollar_sign}${abs(dollar_per_10k):,.0f} per $10K"

            best_ticker = max(ticker_changes, key=lambda t: ticker_changes[t])
            worst_ticker = min(ticker_changes, key=lambda t: ticker_changes[t])
            best_pct = ticker_changes[best_ticker]
            worst_pct = ticker_changes[worst_ticker]

            spy_q = await loop.run_in_executor(None, _finnhub_quote, "SPY")
            market_note = ""
            if spy_q and spy_q.get("dp") is not None:
                sp = spy_q["dp"]
                market_note = f"The S&P 500 closed {'up' if sp >= 0 else 'down'} {abs(sp):.2f}% today."

            prompt = (
                f"Write 2-3 sentences for a market close portfolio email to {display_name}. "
                f"Their portfolio closed {pct_str} today ({dollar_str} invested). "
                f"Best performer: {best_ticker} ({best_pct:+.2f}%). "
                f"Worst performer: {worst_ticker} ({worst_pct:+.2f}%). "
                f"{market_note} "
                "End with one specific forward-looking sentence about what to watch tomorrow. "
                "Be direct and specific. No em dashes, no asterisks, no markdown."
            )
            summary = await loop.run_in_executor(None, _haiku_teaser, prompt, 150)
            if not summary:
                summary = (
                    f"Your portfolio closed {pct_str} today. "
                    f"{best_ticker} led at {best_pct:+.2f}% while {worst_ticker} lagged at {worst_pct:+.2f}%."
                )

            mono_color = "#1a1918" if email_theme == "light" else "#e8e0cc"
            html = _email_html(
                heading=f"Market close, {display_name}",
                label="Market Close Summary",
                body_lines=[
                    (
                        f"Your portfolio: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">"
                        f"{pct_str}</strong>"
                        f"&nbsp; <span style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};font-size:12px;\">"
                        f"({dollar_str})</span>"
                    ),
                    (
                        f"Best: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">"
                        f"{best_ticker} {best_pct:+.2f}%</strong>"
                        f"&nbsp;&nbsp; Worst: <strong style=\"font-family:'Courier New',Courier,monospace;color:{mono_color};\">"
                        f"{worst_ticker} {worst_pct:+.2f}%</strong>"
                    ),
                    summary,
                ],
                cta_text="See your portfolio",
                cta_url="https://corvo.capital/app",
                user_id=uid,
                unsub_type="market_close_summary",
                email_theme=email_theme,
            )
            ok = await loop.run_in_executor(None, _resend, email, subject, html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

            # Push notification to all subscriptions for this user
            push_title = f"Market Close: {pct_str}"
            push_body = f"Best: {best_ticker} {best_pct:+.2f}% | Worst: {worst_ticker} {worst_pct:+.2f}%"
            if SUPABASE_URL and SUPABASE_SERVICE_KEY:
                try:
                    subs_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{uid}&select=id,subscription",
                        headers=_sb_headers(),
                        timeout=8,
                    )
                    if subs_resp.status_code == 200:
                        dead_ids: list[str] = []
                        for row in subs_resp.json():
                            result = _send_push(
                                row["subscription"],
                                push_title,
                                push_body,
                                url="https://corvo.capital/app",
                            )
                            if result == "ok":
                                push_sent += 1
                            elif result == "dead":
                                push_failed += 1
                                if row.get("id"):
                                    dead_ids.append(str(row["id"]))
                            else:
                                push_failed += 1
                        for dead_id in dead_ids:
                            try:
                                requests.delete(
                                    f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{dead_id}",
                                    headers=_sb_headers(),
                                    timeout=5,
                                )
                            except Exception:
                                pass
                except Exception as e:
                    print(f"[mkt-close] push error for {uid}: {e}")

        except Exception as e:
            print(f"[mkt-close] error for {uid}: {e}")
            failed += 1

    print(
        f"[mkt-close] done: sent={sent} failed={failed} skipped={skipped} "
        f"push_sent={push_sent} push_failed={push_failed}"
    )
    return {
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "push_sent": push_sent,
        "push_failed": push_failed,
    }


async def market_close_summary_loop():
    """Background task: send market close summary at 4:05pm ET on weekdays."""
    print("[mkt-close] scheduler started")
    while True:
        wait = _seconds_until_4_05pm_et()
        print(f"[mkt-close] sleeping {wait/3600:.2f}h until next weekday 4:05pm ET")
        await asyncio.sleep(wait)
        try:
            await send_market_close_summary_emails()
        except Exception as e:
            print(f"[mkt-close] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/email/test-market-close")
async def test_market_close_email(user_id: str = "", request: Request = None):
    """Manually trigger the market close summary email and push for one user (or all opted-in). Requires X-Admin-Key header."""
    _require_admin_key(request)
    uid = user_id or None
    return await send_market_close_summary_emails(target_user_id=uid)


# ── Weekly Portfolio Checkup Push ──────────────────────────────────────────────


def _seconds_until_sunday_8am_et() -> float:
    """Return seconds until the next Sunday at 8:00 AM ET, minimum 60 s."""
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now = datetime.now(ZoneInfo("America/New_York"))
    # weekday(): Monday=0 ... Sunday=6
    days_ahead = (6 - now.weekday()) % 7
    target = (now + timedelta(days=days_ahead)).replace(hour=8, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=7)
    return max((target - now).total_seconds(), 60.0)


def _portfolio_week_context(tickers: list, weights: list) -> dict:
    """Download weekly price data for all tickers plus SPY and return advisor context."""
    ctx: dict = {}
    try:
        all_dl = list(dict.fromkeys(tickers + ["SPY"]))
        df = yf.download(all_dl, period="5d", auto_adjust=True, progress=False)
        if df.empty or len(df) < 2:
            return ctx
        close = df["Close"] if isinstance(df.columns, pd.MultiIndex) else df[["Close"]].rename(columns={"Close": all_dl[0]})

        if "SPY" in close.columns:
            spy_col = close["SPY"].dropna()
            if len(spy_col) >= 2:
                ctx["spy_return"] = round((float(spy_col.iloc[-1]) - float(spy_col.iloc[0])) / float(spy_col.iloc[0]) * 100, 2)

        contributions = []
        port_ret = 0.0
        for i, ticker in enumerate(tickers):
            if i >= len(weights) or ticker not in close.columns:
                continue
            col = close[ticker].dropna()
            if len(col) < 2:
                continue
            r = (float(col.iloc[-1]) - float(col.iloc[0])) / float(col.iloc[0]) * 100
            contribution = weights[i] * r
            port_ret += contribution
            contributions.append((ticker, contribution, weights[i]))

        if contributions:
            ctx["portfolio_return"] = round(port_ret, 2)
            top = max(contributions, key=lambda x: abs(x[1]))
            ctx["top_ticker"] = top[0]
            ctx["top_contribution"] = round(top[1], 2)
            ctx["top_weight_pct"] = round(top[2] * 100, 1)

        sorted_by_weight = sorted(zip(tickers, weights), key=lambda x: x[1], reverse=True)
        ctx["largest_holding"] = sorted_by_weight[0][0]
        ctx["largest_weight_pct"] = round(sorted_by_weight[0][1] * 100, 1)
        top3 = sorted_by_weight[:3]
        ctx["top3_tickers"] = [t for t, _ in top3]
        ctx["top3_weight_pct"] = round(sum(w for _, w in top3) * 100, 1)
    except Exception as e:
        print(f"[week-ctx] error: {e}")
    return ctx


def _weekly_advisor_verdict(display_name: str, ctx: dict, condensed: bool = False) -> str:
    """Generate advisor-style weekly verdict. condensed=True returns 2 sentences for push notifications."""
    try:
        import anthropic as _anth
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not key:
            return ""
        client = _anth.Anthropic(api_key=key)

        port_ret = ctx.get("portfolio_return")
        if port_ret is None:
            return ""
        sign = "+" if port_ret >= 0 else ""
        pct_str = f"{sign}{port_ret:.2f}%"

        ctx_lines = [f"Portfolio return last week: {pct_str}"]

        spy_ret = ctx.get("spy_return")
        if spy_ret is not None:
            spy_sign = "+" if spy_ret >= 0 else ""
            spy_str = f"{spy_sign}{spy_ret:.2f}%"
            diff = port_ret - spy_ret
            diff_sign = "+" if diff >= 0 else ""
            ctx_lines.append(f"S&P 500 last week: {spy_str} (portfolio difference: {diff_sign}{diff:.2f}%)")

        top_ticker = ctx.get("top_ticker")
        if top_ticker:
            contrib = ctx.get("top_contribution", 0.0)
            contrib_sign = "+" if contrib >= 0 else ""
            weight_pct = ctx.get("top_weight_pct", 0.0)
            ctx_lines.append(f"Biggest driver: {top_ticker} ({weight_pct}% of portfolio, contributed {contrib_sign}{contrib:.2f}% to return)")

        top3 = ctx.get("top3_tickers", [])
        top3_w = ctx.get("top3_weight_pct")
        if top3 and top3_w is not None:
            ctx_lines.append(f"Top 3 holdings ({', '.join(top3)}) make up {top3_w:.0f}% of portfolio")

        context_block = "\n".join(f"- {line}" for line in ctx_lines)

        if condensed:
            prompt = (
                f"You are Corvo, an AI portfolio advisor. Write exactly 2 sentences for {display_name}'s weekly push notification.\n\n"
                f"Portfolio data:\n{context_block}\n\n"
                "Sentence 1: A verdict on how the week went relative to the market and the main driver.\n"
                "Sentence 2: One specific, actionable recommendation.\n\n"
                "No em dashes. No asterisks. No markdown. Be specific to the numbers, not generic."
            )
            max_tokens = 100
        else:
            prompt = (
                f"You are Corvo, an AI portfolio advisor. Write exactly 4 sentences for {display_name}'s weekly review email.\n\n"
                f"Portfolio data:\n{context_block}\n\n"
                "Sentence 1: A verdict on how the week went relative to the S&P 500 and why (reference the specific numbers).\n"
                "Sentence 2: The single biggest driver of performance and what it means for the portfolio.\n"
                "Sentence 3: The key risk or concentration issue to watch right now.\n"
                "Sentence 4: One specific, actionable recommendation tied to what just happened.\n\n"
                "No em dashes. No asterisks. No bullet points. No markdown. Be direct and specific to this portfolio, not generic."
            )
            max_tokens = 300

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip() if resp.content else ""
        return clean_ai_response(text)
    except Exception as e:
        print(f"[weekly-verdict] AI error: {e}")
        return ""


async def send_weekly_portfolio_checkup_push() -> dict:
    """Send a weekly portfolio performance push to all users with push subscriptions (Sunday 8am ET)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"error": "Supabase not configured"}

    subs_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,subscription",
        headers=_sb_headers(), timeout=15,
    )
    if subs_resp.status_code != 200:
        return {"error": f"supabase {subs_resp.status_code}"}

    user_subs: dict[str, list] = {}
    for row in subs_resp.json():
        uid = row.get("user_id")
        if uid:
            user_subs.setdefault(uid, []).append(row)

    if not user_subs:
        return {"sent": 0, "skipped": "no subscribers"}

    optout_users: set[str] = set()
    try:
        optout_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/email_preferences?push_notifications=eq.false&select=user_id",
            headers=_sb_headers(), timeout=5,
        )
        if optout_resp.status_code == 200:
            optout_users = {r["user_id"] for r in optout_resp.json()}
    except Exception:
        pass

    sent = skipped = 0
    dead_ids: list[str] = []
    loop = asyncio.get_event_loop()

    for user_id, subs in user_subs.items():
        if user_id in optout_users:
            skipped += 1
            continue
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, user_id)
            if not data:
                skipped += 1
                continue
            _, display_name, tickers, weights = data
            ctx = await loop.run_in_executor(None, _portfolio_week_context, tickers, weights)
            if "portfolio_return" not in ctx:
                skipped += 1
                continue
            port_ret = ctx["portfolio_return"]
            sign = "+" if port_ret >= 0 else ""
            pct_str = f"{sign}{port_ret:.2f}%"
            verdict = await loop.run_in_executor(None, _weekly_advisor_verdict, display_name, ctx, True)
            title = f"Weekly checkup: {pct_str}"
            body = verdict or f"Your portfolio returned {pct_str} this week."
            for sub_row in subs:
                result = _send_push(sub_row["subscription"], title, body, url="https://corvo.capital/app")
                if result == "ok":
                    sent += 1
                elif result == "dead" and sub_row.get("id"):
                    dead_ids.append(str(sub_row["id"]))
        except Exception as e:
            print(f"[weekly-checkup] error for user {user_id}: {e}")
            skipped += 1

    for dead_id in dead_ids:
        try:
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{dead_id}",
                headers=_sb_headers(), timeout=5,
            )
        except Exception:
            pass

    print(f"[weekly-checkup] done: sent={sent} skipped={skipped} pruned={len(dead_ids)}")
    return {"sent": sent, "skipped": skipped, "pruned": len(dead_ids)}


async def weekly_portfolio_checkup_loop():
    """Background task: send weekly portfolio checkup push every Sunday at 8am ET."""
    print("[weekly-checkup] scheduler started")
    while True:
        wait = _seconds_until_sunday_8am_et()
        print(f"[weekly-checkup] sleeping {wait/3600:.1f}h until Sunday 8am ET")
        await asyncio.sleep(wait)
        try:
            await send_weekly_portfolio_checkup_push()
        except Exception as e:
            print(f"[weekly-checkup] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/push/test-weekly-checkup")
async def test_weekly_checkup_push(request: Request):
    """Manually trigger the weekly portfolio checkup push (for testing). Requires X-Admin-Key header."""
    _require_admin_key(request)
    return await send_weekly_portfolio_checkup_push()


# ── Earnings Day Reminder Push ─────────────────────────────────────────────────


def _seconds_until_8am_et() -> float:
    """Return seconds until the next 8:00 AM ET, minimum 60 s."""
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now = datetime.now(ZoneInfo("America/New_York"))
    target = now.replace(hour=8, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 60.0)


def _fetch_earnings_dates(ticker: str) -> list:
    """Return a list of upcoming earnings dates (as date objects) for ticker."""
    try:
        stock = yf.Ticker(ticker)
        cal = stock.calendar
        if cal is None:
            return []
        if isinstance(cal, dict):
            raw = cal.get("Earnings Date", [])
            if not isinstance(raw, list):
                raw = [raw]
        else:
            # DataFrame — flatten first row of 'Earnings Date' column
            try:
                raw = list(cal.loc["Earnings Date"])
            except Exception:
                return []
        dates = []
        for ed in raw:
            if ed is None:
                continue
            if hasattr(ed, "date"):
                dates.append(ed.date())
            elif hasattr(ed, "year"):
                from datetime import date as _d
                dates.append(_d(ed.year, ed.month, ed.day))
        return dates
    except Exception:
        return []


async def send_earnings_reminder_push() -> dict:
    """Send push notifications to users whose holdings have earnings today or tomorrow."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"error": "Supabase not configured"}

    from datetime import date, timedelta
    today = date.today()
    tomorrow = today + timedelta(days=1)

    subs_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,subscription",
        headers=_sb_headers(), timeout=15,
    )
    if subs_resp.status_code != 200:
        return {"error": f"supabase {subs_resp.status_code}"}

    user_subs: dict[str, list] = {}
    for row in subs_resp.json():
        uid = row.get("user_id")
        if uid:
            user_subs.setdefault(uid, []).append(row)

    if not user_subs:
        return {"sent": 0, "skipped": "no subscribers"}

    optout_users: set[str] = set()
    try:
        optout_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/email_preferences?push_notifications=eq.false&select=user_id",
            headers=_sb_headers(), timeout=5,
        )
        if optout_resp.status_code == 200:
            optout_users = {r["user_id"] for r in optout_resp.json()}
    except Exception:
        pass

    sent = skipped = 0
    dead_ids: list[str] = []
    loop = asyncio.get_event_loop()

    # Cache earnings dates per ticker so we only hit yfinance once across all users
    ticker_earnings_cache: dict[str, list] = {}

    for user_id, subs in user_subs.items():
        if user_id in optout_users:
            skipped += 1
            continue
        try:
            data = await loop.run_in_executor(None, _fetch_user_email_data, user_id)
            if not data:
                skipped += 1
                continue
            _, _, tickers, _ = data

            earnings_today: list[str] = []
            earnings_tomorrow: list[str] = []
            for ticker in tickers:
                if ticker not in ticker_earnings_cache:
                    ticker_earnings_cache[ticker] = await loop.run_in_executor(
                        None, _fetch_earnings_dates, ticker
                    )
                for ed in ticker_earnings_cache[ticker]:
                    if ed == today:
                        earnings_today.append(ticker)
                    elif ed == tomorrow:
                        earnings_tomorrow.append(ticker)

            if not earnings_today and not earnings_tomorrow:
                continue

            parts = [f"{t} reports today" for t in earnings_today] + \
                    [f"{t} reports tomorrow" for t in earnings_tomorrow]
            title = "Earnings reminder"
            body = ", ".join(parts) + ". Review your position before the call."

            for sub_row in subs:
                result = _send_push(sub_row["subscription"], title, body, url="https://corvo.capital/app")
                if result == "ok":
                    sent += 1
                elif result == "dead" and sub_row.get("id"):
                    dead_ids.append(str(sub_row["id"]))
        except Exception as e:
            print(f"[earnings-reminder] error for user {user_id}: {e}")
            skipped += 1

    for dead_id in dead_ids:
        try:
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{dead_id}",
                headers=_sb_headers(), timeout=5,
            )
        except Exception:
            pass

    print(f"[earnings-reminder] done: sent={sent} skipped={skipped} pruned={len(dead_ids)}")
    return {"sent": sent, "skipped": skipped, "pruned": len(dead_ids)}


async def earnings_reminder_loop():
    """Background task: send earnings day reminder push every morning at 8am ET."""
    print("[earnings-reminder] scheduler started")
    while True:
        wait = _seconds_until_8am_et()
        print(f"[earnings-reminder] sleeping {wait/3600:.2f}h until 8am ET")
        await asyncio.sleep(wait)
        try:
            await send_earnings_reminder_push()
        except Exception as e:
            print(f"[earnings-reminder] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/push/test-earnings-reminder")
async def test_earnings_reminder_push(request: Request):
    """Manually trigger the earnings day reminder push (for testing). Requires X-Admin-Key header."""
    _require_admin_key(request)
    return await send_earnings_reminder_push()


# ── (legacy yfinance stats, retained for portfolio snapshot endpoint) ──────────


def _compute_week_stats_from_yfinance(tickers: list, weights_raw) -> dict:
    """
    Primary: compute 7-day portfolio stats directly from yfinance.
    Cash-like tickers use synthetic 4.5% annual return.
    """
    if not tickers:
        return {"return_7d": None, "best_day": None, "worst_day": None, "sharpe": None}

    try:
        w_list = [float(w) for w in (weights_raw or [])]
    except Exception:
        w_list = []
    if len(w_list) != len(tickers):
        w_list = [1.0 / len(tickers)] * len(tickers)
    total = sum(w_list)
    if total > 0:
        w_list = [w / total for w in w_list]

    real_tickers = [t for t in tickers if not is_cash_ticker(t)]

    close_df = pd.DataFrame()
    if real_tickers:
        dl_arg = real_tickers[0] if len(real_tickers) == 1 else real_tickers
        for attempt in range(3):
            try:
                raw = yf.download(dl_arg, period="14d", auto_adjust=True, progress=False)
                if raw is None or raw.empty:
                    import yfinance as _yf2
                    _yf2.set_tz_cache_location("/tmp/yf_tz_cache")
                    raw = _yf2.download(dl_arg, period="14d", auto_adjust=True, progress=False, timeout=30)
                if raw is None or raw.empty:
                    if attempt < 2:
                        time.sleep(2)
                        continue
                    break
                if isinstance(raw.columns, pd.MultiIndex):
                    lvl0 = raw.columns.get_level_values(0)
                    key = "Close" if "Close" in lvl0 else "Adj Close"
                    close_df = raw[key]
                    if isinstance(close_df, pd.Series):
                        close_df = close_df.to_frame(name=real_tickers[0])
                else:
                    if "Close" in raw.columns:
                        close_df = raw[["Close"]].rename(columns={"Close": real_tickers[0]})
                    else:
                        close_df = raw.iloc[:, :1].rename(columns={raw.columns[0]: real_tickers[0]})
                close_df = close_df.dropna(how="all").tail(8)
                break
            except Exception:
                if attempt < 2:
                    time.sleep(2)

    n = len(close_df) if not close_df.empty else 8
    port_series = np.zeros(n)
    weight_applied = 0.0

    for t, w in zip(tickers, w_list):
        if is_cash_ticker(t):
            daily_r = (1.045 ** (1 / 252)) - 1
            synthetic = np.array([(1 + daily_r) ** i for i in range(n)])
            port_series = port_series + synthetic * w
            weight_applied += w
        else:
            if close_df.empty or t not in close_df.columns:
                continue
            col = close_df[t].dropna()
            if len(col) < 2:
                continue
            values = col.values.astype(float)
            normalized = values / values[0]
            n_ticker = len(normalized)
            if n_ticker < n:
                # Pad front with 1.0 (flat before data starts)
                pad = np.ones(n - n_ticker)
                aligned = np.concatenate([pad, normalized])
            else:
                aligned = normalized[-n:]
            port_series = port_series + aligned * w
            weight_applied += w

    if weight_applied < 0.01:
        return {"return_7d": None, "best_day": None, "worst_day": None, "sharpe": None}

    if weight_applied < 0.99:
        port_series = port_series / weight_applied

    if len(port_series) < 2:
        return {"return_7d": None, "best_day": None, "worst_day": None, "sharpe": None}

    synth_snapshots = [{"portfolio_value": v * 10000} for v in port_series.tolist()]
    return _compute_portfolio_week_stats(synth_snapshots)


def _compute_portfolio_week_stats(snapshots: list[dict]) -> dict:
    """
    Given up to 7 days of snapshot rows (dicts with portfolio_value),
    return 7-day return %, best day return, worst day return, naive Sharpe.
    """
    if len(snapshots) < 2:
        return {"return_7d": None, "best_day": None, "worst_day": None, "sharpe": None}

    values = [safe_float(s["portfolio_value"]) for s in snapshots]
    # Daily returns
    daily = [(values[i] - values[i - 1]) / values[i - 1] for i in range(1, len(values)) if values[i - 1] > 0]
    if not daily:
        return {"return_7d": None, "best_day": None, "worst_day": None, "sharpe": None}

    ret_7d = (values[-1] - values[0]) / values[0] * 100
    best_day = max(daily) * 100
    worst_day = min(daily) * 100

    mean_d = sum(daily) / len(daily)
    if len(daily) >= 2:
        variance = sum((r - mean_d) ** 2 for r in daily) / (len(daily) - 1)
        std_d = variance ** 0.5
    else:
        std_d = 0.0
    # Annualised Sharpe (rf ≈ 0 for weekly context)
    sharpe = (mean_d / std_d * (252 ** 0.5)) if std_d > 0 else None

    return {
        "return_7d": round(ret_7d, 2),
        "best_day": round(best_day, 2),
        "worst_day": round(worst_day, 2),
        "sharpe": round(sharpe, 2) if sharpe is not None else None,
    }


# ── Market Driver ──────────────────────────────────────────────────────────────

_market_driver_cache: dict = {"data": None, "ts": 0.0}


@app.get("/market-driver")
async def market_driver():
    """Return one-sentence explanation of the primary US market driver today."""
    global _market_driver_cache
    now = time.time()
    cached = _market_driver_cache.get("data")
    if cached and (now - _market_driver_cache.get("ts", 0)) < 300:
        return cached

    index_changes: dict[str, float] = {}
    for sym in ["^GSPC", "^IXIC", "^DJI"]:
        index_changes[sym] = _brief_one_day_change(sym)

    headlines: list[str] = []
    try:
        news_items = yf.Ticker("SPY").news or []
        for item in news_items[:6]:
            title = (
                item.get("title")
                or (item.get("content") or {}).get("title")
                or ""
            )
            if title and len(headlines) < 3:
                headlines.append(title.strip())
    except Exception as e:
        print(f"market-driver news error: {e}")

    driver = ""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            import anthropic as _anthropic
            client = _anthropic.Anthropic(api_key=api_key)
            index_str = (
                f"S&P 500 (^GSPC): {index_changes.get('^GSPC', 0):+.2f}%, "
                f"Nasdaq (^IXIC): {index_changes.get('^IXIC', 0):+.2f}%, "
                f"Dow (^DJI): {index_changes.get('^DJI', 0):+.2f}%"
            )
            headlines_str = " | ".join(headlines) if headlines else "No headlines available"
            prompt = f"Index data: {index_str}\nTop headlines: {headlines_str}"
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=80,
                system=(
                    "In one sentence, explain the single most important reason US markets moved today "
                    "based on these headlines and index data. Be specific, name the actual event, "
                    "report, or news. No em dashes. Under 20 words."
                ),
                messages=[{"role": "user", "content": prompt}],
            )
            driver = clean_ai_response(response.content[0].text.strip())
        except Exception as e:
            print(f"market-driver AI error: {e}")

    result = {"driver": driver}
    _market_driver_cache["data"] = result
    _market_driver_cache["ts"] = now
    return result


# ── Earnings Calendar ──────────────────────────────────────────────────────────

@app.get("/earnings-calendar")
def earnings_calendar(tickers: str = Query(default="")):
    """Return upcoming earnings dates for portfolio tickers within the next 60 days."""
    from datetime import date, timedelta
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        return []

    today = date.today()
    cutoff = today + timedelta(days=60)
    results = []

    for t in tickers_list:
        try:
            ticker_obj = yf.Ticker(t)
            cal = ticker_obj.calendar
            if cal is None:
                continue

            if isinstance(cal, dict):
                raw_date = cal.get("Earnings Date")
                eps_est = cal.get("EPS Estimate")
                rev_est = cal.get("Revenue Estimate")
            else:
                try:
                    raw_date = cal.loc["Earnings Date"].iloc[0] if "Earnings Date" in cal.index else None
                    eps_est = cal.loc["EPS Estimate"].iloc[0] if "EPS Estimate" in cal.index else None
                    rev_est = cal.loc["Revenue Estimate"].iloc[0] if "Revenue Estimate" in cal.index else None
                except Exception:
                    raw_date = eps_est = rev_est = None

            if raw_date is None:
                continue

            if isinstance(raw_date, (list, tuple)):
                raw_date = raw_date[0] if raw_date else None
            if raw_date is None:
                continue

            if hasattr(raw_date, "date"):
                earnings_date = raw_date.date()
            else:
                earnings_date = date.fromisoformat(str(raw_date)[:10])

            if earnings_date < today or earnings_date > cutoff:
                continue

            try:
                info = ticker_obj.info
                company = info.get("longName") or info.get("shortName") or t
            except Exception:
                company = t

            def _safe(v):
                try:
                    f = float(v)
                    return None if math.isnan(f) else f
                except Exception:
                    return None

            results.append({
                "ticker": t,
                "company": company,
                "date": earnings_date.isoformat(),
                "eps_estimate": _safe(eps_est),
                "revenue_estimate": _safe(rev_est),
            })
        except Exception as e:
            print(f"earnings-calendar error for {t}: {e}")

    results.sort(key=lambda x: x["date"])
    return results



# ── Earnings Impact Preview ────────────────────────────────────────────────────

@app.get("/earnings-preview")
def earnings_preview(tickers: str = Query(default=""), weights: str = Query(default="")):
    """Return earnings preview cards for holdings with earnings within 14 days.
    Includes implied move from options straddle, analyst estimates, and AI portfolio commentary."""
    from datetime import date, timedelta

    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        return []

    try:
        weights_list = [float(w) for w in weights.split(",") if w.strip()]
    except Exception:
        weights_list = []

    if len(weights_list) == len(tickers_list):
        total_w = sum(weights_list) or 1.0
        weight_map = {t: weights_list[i] / total_w for i, t in enumerate(tickers_list)}
    else:
        weight_map = {t: 1.0 / len(tickers_list) for t in tickers_list}

    today = date.today()
    cutoff = today + timedelta(days=14)

    def _safe(v):
        try:
            f = float(v)
            return None if math.isnan(f) else f
        except Exception:
            return None

    preview_items = []

    for ticker in tickers_list:
        try:
            ticker_obj = yf.Ticker(ticker)
            cal = ticker_obj.calendar
            if cal is None:
                continue

            if isinstance(cal, dict):
                raw_date = cal.get("Earnings Date")
                eps_est = cal.get("EPS Estimate")
                rev_est = cal.get("Revenue Estimate")
            else:
                try:
                    raw_date = cal.loc["Earnings Date"].iloc[0] if "Earnings Date" in cal.index else None
                    eps_est = cal.loc["EPS Estimate"].iloc[0] if "EPS Estimate" in cal.index else None
                    rev_est = cal.loc["Revenue Estimate"].iloc[0] if "Revenue Estimate" in cal.index else None
                except Exception:
                    raw_date = eps_est = rev_est = None

            if raw_date is None:
                continue
            if isinstance(raw_date, (list, tuple)):
                raw_date = raw_date[0] if raw_date else None
            if raw_date is None:
                continue

            if hasattr(raw_date, "date"):
                earnings_date = raw_date.date()
            else:
                earnings_date = date.fromisoformat(str(raw_date)[:10])

            if earnings_date < today or earnings_date > cutoff:
                continue

            days_until = (earnings_date - today).days

            try:
                info = ticker_obj.info
                company = info.get("longName") or info.get("shortName") or ticker
                current_price = float(info.get("regularMarketPrice") or info.get("currentPrice") or 0.0)
            except Exception:
                company = ticker
                current_price = 0.0

            # Implied move from ATM straddle price
            implied_move_pct = None
            implied_move_source = None
            try:
                if current_price > 0:
                    option_dates = ticker_obj.options
                    if option_dates:
                        target_str = earnings_date.isoformat()
                        candidates = [d for d in option_dates if d >= target_str]
                        closest_expiry = candidates[0] if candidates else option_dates[-1]

                        chain = ticker_obj.option_chain(closest_expiry)
                        calls_df = chain.calls
                        puts_df  = chain.puts

                        if not calls_df.empty and not puts_df.empty:
                            call_strikes = calls_df["strike"].values
                            atm_idx = int(abs(call_strikes - current_price).argmin())
                            atm_strike = call_strikes[atm_idx]

                            atm_call = calls_df[calls_df["strike"] == atm_strike]
                            atm_put  = puts_df[puts_df["strike"] == atm_strike]

                            if not atm_call.empty and not atm_put.empty:
                                call_last = float(atm_call["lastPrice"].iloc[0])
                                put_last  = float(atm_put["lastPrice"].iloc[0])
                                if call_last + put_last > 0:
                                    implied_move_pct = round((call_last + put_last) / current_price * 100, 1)
                                    implied_move_source = "options"
            except Exception as e:
                print(f"[earnings-preview] straddle error for {ticker}: {e}")

            # Fallback: annualized IV scaled to days until expiry
            if implied_move_pct is None:
                try:
                    if current_price > 0:
                        option_dates = ticker_obj.options
                        if option_dates:
                            target_str = earnings_date.isoformat()
                            candidates = [d for d in option_dates if d >= target_str]
                            closest_expiry = candidates[0] if candidates else option_dates[-1]
                            exp_date = date.fromisoformat(closest_expiry)
                            days_to_exp = max((exp_date - today).days, 1)

                            chain = ticker_obj.option_chain(closest_expiry)
                            calls_df = chain.calls
                            if not calls_df.empty and "impliedVolatility" in calls_df.columns:
                                call_strikes = calls_df["strike"].values
                                atm_idx = int(abs(call_strikes - current_price).argmin())
                                atm_strike = call_strikes[atm_idx]
                                atm_call = calls_df[calls_df["strike"] == atm_strike]
                                if not atm_call.empty:
                                    iv = float(atm_call["impliedVolatility"].iloc[0])
                                    if iv > 0:
                                        implied_move_pct = round(iv * math.sqrt(days_to_exp / 252) * 100, 1)
                                        implied_move_source = "iv"
                except Exception as e:
                    print(f"[earnings-preview] IV fallback error for {ticker}: {e}")

            preview_items.append({
                "ticker": ticker,
                "company": company,
                "date": earnings_date.isoformat(),
                "days_until": days_until,
                "eps_estimate": _safe(eps_est),
                "revenue_estimate": _safe(rev_est),
                "implied_move_pct": implied_move_pct,
                "implied_move_source": implied_move_source,
                "weight": weight_map.get(ticker, 0.0),
                "ai_commentary": "",
            })
        except Exception as e:
            print(f"[earnings-preview] error for {ticker}: {e}")

    if not preview_items:
        return []

    # Generate AI commentary for all holdings in one Claude call
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if api_key:
            import anthropic as _ant

            def _fmt_rev(r):
                if r is None:
                    return "N/A"
                if r >= 1_000_000_000:
                    return f"${r / 1e9:.2f}B"
                return f"${r / 1e6:.0f}M"

            holdings_block = "\n".join([
                f"- {item['ticker']} ({item['company']}): {item['weight'] * 100:.1f}% of portfolio, "
                f"reports in {item['days_until']} day(s) on {item['date']}, "
                f"EPS estimate: {'$' + str(round(item['eps_estimate'], 2)) if item['eps_estimate'] is not None else 'N/A'}, "
                f"Revenue estimate: {_fmt_rev(item['revenue_estimate'])}, "
                f"Implied move: {'+-' + str(item['implied_move_pct']) + '%' if item['implied_move_pct'] is not None else 'unavailable'}"
                for item in preview_items
            ])

            prompt = (
                "For each portfolio holding below, write 1-2 sentences covering: "
                "what analysts are focused on in this earnings report, and what a beat or miss "
                "would mean for this specific investor given their position size.\n\n"
                f"Holdings:\n{holdings_block}\n\n"
                "Return ONLY a valid JSON object mapping each ticker symbol to its commentary string. "
                "No markdown fences, no extra text.\n\n"
                "Rules: no em dashes, no asterisks, no emojis, under 55 words per ticker, "
                "direct and specific about the weight and what to watch."
            )

            client = _ant.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1200,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            commentary_map = json.loads(raw)
            for item in preview_items:
                item["ai_commentary"] = commentary_map.get(item["ticker"], "")
    except Exception as e:
        print(f"[earnings-preview] Claude error: {e}")

    preview_items.sort(key=lambda x: x["date"])
    return preview_items


# ── Events Calendar ────────────────────────────────────────────────────────────

_FALLBACK_EVENTS_2026 = [
    {"date": "2026-05-01", "event": "Nonfarm Payrolls (Apr)", "country": "US", "actual": None, "estimate": "180K", "previous": "228K"},
    {"date": "2026-05-05", "event": "FOMC Meeting Day 1 (May)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-05-06", "event": "FOMC Rate Decision (May)", "country": "US", "actual": None, "estimate": "4.25%-4.50%", "previous": "4.25%-4.50%"},
    {"date": "2026-05-13", "event": "CPI (Apr)", "country": "US", "actual": None, "estimate": "2.6%", "previous": "2.4%"},
    {"date": "2026-05-14", "event": "PPI (Apr)", "country": "US", "actual": None, "estimate": "3.1%", "previous": "2.7%"},
    {"date": "2026-05-15", "event": "Retail Sales (Apr)", "country": "US", "actual": None, "estimate": "0.4%", "previous": "1.4%"},
    {"date": "2026-05-29", "event": "GDP Q1 Revised", "country": "US", "actual": None, "estimate": "2.3%", "previous": "2.4%"},
    {"date": "2026-06-05", "event": "Nonfarm Payrolls (May)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-06-10", "event": "CPI (May)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-06-16", "event": "FOMC Meeting Day 1 (Jun)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-06-17", "event": "FOMC Rate Decision (Jun)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-07-02", "event": "Nonfarm Payrolls (Jun)", "country": "US", "actual": None, "estimate": None, "previous": None},
    {"date": "2026-07-14", "event": "CPI (Jun)", "country": "US", "actual": None, "estimate": None, "previous": None},
]


@app.get("/events-calendar")
def events_calendar():
    """Return next 30 days of high-impact economic events from FMP or fallback."""
    from datetime import date, timedelta
    today = date.today()
    to_date = today + timedelta(days=30)

    try:
        fmp_key = os.environ.get("FMP_API_KEY", "demo")
        url = (
            f"https://financialmodelingprep.com/api/v3/economic_calendar"
            f"?from={today.isoformat()}&to={to_date.isoformat()}&apikey={fmp_key}"
        )
        resp = requests.get(url, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                high_impact = [e for e in data if (e.get("impact") or "").lower() == "high"]
                high_impact.sort(key=lambda x: x.get("date", ""))
                result = [
                    {
                        "date": e.get("date", ""),
                        "event": e.get("event", ""),
                        "country": e.get("country", ""),
                        "actual": e.get("actual"),
                        "estimate": e.get("estimate"),
                        "previous": e.get("previous"),
                    }
                    for e in high_impact
                ]
                if result:
                    return result
    except Exception as e:
        print(f"events-calendar FMP error: {e}")

    today_str = today.isoformat()
    cutoff_str = to_date.isoformat()
    return [e for e in _FALLBACK_EVENTS_2026 if today_str <= e["date"] <= cutoff_str]


# ── Admin: one-time test-alert cleanup ──────────────────────────────────────

@app.delete("/admin/cleanup-test-alerts")
def admin_cleanup_test_alerts(request: Request):
    """
    Delete the two test price alerts created during dev testing:
      - AAPL rises more than 0.001%
      - Any alert drops more than 10% (threshold = 10)
    Requires X-Admin-Key header matching SUPABASE_SERVICE_ROLE_KEY.
    """
    _require_admin_key(request)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    deleted = []
    errors = []

    # Delete AAPL alert with very low threshold (0.001% rise)
    r1 = requests.delete(
        f"{SUPABASE_URL}/rest/v1/price_alerts"
        f"?ticker=eq.AAPL&condition=eq.rises&threshold=lte.0.01",
        headers={**_sb_headers(), "Prefer": "return=representation"},
        timeout=8,
    )
    if r1.status_code in (200, 204):
        deleted.append(f"AAPL rises <= 0.01%: {r1.text[:100]}")
    else:
        errors.append(f"AAPL rises: {r1.status_code} {r1.text[:100]}")

    # Delete any alert with condition=drops and threshold between 9.9 and 10.1
    r2 = requests.delete(
        f"{SUPABASE_URL}/rest/v1/price_alerts"
        f"?condition=eq.drops&threshold=gte.9.9&threshold=lte.10.1",
        headers={**_sb_headers(), "Prefer": "return=representation"},
        timeout=8,
    )
    if r2.status_code in (200, 204):
        deleted.append(f"drops ~10%: {r2.text[:100]}")
    else:
        errors.append(f"drops ~10%: {r2.status_code} {r2.text[:100]}")

    return {"deleted": deleted, "errors": errors}


# ── What Should I Do Today ────────────────────────────────────────────────────

class RebalanceRequest(BaseModel):
    tickers: list[str] = []
    weights: list[float] = []           # target weights (normalized to 1)
    individual_returns: dict = {}       # ticker -> CAGR from portfolio analysis
    period: str = "1y"
    portfolio_value: float = 10000.0
    portfolio_return: float = 0.0
    portfolio_volatility: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    user_goals: dict = {}
    user_id: str = ""


class WhatShouldIDoRequest(BaseModel):
    tickers: list[str] = []
    weights: list[float] = []
    portfolio_return: float = 0.0
    portfolio_volatility: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    period: str = "1y"
    portfolio_value: float | None = None
    health_score: float | None = None
    user_goals: dict = {}
    user_id: str = ""

def _fetch_finnhub_quote(ticker: str, finnhub_key: str) -> dict | None:
    """Fetch a single quote from Finnhub. Returns dict with price/change_pct or None on failure."""
    try:
        r = requests.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": ticker, "token": finnhub_key},
            timeout=5,
        )
        if r.status_code == 200:
            d = r.json()
            price = float(d.get("c") or 0)
            change_pct = float(d.get("dp") or 0)
            if price > 0:
                return {"price": round(price, 2), "change_pct": round(change_pct, 2)}
    except Exception as e:
        print(f"Finnhub quote error for {ticker}: {e}")
    return None

def _fetch_yf_quote(ticker: str) -> dict:
    """yfinance fallback quote."""
    try:
        info = yf.Ticker(ticker).fast_info
        price = safe_float(getattr(info, "last_price", 0) or 0)
        prev = safe_float(getattr(info, "previous_close", 0) or 0)
        pct = ((price - prev) / prev * 100) if prev > 0 else 0.0
        return {"price": round(price, 2), "change_pct": round(pct, 2)}
    except Exception as e:
        print(f"yfinance quote fallback error for {ticker}: {e}")
        return {"price": 0.0, "change_pct": 0.0}

def _fetch_user_goals_from_supabase(user_id: str) -> dict:
    """Fetch goal/profile data from Supabase auth user_metadata for the given user_id.

    Returns a merged dict combining the onboarding metadata (investment_horizon,
    risk_tolerance, primary_goals, investor_type, age_range, income_range) with
    any legacy corvo_goals fields.  Returns {} on any failure.
    """
    if not user_id or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {}
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_sb_headers(),
            timeout=6,
        )
        if resp.status_code != 200:
            return {}
        meta = resp.json().get("user_metadata") or {}
        return {
            "investment_horizon": meta.get("investment_horizon", ""),
            "risk_tolerance": meta.get("risk_tolerance", ""),
            "primary_goals": meta.get("primary_goals", []),
            "investor_type": meta.get("investor_type", ""),
            "age_range": meta.get("age_range", ""),
            "income_range": meta.get("income_range", ""),
        }
    except Exception as e:
        print(f"[what-should-i-do] supabase goals fetch error: {e}")
        return {}


def _parse_horizon_years(horizon_str: str, legacy_goals: dict) -> int | None:
    """Convert investment_horizon string or legacy timeline to an integer year count.

    Returns None if the horizon cannot be determined.
    """
    if horizon_str:
        h = horizon_str.lower().strip()
        if "10" in h:
            return 15  # "10+ years" -> treat as 15
        if "5-10" in h or "5 to 10" in h:
            return 7
        if "3-5" in h or "3 to 5" in h:
            return 4
        if "1-2" in h or "1 to 2" in h:
            return 2
        if "under 1" in h or "less than 1" in h:
            return 1
        # Fallback: try parsing first number found
        import re
        nums = re.findall(r"\d+", h)
        if nums:
            return int(nums[0])
    # Legacy: retirementAge - age
    try:
        age = int(legacy_goals.get("age", 0) or 0)
        ret = int(legacy_goals.get("retirementAge", 0) or 0)
        if age > 0 and ret > age:
            return ret - age
    except Exception:
        pass
    # Legacy timeline field
    try:
        tl = legacy_goals.get("timeline")
        if tl:
            return int(tl)
    except Exception:
        pass
    return None


def _horizon_category(years: int | None) -> str:
    """Map year count to a plain-English horizon category."""
    if years is None:
        return "unknown"
    if years >= 10:
        return "long-term (10+ years)"
    if years >= 5:
        return "medium-to-long-term (5-10 years)"
    if years >= 3:
        return "medium-term (3-5 years)"
    if years >= 1:
        return "short-term (1-3 years)"
    return "very short-term (under 1 year)"


@app.post("/what-should-i-do")
def what_should_i_do(req: WhatShouldIDoRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "what-should-i-do", 10, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    finnhub_key = os.environ.get("FINNHUB_API_KEY", "")

    # Pull authoritative goal data from Supabase, fall back to request payload
    sb_goals = _fetch_user_goals_from_supabase(req.user_id) if req.user_id else {}
    legacy_goals = req.user_goals or {}

    investment_horizon_str = sb_goals.get("investment_horizon", "") or legacy_goals.get("timeline", "")
    risk_tolerance = (
        sb_goals.get("risk_tolerance", "")
        or legacy_goals.get("riskTolerance", "")
        or "moderate"
    )
    primary_goals = sb_goals.get("primary_goals") or []
    investor_type = sb_goals.get("investor_type", "")
    age_range = sb_goals.get("age_range", "") or (str(legacy_goals.get("age", "")) if legacy_goals.get("age") else "")
    legacy_goal_type = legacy_goals.get("goal", "")  # retirement/wealth/income/short

    horizon_years = _parse_horizon_years(investment_horizon_str, legacy_goals)
    horizon_category = _horizon_category(horizon_years)
    is_long_term = horizon_years is not None and horizon_years >= 5

    # Live prices for each holding
    live_prices: dict[str, dict] = {}
    for ticker in req.tickers:
        if is_cash_ticker(ticker):
            live_prices[ticker] = {"price": 1.0, "change_pct": 0.0}
            continue
        quote = (_fetch_finnhub_quote(ticker, finnhub_key) if finnhub_key else None) or _fetch_yf_quote(ticker)
        live_prices[ticker] = quote

    # Market context (SPY + QQQ) — shown as background, not as a reason to act
    market_lines: list[str] = []
    for sym in ["SPY", "QQQ"]:
        q = (_fetch_finnhub_quote(sym, finnhub_key) if finnhub_key else None) or _fetch_yf_quote(sym)
        if q["price"] > 0:
            market_lines.append(f"{sym}: {q['change_pct']:+.2f}% today (${q['price']:.2f})")

    # Build holdings description
    total_w = sum(req.weights) or 1.0
    holdings_lines: list[str] = []
    for t, w in zip(req.tickers, req.weights):
        norm_w = w / total_w
        q = live_prices.get(t, {"price": 0.0, "change_pct": 0.0})
        price_str = f"${q['price']:.2f}" if q["price"] > 0 else "N/A"
        change_str = f"{q['change_pct']:+.2f}% today" if q["price"] > 0 else ""
        tag = " [money market]" if is_cash_ticker(t) else ""
        holdings_lines.append(f"{t}{tag}: {norm_w:.1%} weight, {price_str}{(', ' + change_str) if change_str else ''}")

    # Goal description for the prompt
    goal_parts: list[str] = []
    if horizon_category != "unknown":
        goal_parts.append(f"Investment horizon: {horizon_category}")
    if risk_tolerance:
        risk_label = {
            "conservative": "conservative (capital preservation priority)",
            "moderate": "moderate (balanced growth and risk)",
            "aggressive": "aggressive (maximum growth, high risk tolerance)",
        }.get(risk_tolerance.lower(), risk_tolerance)
        goal_parts.append(f"Risk tolerance: {risk_label}")
    if primary_goals:
        goal_parts.append(f"Primary goals: {', '.join(primary_goals)}")
    elif legacy_goal_type:
        goal_label = {"retirement": "retirement", "wealth": "wealth building", "income": "passive income", "short": "short-term gains"}.get(legacy_goal_type, legacy_goal_type)
        goal_parts.append(f"Primary goal: {goal_label}")
    if investor_type:
        goal_parts.append(f"Investor type: {investor_type}")
    if age_range:
        goal_parts.append(f"Age range: {age_range}")
    goal_block = "\n".join(goal_parts) if goal_parts else "Not provided"

    value_str = f"${int(req.portfolio_value):,}" if req.portfolio_value else "not set"
    health_str = f"{int(req.health_score)}/100" if req.health_score is not None else "N/A"
    today_str = datetime.now().strftime("%B %d, %Y")

    # Horizon-specific guidance for Claude
    if is_long_term:
        horizon_rules = """HORIZON CONSTRAINT (strictly enforce — this user is a long-term investor):
- Do NOT recommend buying or selling any holding based on its single-day price change.
- Daily price movement is shown as background context only. Never cite it as a reason to act.
- Valid recommendation topics for a long-term investor:
  * Concentration risk: any single position above 35-40% of the portfolio
  * Missing asset class exposure (e.g. no bonds, no international, no defensive sector)
  * Rebalancing drift: a position that has grown or shrunk far from its target weight over time
  * A holding whose business model, competitive position, or revenue trajectory structurally no longer fits a long-term thesis
  * Low Sharpe ratio or high drawdown relative to what the portfolio is trying to achieve
- Every recommendation must be defensible over the user's stated time horizon."""
    elif horizon_years is not None and horizon_years >= 3:
        horizon_rules = """HORIZON CONSTRAINT (medium-term investor, 3-5 years):
- Do NOT recommend buying or selling based solely on single-day price movement.
- Daily prices may provide supporting context, but the primary reason must be structural.
- Valid topics: concentration risk, sector overweight, Sharpe ratio, drawdown risk relative to timeline, approaching liquidity needs.
- Every recommendation must be defensible over the user's stated time horizon."""
    else:
        horizon_rules = """HORIZON CONSTRAINT (short-term investor or horizon unknown):
- Daily prices may be considered as one input, but still must not be the sole reason to act.
- Recommendations should prioritize risk management and capital preservation relative to the short timeline.
- Every recommendation must be defensible over the user's stated time horizon."""

    system = f"""You are Corvo AI, a direct and goal-aware portfolio advisor. Today is {today_str}.

{horizon_rules}

OUTPUT FORMAT (strictly follow):
- Output exactly 2 or 3 numbered recommendations, starting with "1."
- Each recommendation: 1 sentence stating the specific action, followed by 1 sentence stating why it fits this investor's goals and horizon.
- Name the specific ticker(s) and real numbers (weights, percentages, ratios) in every recommendation.
- No generic advice. No intros. No conclusions. No summaries.
- No em dashes, no asterisks, no bullet points, no markdown.
- Start immediately with "1." with no preamble.

INVESTOR PROFILE:
{goal_block}

PORTFOLIO METRICS (period: {req.period}):
{chr(10).join(holdings_lines)}
Annualized return: {req.portfolio_return:.2%}
Annualized volatility: {req.portfolio_volatility:.2%}
Sharpe ratio: {req.sharpe_ratio:.2f}
Max drawdown: {req.max_drawdown:.2%}
Health score: {health_str}
Portfolio value: {value_str}

MARKET CONTEXT (background only, not a reason to act):
{chr(10).join(market_lines) if market_lines else 'Market data unavailable'}"""

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=450,
        system=system,
        messages=[{"role": "user", "content": "What should I do with my portfolio?"}],
    )
    raw = response.content[0].text.strip()
    result = clean_ai_response(raw)
    return {"recommendations": result}


# ── Rebalance Assistant ────────────────────────────────────────────────────────

_PERIOD_YEARS: dict[str, float] = {
    "6mo": 0.5, "6m": 0.5,
    "1y": 1.0,
    "2y": 2.0,
    "5y": 5.0,
}


@app.post("/portfolio/rebalance")
def portfolio_rebalance(req: RebalanceRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if check_rate_limit(ip, "portfolio-rebalance", 10, 3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    if not req.tickers or not req.weights or len(req.tickers) != len(req.weights):
        raise HTTPException(status_code=422, detail="tickers and weights must be non-empty and equal length.")

    # Pull user profile from Supabase, fall back to request payload
    sb_goals = _fetch_user_goals_from_supabase(req.user_id) if req.user_id else {}
    legacy_goals = req.user_goals or {}
    investment_horizon_str = sb_goals.get("investment_horizon", "") or legacy_goals.get("timeline", "")
    risk_tolerance = (
        sb_goals.get("risk_tolerance", "")
        or legacy_goals.get("riskTolerance", "")
        or "moderate"
    )
    primary_goals = sb_goals.get("primary_goals") or []
    investor_type = sb_goals.get("investor_type", "")
    age_range = sb_goals.get("age_range", "") or (str(legacy_goals.get("age", "")) if legacy_goals.get("age") else "")
    legacy_goal_type = legacy_goals.get("goal", "")
    horizon_years = _parse_horizon_years(investment_horizon_str, legacy_goals)
    horizon_category = _horizon_category(horizon_years)

    # Normalize target weights
    total_w = sum(req.weights) or 1.0
    target_weights = [w / total_w for w in req.weights]

    # Approximate total return per ticker over the selected period from CAGR
    years = _PERIOD_YEARS.get(req.period, 1.0)
    ind_ret = req.individual_returns or {}
    current_values = []
    for t, tw in zip(req.tickers, target_weights):
        cagr = float(ind_ret.get(t, 0.0) or 0.0)
        total_ret = (1.0 + cagr) ** years - 1.0
        current_values.append(tw * (1.0 + total_ret))

    total_current = sum(current_values) or 1.0
    current_weights = [v / total_current for v in current_values]

    pv = req.portfolio_value or 10000.0

    # Build per-holding drift table
    holdings: list[dict] = []
    for t, tw, cw in zip(req.tickers, target_weights, current_weights):
        drift = cw - tw
        dollar_drift = drift * pv
        if drift > 0.003:
            action = "sell"
        elif drift < -0.003:
            action = "buy"
        else:
            action = "hold"
        holdings.append({
            "ticker": t,
            "target_pct": round(tw * 100, 1),
            "current_pct": round(cw * 100, 1),
            "drift_pct": round(drift * 100, 1),
            "dollar_amount": round(abs(dollar_drift), 0),
            "action": action,
        })

    # Sort: largest absolute drift first
    holdings.sort(key=lambda h: abs(h["drift_pct"]), reverse=True)

    # Build prompt context
    holdings_lines: list[str] = []
    for h in holdings:
        sign = "+" if h["drift_pct"] >= 0 else ""
        action_str = f"SELL ${h['dollar_amount']:,.0f}" if h["action"] == "sell" else (f"BUY ${h['dollar_amount']:,.0f}" if h["action"] == "buy" else "HOLD")
        holdings_lines.append(
            f"{h['ticker']}: target {h['target_pct']:.1f}%, current {h['current_pct']:.1f}%, drift {sign}{h['drift_pct']:.1f}% => {action_str}"
        )

    goal_parts: list[str] = []
    if horizon_category != "unknown":
        goal_parts.append(f"Investment horizon: {horizon_category}")
    if risk_tolerance:
        risk_label = {
            "conservative": "conservative (capital preservation priority)",
            "moderate": "moderate (balanced growth and risk)",
            "aggressive": "aggressive (maximum growth, high risk tolerance)",
        }.get(risk_tolerance.lower(), risk_tolerance)
        goal_parts.append(f"Risk tolerance: {risk_label}")
    if primary_goals:
        goal_parts.append(f"Primary goals: {', '.join(primary_goals)}")
    elif legacy_goal_type:
        goal_label = {"retirement": "retirement", "wealth": "wealth building", "income": "passive income", "short": "short-term gains"}.get(legacy_goal_type, legacy_goal_type)
        goal_parts.append(f"Primary goal: {goal_label}")
    if investor_type:
        goal_parts.append(f"Investor type: {investor_type}")
    if age_range:
        goal_parts.append(f"Age range: {age_range}")
    goal_block = "\n".join(goal_parts) if goal_parts else "Not provided"

    value_str = f"${int(pv):,}"
    today_str = datetime.now().strftime("%B %d, %Y")

    system = f"""You are Corvo AI, a direct portfolio rebalancing advisor. Today is {today_str}.

You are given a portfolio with target allocations and the current allocation after market drift. Your job is to write a specific, actionable rebalance plan.

RULES (strictly enforce):
- State the exact dollar amount to buy or sell for each holding that needs rebalancing. Use the figures from the drift table.
- Explain in one sentence per holding why this trade fits the investor's goals and risk profile.
- Only address holdings with meaningful drift (drift above 1% in either direction). Skip holdings marked HOLD.
- Do not recommend selling everything or any drastic restructuring unless drift is extreme (above 15%).
- No generic advice. No intros. No conclusions. No markdown. No em dashes. No asterisks.
- Start immediately with the first numbered recommendation. No preamble.
- Format: numbered list. One holding per item. State action (buy/sell), ticker, dollar amount, one-sentence rationale.
- If all holdings are within threshold, state that the portfolio is balanced and no trades are needed.

INVESTOR PROFILE:
{goal_block}

PORTFOLIO VALUE: {value_str}

DRIFT TABLE (period: {req.period}):
{chr(10).join(holdings_lines)}

Overall portfolio: annualized return {req.portfolio_return:.2%}, volatility {req.portfolio_volatility:.2%}, Sharpe {req.sharpe_ratio:.2f}, max drawdown {req.max_drawdown:.2%}"""

    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system,
        messages=[{"role": "user", "content": "Write the rebalance plan."}],
    )
    raw = response.content[0].text.strip()
    plan = clean_ai_response(raw)
    return {"holdings": holdings, "plan": plan}

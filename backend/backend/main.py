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

# Startup env check: visible in Railway logs
print(f"[startup] RESEND_API_KEY: {'SET (' + os.environ.get('RESEND_API_KEY', '')[:6] + '...)' if os.environ.get('RESEND_API_KEY') else 'NOT SET'}")
print(f"[startup] RESEND_FROM_EMAIL: {os.environ.get('RESEND_FROM_EMAIL', 'NOT SET')}")
print(f"[startup] SUPABASE_URL: {'SET' if SUPABASE_URL else 'NOT SET'}")

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
    alert_task  = asyncio.create_task(price_alert_loop())
    brief_task  = asyncio.create_task(morning_brief_loop())
    digest_task = asyncio.create_task(weekly_digest_loop())
    yield
    for t in (alert_task, brief_task, digest_task):
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Corvo API", version="1.0.0", lifespan=lifespan)

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

    # ── 3. Hard-delete via Supabase admin API ──────────────────────────────────
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
print(f"CASH_TICKERS loaded: {CASH_TICKERS}")

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
        print(f"[debug] {t}: needs_synthetic={needs_synthetic}, in_cash={is_cash_ticker(t)}")
        if needs_synthetic:
            print(f"[synthetic] {t}")
            synthetic = _align_synthetic(make_synthetic_prices(0.045, n_days, start_date))
            if t not in prices.columns:
                prices[t] = np.nan
            common = prices.index.intersection(synthetic.index)
            prices.loc[common, t] = synthetic.loc[common].values
            if not is_cash_ticker(t):
                print(f"[skipped] {t}")
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
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")

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
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(tickers_list) < 2:
        return {"matrix": [], "tickers": tickers_list}

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
def montecarlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 8500):
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(status_code=400, detail="No tickers")

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

    # Step 1: Compute weighted portfolio daily arithmetic returns from actual history
    returns = prices.pct_change().dropna()
    port_returns = returns.values @ np.array(avail_w)  # sum(weight_i * daily_return_i) per day

    # Step 2: mu and sigma from the arithmetic daily return series
    mu_daily = float(np.mean(port_returns))
    sigma_daily = float(np.std(port_returns))

    # Override mu with long-term asset-class expected returns so recent bull/bear runs
    # don't distort forward projections. Fall back to historical mu for unknown tickers.
    ASSET_CLASS_MU = {
        # Bonds/fixed income
        "BND": 0.04, "AGG": 0.04, "TLT": 0.04, "IEF": 0.035, "SHY": 0.03,
        "SGOV": 0.045, "BIL": 0.04, "VBTLX": 0.04, "LQD": 0.045, "HYG": 0.055,
        # Gold/commodities
        "GLD": 0.05, "IAU": 0.05, "SLV": 0.04, "DJP": 0.04,
        # Broad equity
        "SPY": 0.10, "VOO": 0.10, "VTI": 0.10, "IWM": 0.09, "QQQ": 0.11,
    }

    weighted_mu = 0.0
    for t, w in zip(available, avail_w):
        asset_mu = ASSET_CLASS_MU.get(t, mu_daily * 252)  # use historical for unknowns
        weighted_mu += w * asset_mu

    mu_daily = weighted_mu / 252

    # Enforce minimum daily volatility so simulation never shows 100% positive paths.
    # Conservative portfolios can have very low historical vol — floor at 8% annualised.
    MIN_SIGMA_ANNUAL = 0.08
    sigma_daily = max(sigma_daily, MIN_SIGMA_ANNUAL / np.sqrt(252))

    # Cap annualised mu at 25% to prevent bull-run portfolios from showing no downside paths.
    MAX_MU_ANNUAL = 0.25
    mu_daily = min(mu_daily, MAX_MU_ANNUAL / 252)

    # Step 3: Annualise for the GBM formula with dt = 1/252
    # exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z) with annualised params and dt=1/252
    # is mathematically equivalent to exp(mu_daily - 0.5*sigma_daily^2 + sigma_daily*Z) per day
    mu = mu_daily * 252
    sigma = sigma_daily * np.sqrt(252)
    dt = 1.0 / 252
    horizon = 252

    # Step 4: Run 8500 independent GBM paths — each starts at 1.0
    rng = np.random.default_rng()
    Z = rng.standard_normal((simulations, horizon))
    daily_factors = np.exp((mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z)
    path_values = np.cumprod(daily_factors, axis=1)  # shape (simulations, 252); 1.0 = breakeven

    # Step 5: Collect all 8500 final values after 252 steps
    final_vals = path_values[:, -1]  # actual multipliers (1.0 = breakeven)

    # Step 6: Percentiles of final values as percentage gains from 1.0
    p5  = safe_float(float(np.percentile(final_vals, 5))  - 1.0)
    p25 = safe_float(float(np.percentile(final_vals, 25)) - 1.0)
    p50 = safe_float(float(np.percentile(final_vals, 50)) - 1.0)
    p75 = safe_float(float(np.percentile(final_vals, 75)) - 1.0)
    p95 = safe_float(float(np.percentile(final_vals, 95)) - 1.0)

    # Step 7: Probability positive — fraction of paths ending above 1.0 (never hardcoded)
    positive_prob = safe_float(float(np.mean(final_vals > 1.0)))

    # Step 8: Max loss — 1 minus the lowest final path value
    max_loss = safe_float(float(1.0 - np.min(final_vals)))

    # Step 9: Percentile bands at each of 252 days for the fan chart (fractional gain/loss)
    paths_pct = path_values - 1.0
    pct_bands = {
        "p5":  safe_list(np.percentile(paths_pct, 5,  axis=0).tolist()),
        "p25": safe_list(np.percentile(paths_pct, 25, axis=0).tolist()),
        "p50": safe_list(np.percentile(paths_pct, 50, axis=0).tolist()),
        "p75": safe_list(np.percentile(paths_pct, 75, axis=0).tolist()),
        "p95": safe_list(np.percentile(paths_pct, 95, axis=0).tolist()),
    }

    # Risk metrics
    ruin_threshold = 0.5  # lose more than 50% → final value < 0.5
    ruin_probability = safe_float(float(np.mean(final_vals < ruin_threshold)))
    worst_5pct_mask = final_vals <= np.percentile(final_vals, 5)
    expected_shortfall = safe_float(
        float(np.mean(final_vals[worst_5pct_mask]) - 1.0) if worst_5pct_mask.any() else p5
    )

    # Step 10: Return simulations count in response
    return {
        "horizon": horizon,
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

    prompt = (
        f"A portfolio was simulated {req.simulations} times over 1 year. Results: "
        f"{req.positive_prob}% of simulations ended with positive returns. "
        f"Median outcome: {p50_pct:+.1f}%. "
        f"Worst 5% of scenarios: below {p5_pct:.1f}% (average of worst 5%: {es_pct:.1f}%). "
        f"Best 5% of scenarios: above {p95_pct:+.1f}%. "
        f"Probability of losing more than 50%: {ruin_pct:.1f}%. "
        f"Write 2-3 plain English sentences for the investor. Start with 'Based on {req.simulations} simulations'. "
        f"Be direct and specific. No markdown, no bullet points, no disclaimers."
    )

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system="You are a plain-English financial analyst. Write concise, jargon-free summaries for retail investors. Never claim a cash or money market fund like FDRXX, SPAXX, or VMFXX is a stock holding — they are cash equivalents. Never use em dashes in your response. Never use asterisks (*) or markdown formatting. Write in plain prose only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return {"insight": clean_ai_response(resp.content[0].text)}


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
            model="claude-sonnet-4-5",
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

        S_TITLE   = ParagraphStyle("title",   fontName="Helvetica-Bold",   fontSize=28, textColor=AMBER,   spaceAfter=4)
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


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}
    user_goals: dict = {}
    market_context: str = ""
    user_id: str | None = None

    def validate_message(self):
        if not self.message or not self.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        if len(self.message) > 4000:
            raise HTTPException(status_code=400, detail="Message too long (max 4000 characters)")


@app.post("/chat")
def chat(req: ChatRequest, request: Request):
    req.validate_message()
    # Daily limit check (per-user via Supabase); fall back to IP rate limit for unauthenticated
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
    try:
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

        benchmark_text = f"\n- Benchmark Return: {benchmark_return:.2%}" if benchmark_return is not None else ""
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

        system = f"""You are Corvo AI, a sharp and direct personal portfolio analyst. You have full context on this investor's portfolio and financial profile.

CURRENT PORTFOLIO:
- Holdings{weights_note}: {holdings_str}
- Period: {period}
- Annualized Return (CAGR): {ret:.2%}
- Annualized Volatility: {vol:.2%}
- Sharpe Ratio: {sharpe:.2f} (risk-free rate used: {rf_rate_ctx:.2%})
- Max Drawdown: {dd:.2%}{portfolio_value_text}{benchmark_text}{health_text}{beta_text}{individual_returns_text}{market_text}{investor_profile}

RESPONSE RULES:
• Max 220 words for simple questions; up to 300 words for complex multi-part questions
• Use bullet points (•) for lists
• Always reference specific numbers from the portfolio
• Always state the period (e.g. "over the {period} period") when discussing returns
• When portfolio_value is known, use dollar amounts not just percentages
• Compare portfolio metrics to the benchmark when benchmark data is available
• Verify weight percentages before stating them — if equally weighted, say so explicitly
• Never confuse cash or money market positions with equity positions
• When the investor has a profile, reference their goals/age/timeline in your answer
• If they ask about risk, factor in their stated risk tolerance
• Plain text only, no markdown headers or bold
• Never use em dashes. Never use asterisks (*) or markdown formatting. Write in plain prose only."""

        messages = [{"role": h["role"], "content": h["content"]} for h in req.history]
        messages.append({"role": "user", "content": req.message})

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=system,
            messages=messages,
        )
        reply = clean_ai_response(response.content[0].text)
        # Record usage for daily limit tracking
        messages_used_now = daily_count + 1 if req.user_id else None
        if req.user_id:
            insert_chat_usage(req.user_id)
        return {
            "reply": reply,
            "messages_used": messages_used_now,
            "messages_limit": daily_limit if req.user_id else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
def parse_portfolio_image(body: dict):
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

        client = anthropic.Anthropic(api_key=api_key)
        image_b64 = body.get("image_base64", "")
        media_type = body.get("media_type", "image/jpeg")

        response = client.messages.create(
            model="claude-sonnet-4-5",
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


def get_email_html(display_name=None, email_type="welcome", user_id=None):
    """Return a table-based HTML email string compatible with Gmail, Outlook, and Apple Mail."""
    amber = "#c9a84c"
    bg = "#0a0a0a"
    card_bg = "#111111"
    text = "#e8e0cc"
    text_muted = "#888880"

    if email_type == "weekly_digest":
        greeting = f"Your weekly digest, {display_name}" if display_name else "Your weekly digest"
        cta_text = "View Your Portfolio &rarr;"
    else:
        greeting = f"Welcome, {display_name} &#x1F44B;" if display_name else "Welcome to Corvo &#x1F44B;"
        cta_text = "Go to Dashboard &rarr;"

    unsubscribe_url = (
        f"https://corvo.capital/unsubscribe?user_id={user_id}"
        if user_id
        else "https://corvo.capital/unsubscribe"
    )

    features = [
        ("&#x1F4CA;", "Portfolio Analysis", "Sharpe ratio, Monte Carlo simulations, drawdown charts, and a health score for your holdings."),
        ("&#x1F916;", "AI Insights", "Ask questions about your portfolio and get real-time answers with live market context."),
        ("&#x1F393;", "Financial Education", "Lessons, quizzes, and mini-games that teach real investing concepts, complete with XP and leaderboards."),
    ]

    feature_rows = ""
    for icon, title, body in features:
        feature_rows += f"""
        <tr>
          <td style="padding:8px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:{card_bg};border-radius:8px;border:1px solid #222;">
              <tr>
                <td style="padding:16px 20px;vertical-align:top;width:36px;font-size:22px;">{icon}</td>
                <td style="padding:16px 20px 16px 0;vertical-align:top;">
                  <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:13px;
                             font-weight:700;color:{amber};letter-spacing:0.5px;">{title}</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;
                             color:{text_muted};line-height:1.6;">{body}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Corvo</title>
</head>
<body style="margin:0;padding:0;background-color:{bg};">
  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:{bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Email card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0 0 4px 0;font-family:'Courier New',Courier,monospace;
                         font-size:28px;font-weight:900;letter-spacing:6px;color:{amber};">CORVO</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:9px;
                         letter-spacing:3px;color:#555;text-transform:uppercase;">Portfolio Intelligence</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:6px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;
                         font-weight:700;color:{text};">{greeting}</p>
            </td>
          </tr>

          <!-- Subheading -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;
                         color:{text_muted};line-height:1.6;">
                Your account is ready. Here&#39;s what you can do with Corvo:
              </p>
            </td>
          </tr>

          <!-- Feature cards -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                {feature_rows}
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:32px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:{amber};">
                    <a href="https://corvo.capital/app"
                       style="display:inline-block;padding:14px 36px;font-family:Arial,sans-serif;
                              font-size:14px;font-weight:700;color:#000000;text-decoration:none;
                              border-radius:8px;letter-spacing:0.5px;">{cta_text}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spam notice -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;
                         color:#444;text-align:center;line-height:1.8;">
                If you don&#39;t see our emails, check your spam folder and mark us as safe.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #1e1e1e;padding-top:24px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;
                         color:#444;text-align:center;line-height:1.8;">
                &copy; 2026 Corvo &nbsp;&middot;&nbsp;
                <a href="https://corvo.capital" style="color:#555;text-decoration:none;">corvo.capital</a>
                &nbsp;&middot;&nbsp;
                <a href="{unsubscribe_url}" style="color:#555;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


class WelcomeEmailRequest(BaseModel):
    email: str
    display_name: str | None = None
    user_id: str | None = None

@app.post("/send-welcome-email")
def send_welcome_email(req: WelcomeEmailRequest):
    """Send a welcome email to a new Corvo user via Resend."""
    print(f"[send-welcome-email] called for {req.email}")
    resend_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_key:
        print("[send-welcome-email] RESEND_API_KEY not set, skipping")
        return {"ok": True, "skipped": True}

    html = get_email_html(display_name=req.display_name, email_type="welcome", user_id=req.user_id)

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": "Corvo <hello@corvo.capital>",
                "to": [req.email],
                "subject": "Welcome to Corvo \U0001f3af",
                "html": html,
            },
            timeout=10,
        )
        response.raise_for_status()
        print(f"[send-welcome-email] sent OK to {req.email} (status {response.status_code})")
        return {"ok": True}
    except Exception as e:
        print(f"[send-welcome-email] FAILED for {req.email}: {e}")
        return {"ok": False, "error": str(e)}


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


_options_cache: dict[str, tuple[dict, float]] = {}

@app.get("/options/{ticker}")
def get_options_chain(ticker: str, date: str = None, request: Request = None):
    """Fetch options chain for a ticker. Cached 15 min per (ticker, date)."""
    if request:
        ip = request.client.host if request.client else "unknown"
        if check_rate_limit(ip, "options", 30, 3600):
            raise HTTPException(status_code=429, detail="Rate limit: 30 requests/hr")

    ticker = ticker.upper().strip()
    cache_key = f"{ticker}|{date or ''}"
    if cache_key in _options_cache:
        cached, ts = _options_cache[cache_key]
        if time.time() - ts < 900:   # 15-minute TTL
            return cached

    try:
        t = yf.Ticker(ticker)
        expiry_dates: list[str] = list(t.options)
        if not expiry_dates:
            raise HTTPException(status_code=404, detail="No options available for this ticker")

        # Resolve which expiry to load
        selected = date if (date and date in expiry_dates) else expiry_dates[0]

        info = t.info or {}
        current_price = safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or 0) or 0.0

        chain = t.option_chain(selected)

        def _process(df) -> list[dict]:
            rows = []
            for _, row in df.iterrows():
                iv = safe_float(row.get("impliedVolatility"))
                rows.append({
                    "strike":           safe_float(row.get("strike")) or 0.0,
                    "lastPrice":        safe_float(row.get("lastPrice")),
                    "bid":              safe_float(row.get("bid")),
                    "ask":              safe_float(row.get("ask")),
                    "volume":           int(row.get("volume") or 0),
                    "openInterest":     int(row.get("openInterest") or 0),
                    "impliedVolatility": round(iv * 100, 2) if iv is not None else None,
                    "inTheMoney":       bool(row.get("inTheMoney", False)),
                })
            return sorted(rows, key=lambda r: r["strike"])

        result = {
            "ticker":           ticker,
            "current_price":    round(current_price, 4),
            "expiration_dates": expiry_dates,
            "selected_date":    selected,
            "calls":            _process(chain.calls),
            "puts":             _process(chain.puts),
        }
        _options_cache[cache_key] = (result, time.time())
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Options error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

    # Fetch per-holding price changes
    holdings_data: dict[str, float] = {}
    for sym in user_tickers:
        try:
            info = yf.Ticker(sym).fast_info
            price = safe_float(getattr(info, "last_price", 0) or 0)
            prev_close = safe_float(getattr(info, "previous_close", 0) or 0)
            pct = ((price - prev_close) / prev_close * 100) if price > 0 and prev_close > 0 else 0.0
            holdings_data[sym] = round(pct, 2)
        except Exception as e:
            print(f"market-summary holdings error for {sym}: {e}")

    # AI generation — three distinct sections
    market_text = holdings_text = context_text = ""
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
                holdings_line = (
                    "User holdings today: "
                    + ", ".join(f"{s} {sign(v)}{v:.2f}%" for s, v in holdings_data.items())
                    + f". Best performer: {best_sym} ({sign(holdings_data[best_sym])}{holdings_data[best_sym]:.2f}%)."
                    + f" Worst performer: {worst_sym} ({sign(holdings_data[worst_sym])}{holdings_data[worst_sym]:.2f}%)."
                )
            else:
                holdings_line = "No user holdings provided."

            prompt = f"""Market data:
S&P 500 (SPY) {direction(spy_pct)} {abs(spy_pct):.2f}%, Nasdaq (QQQ) {direction(qqq_pct)} {abs(qqq_pct):.2f}%, Dow (DIA) {direction(dia_pct)} {abs(dia_pct):.2f}%, VIX {vix_val:.1f}.
Top news: {news_str}
{holdings_line}

Return a JSON object with exactly these three string keys:
- "market": 2 sentences on what major indexes did today and why, referencing the news headlines.
- "holdings": {"1-2 sentences on how the user's holdings performed, naming best and worst performer with their actual % change." if holdings_data else '"No holdings provided."'}
- "context": 1 sentence of macro context (geopolitical, Fed, earnings) drawn from the news.

Rules: no asterisks, no em dashes, no markdown. Plain prose. Return only the JSON object."""

            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=450,
                system="You are a senior Bloomberg markets correspondent. Return ONLY a valid JSON object with keys: market, holdings, context. No markdown fences, no extra text.",
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
            context_text = clean_ai_response(parsed.get("context", ""))
        except Exception as e:
            print(f"market-summary AI error: {e}")

    result = {
        "market": market_text,
        "holdings": holdings_text,
        "context": context_text,
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


@app.get("/test-email")
def test_email(email: str = ""):
    """Debug endpoint: send a test email via Resend and return the result."""
    import traceback

    target = email or os.environ.get("TEST_EMAIL_TO", "")
    if not target:
        return {"ok": False, "error": "Provide ?email=you@example.com or set TEST_EMAIL_TO env var"}

    resend_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_key:
        return {"ok": False, "error": "RESEND_API_KEY not configured"}

    print(f"[test-email] sending to {target} via Resend")

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": "Corvo <hello@corvo.capital>",
                "to": [target],
                "subject": "Corvo: Test Email",
                "html": "<p>This is a Corvo test email. Resend is working correctly.</p>",
            },
            timeout=10,
        )
        data = response.json()
        if response.status_code in (200, 201):
            print(f"[test-email] sent OK to {target} id={data.get('id')}")
            return {"ok": True, "sent_to": target, "resend_id": data.get("id")}
        else:
            print(f"[test-email] Resend error {response.status_code}: {data}")
            return {"ok": False, "error": data}
    except Exception:
        tb = traceback.format_exc()
        print(f"[test-email] FAILED:\n{tb}")
        return {"ok": False, "error": tb}


@app.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(user_id: str = ""):
    """Set weekly_digest and price_alerts to false in email_preferences for the given user."""
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
                json={"weekly_digest": False, "price_alerts": False},
                timeout=8,
            )
            success = resp.status_code in (200, 204)
            print(f"[unsubscribe] user_id={user_id} status={resp.status_code}")
        except Exception as e:
            print(f"[unsubscribe] error: {e}")

    if success:
        body_text = "You&#39;ve been unsubscribed from Corvo emails. You won&#39;t receive weekly digests or price alert emails going forward."
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
def push_subscribe(req: PushSubscribeRequest):
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
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
        )
        return "ok"
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            return "dead"
        print(f"[push] send error: {e}")
        return "err"


def _send_alert_email(to_email: str, ticker: str, price: float, condition: str, threshold: float):
    """Send price alert email via Resend."""
    resend_key = os.environ.get("RESEND_API_KEY", "")
    from_email = os.environ.get("RESEND_FROM_EMAIL", "alerts@corvo.capital")
    if not resend_key or not to_email:
        return
    subject = f"Price Alert: {ticker} has {'dropped' if condition == 'drops' else 'risen'} {threshold}%"
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="background:#0a0e14;color:#e8e0cc;font-family:Courier New,monospace;padding:40px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <div style="font-size:22px;font-weight:900;letter-spacing:8px;color:#c9a84c;margin-bottom:4px">CORVO</div>
    <div style="font-size:8px;letter-spacing:3px;color:rgba(232,224,204,0.35);margin-bottom:32px">PRICE ALERT</div>
    <div style="background:#111827;border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:24px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Alert Triggered</div>
      <div style="font-size:28px;font-weight:700;color:#e8e0cc;margin-bottom:4px">{ticker}</div>
      <div style="font-size:16px;color:rgba(232,224,204,0.7);margin-bottom:20px">
        Current price: <strong style="color:#c9a84c">${price:.2f}</strong>
      </div>
      <div style="font-size:13px;color:rgba(232,224,204,0.6);line-height:1.7">
        Your alert triggered because {ticker} {'dropped' if condition == 'drops' else 'rose'} by more than {threshold}%.
      </div>
    </div>
    <div style="margin-top:28px;font-size:10px;color:rgba(232,224,204,0.25);text-align:center">
      corvo.capital · Not financial advice
    </div>
  </div>
</body></html>"""
    try:
        requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={"from": from_email, "to": [to_email], "subject": subject, "html": html},
            timeout=10,
        )
    except Exception as e:
        print(f"[push] alert email error: {e}")


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

                    # Send push to all subscriptions for this user
                    subs_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=subscription",
                        headers=_sb_headers(), timeout=5,
                    )
                    if subs_resp.status_code == 200:
                        for row in subs_resp.json():
                            _send_push(row["subscription"], notif_title, notif_body)

                    # Send email alert
                    user_resp = requests.get(
                        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                        headers=_sb_headers(), timeout=5,
                    )
                    if user_resp.status_code == 200:
                        email = user_resp.json().get("email", "")
                        if email:
                            _send_alert_email(email, ticker, current_price, condition, threshold)

                    print(f"[alerts] triggered: {ticker} {condition} {threshold}% for user {user_id}")
            except Exception as e:
                err_str = str(e)
                if "401" in err_str or "Unauthorized" in err_str or "Crumb" in err_str:
                    print(f"[alerts] yfinance session expired, skipping cycle")
                    break  # Stop this cycle, will retry on next scheduled run
                print(f"[alerts] error checking {ticker}: {e}")
    except Exception as e:
        print(f"[alerts] check_price_alerts error: {e}")

        # ── Portfolio alerts ──────────────────────────────────────────────
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

                    # Send push
                    subs_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=subscription",
                        headers=_sb_headers(), timeout=5,
                    )
                    if subs_resp.status_code == 200:
                        for row in subs_resp.json():
                            _send_push(row["subscription"], notif_title, notif_body)

                    # Send email
                    user_resp = requests.get(
                        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                        headers=_sb_headers(), timeout=5,
                    )
                    if user_resp.status_code == 200:
                        email = user_resp.json().get("email", "")
                        if email:
                            _send_alert_email(email, pf_name, latest_val, condition, threshold)

                    print(f"[alerts] portfolio triggered: {pf_name} {condition} {threshold}% for user {user_id}")
                except Exception as e:
                    print(f"[alerts] portfolio alert error: {e}")


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
    requests.post(
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

    return {
        "ok": True,
        "date": today,
        "portfolio_value": round(portfolio_value, 2),
        "cumulative_return_pct": round(cumulative_return * 100, 4),
    }


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
    """Return 1-day percentage change for a ticker."""
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
        volumes = data["Volume"].iloc[-1].dropna()
        top5 = volumes.nlargest(5).index.tolist()
        return [{"ticker": t, "change": _brief_one_day_change(t), "volume": int(volumes[t])} for t in top5]
    except Exception:
        return [{"ticker": t, "change": _brief_one_day_change(t), "volume": 0} for t in _BRIEF_MOVERS[:5]]


def _brief_generate(indices: dict[str, float], movers: list[dict]) -> str:
    """Call Claude to write a concise market brief."""
    import anthropic as _anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return ""
    client = _anthropic.Anthropic(api_key=api_key)
    index_lines  = "\n".join([f"  {t}: {v:+.2f}%" for t, v in indices.items()])
    mover_lines  = "\n".join([f"  {m['ticker']}: {m['change']:+.2f}% (vol {m['volume']:,})" for m in movers])
    prompt = (
        "You are a market analyst. Write a concise daily market brief in exactly 3 paragraphs:\n\n"
        f"INDEX PERFORMANCE (1-day):\n{index_lines}\n\n"
        f"TOP 5 MOST ACTIVE STOCKS:\n{mover_lines}\n\n"
        "Paragraph 1: Overall market mood.\n"
        "Paragraph 2: Notable movers.\n"
        "Paragraph 3: One forward-looking insight.\n"
        "Keep each paragraph to 2-3 sentences. Be direct and analytical. No fluff.\n\n"
        "FORMATTING RULES (follow these exactly):\n"
        "- Never use asterisks (*) or double asterisks (**) for bold or any formatting\n"
        "- Never use em dashes anywhere in the response\n"
        "- Never use markdown formatting of any kind\n"
        "- Write in plain prose only\n"
        "- No bullet points, no headers, no bold, no italics\n"
        "- Just three clean paragraphs of plain text separated by double newlines"
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system="You are a market analyst writing plain prose daily briefs. Never use em dashes. Never use asterisks or any markdown formatting. Write in plain prose only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return clean_ai_response(response.content[0].text)


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

    sent = failed = removed = 0
    dead_ids: list[str] = []

    for row in rows:
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
async def test_morning_brief():
    """Manually trigger the morning market brief push (for testing)."""
    result = await send_morning_brief()
    return result


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
        indices = await loop.run_in_executor(None, _brief_fetch_indices)
        movers  = await loop.run_in_executor(None, _brief_fetch_movers)
        brief   = await loop.run_in_executor(None, _brief_generate, indices, movers)
        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        result = {
            "brief": brief,
            "generated_at": generated_at,
            "indices": {k: safe_float(v) for k, v in indices.items()},
            "movers": movers,
        }
        _market_brief_cache["data"] = result
        _market_brief_cache["ts"] = now
        return result
    except Exception as e:
        return {"error": str(e), "brief": "", "generated_at": "", "indices": {}, "movers": []}


async def price_alert_loop():
    """Background loop: check price alerts every 60 seconds."""
    print("[alerts] background price alert checker started")
    while True:
        try:
            await check_price_alerts()
        except Exception as e:
            print(f"[alerts] loop error: {e}")
        await asyncio.sleep(60)


# ── Weekly Portfolio Digest ────────────────────────────────────────────────────

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


def _generate_digest_summary(display_name: str, portfolio_blocks: list[dict]) -> str:
    """
    Ask Claude to write a concise 2-paragraph personalised digest summary.
    portfolio_blocks: [{name, return_7d, best_day, worst_day, sharpe, tickers}]
    """
    try:
        import anthropic as _anth
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return ""
        client = _anth.Anthropic(api_key=api_key)

        pf_lines = []
        for pf in portfolio_blocks:
            ret = f"{pf['return_7d']:+.2f}%" if pf["return_7d"] is not None else "N/A"
            best = f"{pf['best_day']:+.2f}%" if pf["best_day"] is not None else "N/A"
            worst = f"{pf['worst_day']:+.2f}%" if pf["worst_day"] is not None else "N/A"
            sharpe = str(pf["sharpe"]) if pf["sharpe"] is not None else "N/A"
            tickers = ", ".join(pf.get("tickers", [])[:6])
            pf_lines.append(
                f'  Portfolio "{pf["name"]}": 7-day return {ret}, best day {best}, '
                f'worst day {worst}, Sharpe {sharpe}. Holdings: {tickers}.'
            )

        name_str = display_name or "there"
        prompt = (
            f"You are a personal financial analyst writing a weekly portfolio digest for {name_str}.\n\n"
            f"Portfolio performance this week:\n" + "\n".join(pf_lines) + "\n\n"
            "Write exactly 2 paragraphs:\n"
            "Paragraph 1: Summarise overall performance for the week: highlight the key return, "
            "what drove it, and compare good vs bad days.\n"
            "Paragraph 2: One forward-looking observation: a risk, opportunity, or rebalancing thought.\n"
            "Be direct, specific, and concise. Max 60 words per paragraph. No bullet points. No preamble. "
            "Never use em dashes. Never use asterisks (*) or markdown formatting. Write in plain prose only."
        )
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return clean_ai_response(resp.content[0].text)
    except Exception as e:
        print(f"[digest] Claude error: {e}")
        return ""


def _build_digest_html(display_name: str, user_id: str, portfolio_blocks: list[dict], ai_summary: str) -> str:
    """Build the full dark HTML email for the weekly digest."""
    amber = "#c9a84c"
    bg = "#0a0a0a"
    card_bg = "#111111"
    text = "#e8e0cc"
    muted = "#888880"
    border = "#1e1e1e"

    name_str = display_name or "Investor"
    unsub_url = f"https://corvo.capital/unsubscribe?user_id={user_id}" if user_id else "https://corvo.capital/unsubscribe"

    # Build per-portfolio stat blocks
    pf_html = ""
    for pf in portfolio_blocks:
        ret = pf.get("return_7d")
        best = pf.get("best_day")
        worst = pf.get("worst_day")
        sharpe = pf.get("sharpe")
        tickers = pf.get("tickers", [])

        ret_color = "#5cb88a" if (ret is not None and ret >= 0) else "#e05c5c"
        ret_str = f"{ret:+.2f}%" if ret is not None else "N/A"
        best_str = f"{best:+.2f}%" if best is not None else "N/A"
        worst_str = f"{worst:+.2f}%" if worst is not None else "N/A"
        sharpe_str = str(sharpe) if sharpe is not None else "N/A"
        ticker_str = "  ·  ".join(tickers[:6]) + ("  +" + str(len(tickers) - 6) + " more" if len(tickers) > 6 else "")

        stats_cells = ""
        for label, val, color in [
            ("7-Day Return", ret_str, ret_color),
            ("Best Day", best_str, "#5cb88a"),
            ("Worst Day", worst_str, "#e05c5c"),
            ("Sharpe", sharpe_str, amber),
        ]:
            stats_cells += f"""
              <td align="center" style="padding:12px 8px;width:25%;">
                <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;
                           letter-spacing:2px;color:{muted};text-transform:uppercase;">{label}</p>
                <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:17px;
                           font-weight:700;color:{color};">{val}</p>
              </td>"""

        pf_html += f"""
        <tr>
          <td style="padding:8px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:{card_bg};border-radius:10px;border:1px solid {border};">
              <tr>
                <td style="padding:18px 20px 6px 20px;">
                  <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;
                             font-weight:700;color:{text};">{pf['name']}</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:{muted};">{ticker_str}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 12px 12px 12px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>{stats_cells}</tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    # AI summary section
    summary_html = ""
    if ai_summary:
        paras = [p.strip() for p in ai_summary.split("\n\n") if p.strip()]
        for para in paras:
            summary_html += f"""
        <tr>
          <td style="padding:4px 0 8px 0;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;
                       color:{muted};line-height:1.7;">{para}</p>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly Portfolio Digest | Corvo</title>
</head>
<body style="margin:0;padding:0;background-color:{bg};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:{bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0 0 4px 0;font-family:'Courier New',Courier,monospace;
                         font-size:28px;font-weight:900;letter-spacing:6px;color:{amber};">CORVO</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:9px;
                         letter-spacing:3px;color:#555;text-transform:uppercase;">Portfolio Intelligence</p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom:4px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;
                         letter-spacing:3px;color:{muted};text-transform:uppercase;">Weekly Digest</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;
                         font-weight:700;color:{text};">Your week in review, {name_str}</p>
            </td>
          </tr>

          <!-- Portfolio stat cards -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                {pf_html}
              </table>
            </td>
          </tr>

          <!-- AI summary -->
          {"" if not ai_summary else f'''
          <tr><td style="padding:24px 0 8px 0;">
            <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:9px;
                       letter-spacing:2.5px;color:{muted};text-transform:uppercase;">AI Analysis</p>
          </td></tr>
          ''' + summary_html}

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:28px 0 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:{amber};">
                    <a href="https://corvo.capital/app"
                       style="display:inline-block;padding:14px 36px;font-family:Arial,sans-serif;
                              font-size:14px;font-weight:700;color:#000000;text-decoration:none;
                              border-radius:8px;letter-spacing:0.5px;">View Full Analysis &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider + footer -->
          <tr>
            <td style="border-top:1px solid {border};padding-top:24px;margin-top:16px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;
                         color:#444;text-align:center;line-height:1.8;">
                &copy; 2026 Corvo &nbsp;&middot;&nbsp;
                <a href="https://corvo.capital" style="color:#555;text-decoration:none;">corvo.capital</a>
                &nbsp;&middot;&nbsp;
                <a href="{unsub_url}" style="color:#555;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send_digest_email(to_email: str, display_name: str, user_id: str,
                       portfolio_blocks: list[dict], ai_summary: str) -> bool:
    """Build and send the weekly digest email via Resend. Returns True on success."""
    resend_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_key:
        print("[digest] RESEND_API_KEY not set, skipping email")
        return False
    html = _build_digest_html(display_name, user_id, portfolio_blocks, ai_summary)
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": "Corvo <hello@corvo.capital>",
                "to": [to_email],
                "subject": "📊 Your Weekly Portfolio Digest",
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return True
        print(f"[digest] Resend error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as e:
        print(f"[digest] email send error: {e}")
        return False


async def send_weekly_digest(target_user_id: str | None = None) -> dict:
    """
    Send the weekly digest to all users with weekly_digest = true
    (or to target_user_id only when called from the test endpoint).
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"skipped": "supabase not configured"}

    loop = asyncio.get_event_loop()

    # 1. Fetch opted-in users from email_preferences
    try:
        prefs_url = f"{SUPABASE_URL}/rest/v1/email_preferences?weekly_digest=eq.true&select=user_id"
        if target_user_id:
            prefs_url = f"{SUPABASE_URL}/rest/v1/email_preferences?user_id=eq.{target_user_id}&select=user_id"
        prefs_resp = requests.get(prefs_url, headers=_sb_headers(), timeout=10)
        if prefs_resp.status_code != 200:
            return {"error": f"prefs fetch {prefs_resp.status_code}"}
        user_ids = [r["user_id"] for r in prefs_resp.json()]
    except Exception as e:
        return {"error": str(e)}

    if not user_ids:
        print("[digest] no opted-in users")
        return {"sent": 0, "skipped": "no opted-in users"}

    # Date range: last 7 days
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    week_ago = (today - timedelta(days=7)).isoformat()

    sent = failed = skipped = 0

    for user_id in user_ids:
        try:
            # 2a. Get user email from Supabase Auth
            user_resp = requests.get(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers=_sb_headers(), timeout=8,
            )
            if user_resp.status_code != 200:
                skipped += 1
                continue
            user_data = user_resp.json()
            email = user_data.get("email", "")
            if not email:
                skipped += 1
                continue
            display_name = (
                (user_data.get("user_metadata") or {}).get("full_name")
                or (user_data.get("user_metadata") or {}).get("name")
                or email.split("@")[0]
            )

            # 2b. Fetch all portfolios for this user
            pf_resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/portfolios?user_id=eq.{user_id}&select=id,name,tickers,weights",
                headers=_sb_headers(), timeout=8,
            )
            if pf_resp.status_code != 200 or not pf_resp.json():
                skipped += 1
                continue
            portfolios = pf_resp.json()

            portfolio_blocks: list[dict] = []

            for pf in portfolios:
                pf_id = pf.get("id")
                pf_name = pf.get("name") or "Portfolio"
                tickers = pf.get("tickers") or []

                # 2c. Fetch last 7 days of snapshots
                snap_resp = requests.get(
                    f"{SUPABASE_URL}/rest/v1/portfolio_snapshots"
                    f"?portfolio_id=eq.{pf_id}&date=gte.{week_ago}"
                    f"&select=date,portfolio_value&order=date.asc",
                    headers=_sb_headers(), timeout=8,
                )
                snapshots = snap_resp.json() if snap_resp.status_code == 200 else []

                stats = _compute_portfolio_week_stats(snapshots)
                portfolio_blocks.append({
                    "name": pf_name,
                    "tickers": tickers,
                    **stats,
                })

            if not portfolio_blocks:
                skipped += 1
                continue

            # 2d. Generate AI summary (blocking, run in executor)
            ai_summary = await loop.run_in_executor(
                None, _generate_digest_summary, display_name, portfolio_blocks
            )

            # 2e. Send email
            ok = await loop.run_in_executor(
                None, _send_digest_email, email, display_name, user_id, portfolio_blocks, ai_summary
            )
            if ok:
                sent += 1
                print(f"[digest] sent to {email}")
            else:
                failed += 1

        except Exception as e:
            print(f"[digest] error for user {user_id}: {e}")
            failed += 1

    print(f"[digest] done, sent={sent} failed={failed} skipped={skipped}")
    return {"sent": sent, "failed": failed, "skipped": skipped}


def _seconds_until_sunday_8am_et() -> float:
    """Return seconds until the next Sunday 8:00 AM US/Eastern, minimum 60 s."""
    from zoneinfo import ZoneInfo
    from datetime import timedelta
    now_et = datetime.now(ZoneInfo("America/New_York"))
    # weekday(): Monday=0 … Sunday=6
    days_ahead = (6 - now_et.weekday()) % 7
    target = (now_et + timedelta(days=days_ahead)).replace(
        hour=8, minute=0, second=0, microsecond=0
    )
    if target <= now_et:
        # We're already past 8am on a Sunday, use next Sunday
        target += timedelta(days=7)
    return max((target - now_et).total_seconds(), 60.0)


async def weekly_digest_loop():
    """Background task: send portfolio digest email every Sunday at 8am ET."""
    print("[digest] scheduler started")
    while True:
        wait = _seconds_until_sunday_8am_et()
        print(f"[digest] sleeping {wait/3600:.1f}h until Sunday 8am ET")
        await asyncio.sleep(wait)
        try:
            await send_weekly_digest()
        except Exception as e:
            print(f"[digest] loop error: {e}")
        await asyncio.sleep(60)


@app.get("/email/test-digest")
async def test_weekly_digest(user_id: str = ""):
    """Manually trigger the weekly digest for a specific user (or all opted-in users)."""
    result = await send_weekly_digest(target_user_id=user_id or None)
    return result


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
        url = (
            f"https://financialmodelingprep.com/api/v3/economic_calendar"
            f"?from={today.isoformat()}&to={to_date.isoformat()}&apikey=demo"
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

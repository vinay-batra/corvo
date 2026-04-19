from fastapi import FastAPI, UploadFile, File
import csv
import io
import math
import os
import time
import requests as _requests

def sanitize(obj):
    """Recursively replace NaN/Inf with None for JSON compliance."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import yfinance as yf

from data import get_data
from portfolio import (
    calculate_returns,
    portfolio_performance,
    cumulative_returns,
    max_drawdown,
)
from optimizer import optimize_portfolio
from chat import chat_with_claude, parse_portfolio_from_image

app = FastAPI()

# Startup env check: visible in Railway logs
print(f"[startup] RESEND_API_KEY: {'SET' if os.environ.get('RESEND_API_KEY') else 'NOT SET'}")
print(f"[startup] RESEND_FROM_EMAIL: {'SET' if os.environ.get('RESEND_FROM_EMAIL') else 'NOT SET'}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://corvo.capital",
        "https://www.corvo.capital",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERIOD_MAP = {"6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y"}

# ── Market Brief cache ─────────────────────────────────────────────────────────
_market_brief_cache: dict = {}
_BRIEF_TTL = 3600  # 1 hour

INDICES = ["SPY", "QQQ", "IWM", "DIA"]
MOVER_CANDIDATES = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"]

def _fetch_one_day_change(ticker: str) -> float:
    """Return 1-day percentage change for a ticker."""
    try:
        hist = yf.Ticker(ticker).history(period="2d")
        if len(hist) >= 2:
            prev, curr = float(hist["Close"].iloc[-2]), float(hist["Close"].iloc[-1])
            return round((curr - prev) / prev * 100, 2)
    except Exception:
        pass
    return 0.0

def _fetch_index_data() -> dict:
    result = {}
    for ticker in INDICES:
        result[ticker] = _fetch_one_day_change(ticker)
    return result

def _fetch_top_movers() -> list:
    """Pick top 5 by today's volume from MOVER_CANDIDATES."""
    try:
        import pandas as pd
        data = yf.download(MOVER_CANDIDATES, period="2d", auto_adjust=True, progress=False)
        volumes = data["Volume"].iloc[-1].dropna()
        top5 = volumes.nlargest(5).index.tolist()
        movers = []
        for ticker in top5:
            change = _fetch_one_day_change(ticker)
            movers.append({"ticker": ticker, "change": change, "volume": int(volumes[ticker])})
        return movers
    except Exception:
        return [{"ticker": t, "change": _fetch_one_day_change(t), "volume": 0} for t in MOVER_CANDIDATES[:5]]

def _generate_brief(indices: dict, movers: list) -> str:
    import anthropic as _anthropic
    client = _anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    index_lines = "\n".join([f"  {t}: {v:+.2f}%" for t, v in indices.items()])
    mover_lines = "\n".join([f"  {m['ticker']}: {m['change']:+.2f}% (vol {m['volume']:,})" for m in movers])
    prompt = f"""You are a market analyst. Write a concise daily market brief in exactly 3 paragraphs based on this data:

INDEX PERFORMANCE (1-day):
{index_lines}

TOP 5 MOST ACTIVE STOCKS (1-day change):
{mover_lines}

Paragraph 1: Overall market mood. Are indices up or down, what is the tone?
Paragraph 2: Notable movers. Highlight the most interesting stocks and why they stand out.
Paragraph 3: One forward-looking insight for investors to watch in the coming sessions.

Keep each paragraph to 2-3 sentences. Be direct and analytical. No fluff.
IMPORTANT: Never use em dashes in your response. Use commas, colons, or rewrite sentences naturally instead."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()

@app.get("/market-brief")
def market_brief(force: bool = False):
    """Return AI-generated daily market brief, cached for 1 hour."""
    now = time.time()
    cached = _market_brief_cache.get("data")
    if not force and cached and (now - _market_brief_cache.get("ts", 0)) < _BRIEF_TTL:
        return cached

    try:
        indices = _fetch_index_data()
        movers = _fetch_top_movers()
        brief = _generate_brief(indices, movers)
        generated_at = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        result = sanitize({
            "brief": brief,
            "generated_at": generated_at,
            "indices": indices,
            "movers": movers,
        })
        _market_brief_cache["data"] = result
        _market_brief_cache["ts"] = now
        return result
    except Exception as e:
        return {"error": str(e), "brief": "", "generated_at": "", "indices": {}, "movers": []}

@app.get("/portfolio")
def portfolio(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", benchmark: str = "^GSPC"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")

    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        user_weights = np.array([w / total for w in raw])
    else:
        user_weights = None

    optimal_weights = optimize_portfolio(returns)
    active_weights = user_weights if user_weights is not None else optimal_weights

    portfolio_returns = portfolio_performance(returns, active_weights)
    growth = cumulative_returns(portfolio_returns)

    bench_ticker = benchmark if benchmark else "^GSPC"
    benchmark_data = get_data([bench_ticker], period=yf_period)
    benchmark_returns = calculate_returns(benchmark_data)
    benchmark_returns = benchmark_returns.reindex(portfolio_returns.index).dropna()
    benchmark_growth = cumulative_returns(benchmark_returns)

    _, max_dd = max_drawdown(growth)

    mean_returns = returns.mean()
    cov_matrix = returns.cov()
    frontier = []
    for _ in range(1000):
        w = np.random.random(len(tickers_list))
        w /= w.sum()
        ret = float(np.sum(mean_returns * w) * 252)
        vol = float(np.sqrt(np.dot(w.T, np.dot(cov_matrix * 252, w))))
        frontier.append({"return": ret, "volatility": vol})

    port_return = float(np.sum(mean_returns * active_weights) * 252)
    port_vol = float(np.sqrt(np.dot(active_weights.T, np.dot(cov_matrix * 252, active_weights))))

    n = 300
    return sanitize({
        "tickers": tickers_list,
        "weights": [float(w) for w in optimal_weights],
        "max_drawdown": float(max_dd),
        "growth": [float(x) for x in growth.tail(n).values],
        "benchmark": [float(x) for x in benchmark_growth.tail(n).values],
        "dates": [str(d) for d in growth.tail(n).index],
        "efficient_frontier": frontier,
        "portfolio_return": port_return,
        "portfolio_volatility": port_vol,
        "period": period,
        "benchmark_ticker": bench_ticker,
    })


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}

@app.post("/chat")
def chat(req: ChatRequest):
    reply = chat_with_claude(req.message, req.history, req.portfolio_context)
    return {"reply": reply}


@app.get("/validate-ticker")
def validate_ticker(ticker: str):
    """Check if a ticker is valid and return its name."""
    try:
        t = yf.Ticker(ticker.upper().strip())
        hist = t.history(period="5d")
        if hist.empty:
            return {"valid": False, "name": "", "ticker": ticker.upper()}
        info = t.fast_info
        name = getattr(info, 'company_name', None) or ""
        if not name:
            # Fallback: use longName from info dict
            try:
                name = t.info.get("longName", "") or t.info.get("shortName", "") or ticker.upper()
            except Exception:
                name = ticker.upper()
        return {"valid": True, "name": name, "ticker": ticker.upper()}
    except Exception:
        return {"valid": False, "name": "", "ticker": ticker.upper()}


class ImageRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"

@app.post("/parse-portfolio-image")
def parse_portfolio_image_endpoint(req: ImageRequest):
    """Parse a brokerage screenshot and return tickers + weights."""
    try:
        assets = parse_portfolio_from_image(req.image_base64, req.media_type)
        return {"assets": assets}
    except Exception as e:
        return {"assets": [], "error": str(e)}


@app.get("/drawdown")
def drawdown_series(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        active_weights = np.array([w / total for w in raw])
    else:
        active_weights = optimize_portfolio(returns)

    port_returns = portfolio_performance(returns, active_weights)
    growth = cumulative_returns(port_returns)
    drawdown, _ = max_drawdown(growth)

    n = 300
    return sanitize({
        "dates": [str(d) for d in drawdown.tail(n).index],
        "drawdown": [float(x) for x in drawdown.tail(n).values],
    })


@app.get("/correlation")
def correlation(tickers: str = "AAPL,MSFT", period: str = "1y"):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)
    corr = returns.corr()
    return {
        "tickers": tickers_list,
        "matrix": corr.values.tolist(),
    }


@app.get("/montecarlo")
def monte_carlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 10000, horizon: int = 252):
    tickers_list = [t.strip() for t in tickers.split(",")]
    yf_period = PERIOD_MAP.get(period, "1y")
    data = get_data(tickers_list, period=yf_period)
    returns = calculate_returns(data)

    if weights:
        raw = [float(w) for w in weights.split(",")]
        total = sum(raw)
        active_weights = np.array([w / total for w in raw])
    else:
        active_weights = optimize_portfolio(returns)

    port_returns = portfolio_performance(returns, active_weights)
    mu = float(port_returns.mean())
    sigma = float(port_returns.std())

    paths = []
    for _ in range(simulations):
        daily = np.random.normal(mu, sigma, horizon)
        path = list(np.cumprod(1 + daily))
        paths.append(path)

    paths_arr = np.array(paths)
    p5  = np.percentile(paths_arr, 5,  axis=0).tolist()
    p25 = np.percentile(paths_arr, 25, axis=0).tolist()
    p50 = np.percentile(paths_arr, 50, axis=0).tolist()
    p75 = np.percentile(paths_arr, 75, axis=0).tolist()
    p95 = np.percentile(paths_arr, 95, axis=0).tolist()

    sample_indices = np.random.choice(simulations, min(20, simulations), replace=False)
    sample_paths = paths_arr[sample_indices].tolist()

    return {
        "horizon": horizon,
        "simulations": simulations,
        "p5": p5, "p25": p25, "p50": p50, "p75": p75, "p95": p95,
        "sample_paths": sample_paths,
        "final_p5":  float(paths_arr[:, -1].min()),
        "final_p50": float(np.median(paths_arr[:, -1])),
        "final_p95": float(paths_arr[:, -1].max()),
    }


@app.get("/news")
def news(tickers: str = "AAPL"):
    tickers_list = [t.strip() for t in tickers.split(",")][:6]
    results = []
    for ticker in tickers_list:
        try:
            t = yf.Ticker(ticker)
            raw_news = t.news or []
            for item in raw_news[:3]:
                content = item.get("content", {})
                title = content.get("title", "") or item.get("title", "")
                summary = content.get("summary", "") or item.get("summary", "")
                provider = (content.get("provider", {}) or {}).get("displayName", "") or item.get("publisher", "")
                pub_date = content.get("pubDate", "") or str(item.get("providerPublishTime", ""))
                url = ""
                click_through = content.get("clickThroughUrl", {}) or {}
                if isinstance(click_through, dict):
                    url = click_through.get("url", "")
                if not url:
                    canonical = content.get("canonicalUrl", {}) or {}
                    if isinstance(canonical, dict):
                        url = canonical.get("url", "")
                if title:
                    results.append({
                        "ticker": ticker,
                        "title": title,
                        "summary": summary[:200] if summary else "",
                        "publisher": provider,
                        "url": url,
                        "published": pub_date,
                    })
        except Exception:
            pass
    return {"articles": results}


@app.get("/search-ticker")
async def search_ticker(q: str):
    """Live search across all Yahoo Finance tickers."""
    from search import search_tickers
    results = await search_tickers(q)
    return {"results": results}


# ── CSV Import endpoint ────────────────────────────────────────────────────────

@app.post("/portfolio/import-csv")
async def import_portfolio_csv(file: UploadFile = File(...)):
    """Parse a brokerage CSV export and return tickers + normalised weights."""
    try:
        raw = await file.read()
        # Handle UTF-8 BOM from Excel/brokerage exports
        text = raw.decode("utf-8-sig")

        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not rows or not reader.fieldnames:
            return {"error": "Empty or unreadable CSV", "tickers": [], "weights": [], "detected_format": "Unknown"}

        # Normalise header names for detection (strip whitespace, uppercase)
        fieldnames = [f.strip() for f in reader.fieldnames]
        h_set = {f.upper() for f in fieldnames}
        header_map = {f.strip().upper(): f.strip() for f in reader.fieldnames}

        # ── Format detection ──────────────────────────────────────────────────
        detected_format = "Generic"
        if "SYMBOL" in h_set and "QUANTITY" in h_set and "CURRENT VALUE" in h_set:
            detected_format = "Fidelity"
        elif "SYMBOL" in h_set and "QUANTITY" in h_set and "MARKET VALUE" in h_set:
            detected_format = "Schwab"
        elif "SYMBOL" in h_set and "AVERAGE COST" in h_set and "QUANTITY" in h_set:
            detected_format = "Robinhood"

        def _float(row: dict, *keys: str):
            for key in keys:
                if key in header_map:
                    raw_val = row.get(header_map[key], "").strip().lstrip("$").replace(",", "")
                    try:
                        return float(raw_val)
                    except ValueError:
                        pass
            return None

        def _ticker(row: dict):
            for key in ("SYMBOL", "TICKER"):
                if key in header_map:
                    val = row.get(header_map[key], "").strip().upper()
                    if val:
                        return val
            return None

        # ── Row parsing ───────────────────────────────────────────────────────
        SKIP_TOKENS = {"--", "N/A", "", "CASH", "TOTAL", "PENDING", "MONEY MARKET"}
        holdings: list[dict] = []

        for row in rows:
            ticker = _ticker(row)
            if not ticker or ticker in SKIP_TOKENS:
                continue

            value: float | None = None

            if detected_format == "Fidelity":
                value = _float(row, "CURRENT VALUE")
            elif detected_format == "Schwab":
                value = _float(row, "MARKET VALUE")
            elif detected_format == "Robinhood":
                qty = _float(row, "QUANTITY")
                avg = _float(row, "AVERAGE COST")
                if qty is not None and avg is not None:
                    value = qty * avg
            else:
                # Generic: try value columns first, fall back to quantity
                value = _float(row, "VALUE", "MARKET VALUE", "CURRENT VALUE", "TOTAL VALUE", "AMOUNT")
                if value is None:
                    value = _float(row, "QUANTITY", "SHARES", "QTY")

            if value is not None and value > 0:
                holdings.append({"ticker": ticker, "value": value})

        if not holdings:
            return {"error": "No valid holdings found in the CSV. Make sure it has Symbol/Quantity/Value columns.", "tickers": [], "weights": [], "detected_format": detected_format}

        # ── Ticker validation via yfinance (batch download) ───────────────────
        ticker_list = [h["ticker"] for h in holdings]
        valid_tickers: set[str] = set()
        try:
            import pandas as _pd
            dl = yf.download(ticker_list, period="5d", auto_adjust=True, progress=False)
            if not dl.empty:
                if len(ticker_list) == 1:
                    valid_tickers = set(ticker_list)
                else:
                    close = dl["Close"] if "Close" in dl.columns else dl
                    valid_tickers = {col for col in close.columns if close[col].dropna().shape[0] > 0}
        except Exception:
            valid_tickers = set(ticker_list)  # assume valid on error

        valid = [h for h in holdings if h["ticker"] in valid_tickers]
        if not valid:
            # If none validated (e.g. market closed), fall back to all parsed holdings
            valid = holdings

        total = sum(h["value"] for h in valid)
        tickers_out = [h["ticker"] for h in valid]
        weights_out = [round(h["value"] / total, 6) for h in valid]

        return sanitize({"tickers": tickers_out, "weights": weights_out, "detected_format": detected_format})

    except Exception as exc:
        return {"error": str(exc), "tickers": [], "weights": [], "detected_format": "Unknown"}


# ── Referrals ─────────────────────────────────────────────────────────────────

BONUS_PER_REFERRAL = 5
BONUS_CAP = 40

def _mask_email(email: str) -> str:
    if "@" not in email:
        return email
    local, domain = email.split("@", 1)
    return local[0] + "***@" + domain

@app.get("/referrals")
def get_referrals(user_id: str):
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    referral_link = f"https://corvo.capital/app?ref={user_id}"

    if not supabase_url or not supabase_key:
        return {"referral_count": 0, "bonus_messages_earned": 0, "referral_link": referral_link, "referred_emails": []}

    try:
        r = _requests.get(
            f"{supabase_url}/rest/v1/referrals",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
            params={"referrer_id": f"eq.{user_id}", "select": "referred_email,completed"},
            timeout=10,
        )
        r.raise_for_status()
        rows = r.json()
        completed_count = sum(1 for row in rows if row.get("completed"))
        bonus = min(completed_count * BONUS_PER_REFERRAL, BONUS_CAP)
        return {
            "referral_count": completed_count,
            "bonus_messages_earned": bonus,
            "referral_link": referral_link,
            "referred_emails": [_mask_email(row["referred_email"]) for row in rows],
        }
    except Exception as e:
        print(f"[referrals] error: {e}")
        return {"referral_count": 0, "bonus_messages_earned": 0, "referral_link": referral_link, "referred_emails": []}


# ── Email endpoints ────────────────────────────────────────────────────────────

from pydantic import BaseModel

class WelcomeEmailRequest(BaseModel):
    email: str

RESEND_FROM = "Corvo <hello@corvo.capital>"

@app.post("/send-welcome-email")
def send_welcome_email(req: WelcomeEmailRequest):
    """Send a welcome email via Resend."""
    print(f"[send-welcome-email] called for {req.email}")
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        print("[send-welcome-email] RESEND_API_KEY not set, skipping")
        return {"ok": True, "skipped": True}
    try:
        r = _requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": RESEND_FROM, "to": [req.email], "subject": "Welcome to Corvo", "html": "<p>Welcome to Corvo, your portfolio intelligence platform.</p>"},
            timeout=10,
        )
        r.raise_for_status()
        print(f"[send-welcome-email] sent OK to {req.email}")
        return {"ok": True}
    except Exception as e:
        print(f"[send-welcome-email] FAILED: {e}")
        return {"ok": False, "error": str(e)}


@app.get("/test-email")
def test_email(email: str = ""):
    """Debug endpoint: send a test email via Resend and return the result."""
    import traceback
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        return {"ok": False, "error": "RESEND_API_KEY not configured", "hint": "Set RESEND_API_KEY in Railway environment variables"}
    target = email or os.environ.get("TEST_EMAIL_TO", "")
    if not target:
        return {"ok": False, "error": "Provide ?email=you@example.com"}
    print(f"[test-email] sending to {target}")
    try:
        r = _requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": RESEND_FROM, "to": [target], "subject": "Corvo: Test Email", "html": "<p>Corvo test email. Resend is working.</p>"},
            timeout=10,
        )
        data = r.json()
        if r.status_code in (200, 201):
            print(f"[test-email] sent OK id={data.get('id')}")
            return {"ok": True, "sent_to": target, "resend_id": data.get("id")}
        print(f"[test-email] Resend error {r.status_code}: {data}")
        return {"ok": False, "status": r.status_code, "error": data}
    except Exception:
        tb = traceback.format_exc()
        print(f"[test-email] FAILED:\n{tb}")
        return {"ok": False, "error": tb}

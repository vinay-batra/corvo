from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

SUPABASE_URL      = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Startup env check — visible in Railway logs
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

app = FastAPI(title="Corvo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
def root():
    return {"status": "ok", "service": "Corvo API"}


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


@app.get("/portfolio")
def portfolio(
    request: Request,
    tickers: str = "AAPL,MSFT",
    weights: str = "",
    period: str = "1y",
    benchmark: str = "^GSPC",
    user_id: str = "",
    referral_code: str = "",
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

    # Keep only requested tickers that loaded
    available = [t for t in tickers_list if t in prices.columns]
    if not available:
        raise HTTPException(status_code=500, detail="No valid ticker data returned")

    prices = prices[available].dropna()
    if prices.empty or len(prices) < 2:
        raise HTTPException(status_code=500, detail="Insufficient price data")

    # Align weights to available tickers
    avail_weights = []
    for t in available:
        idx = tickers_list.index(t) if t in tickers_list else None
        avail_weights.append(w_list[idx] if idx is not None else 1.0 / len(available))
    total_avail = sum(avail_weights)
    avail_weights = [w / total_avail for w in avail_weights]
    weights_arr = np.array(avail_weights)

    # Daily returns
    returns = prices.pct_change().dropna()
    if returns.empty:
        raise HTTPException(status_code=500, detail="Could not calculate returns")

    # Portfolio returns
    port_returns = returns[available].values @ weights_arr

    # Annualized stats (252 trading days)
    ann_return = safe_float(np.mean(port_returns) * 252)
    ann_vol = safe_float(np.std(port_returns) * np.sqrt(252))
    sharpe = safe_float((ann_return - 0.04) / ann_vol) if ann_vol > 0 else 0.0

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

    # Individual stock returns for breakdown
    individual_returns = {}
    for t in available:
        t_ret = safe_float(np.mean(returns[t].values) * 252)
        individual_returns[t] = t_ret

    return {
        "tickers": available,
        "weights": [safe_float(w) for w in avail_weights],
        "portfolio_return": ann_return,
        "portfolio_volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_dd,
        "dates": dates,
        "portfolio_cumulative": port_cum,
        "benchmark_cumulative": bench_cum,
        "individual_returns": individual_returns,
        "period": period,
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
def montecarlo(tickers: str = "AAPL,MSFT", weights: str = "", period: str = "1y", simulations: int = 300):
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

    mu = float(np.mean(port_returns))
    sigma = float(np.std(port_returns))
    horizon = 252

    np.random.seed(42)
    sims = np.random.normal(mu, sigma, (simulations, horizon))
    paths = np.cumprod(1 + sims, axis=1) - 1  # shape (sims, horizon)

    final_vals = paths[:, -1]
    p5 = float(np.percentile(final_vals, 5))
    p25 = float(np.percentile(final_vals, 25))
    p50 = float(np.percentile(final_vals, 50))
    p75 = float(np.percentile(final_vals, 75))
    p95 = float(np.percentile(final_vals, 95))

    # Percentile bands across time
    pct_bands = {
        "p5": safe_list(np.percentile(paths, 5, axis=0).tolist()),
        "p25": safe_list(np.percentile(paths, 25, axis=0).tolist()),
        "p50": safe_list(np.percentile(paths, 50, axis=0).tolist()),
        "p75": safe_list(np.percentile(paths, 75, axis=0).tolist()),
        "p95": safe_list(np.percentile(paths, 95, axis=0).tolist()),
    }

    # Sample paths (20)
    sample_paths = [safe_list(paths[i].tolist()) for i in range(min(20, simulations))]

    return {
        "horizon": horizon,
        "simulations": simulations,
        "final_p5": p5,
        "final_p25": p25,
        "final_p50": p50,
        "final_p75": p75,
        "final_p95": p95,
        "bands": pct_bands,
        "sample_paths": sample_paths,
    }


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
                # yfinance returned nothing — try Finnhub first, then RSS
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

        # Individual stock performance
        stock_perf = ""
        if ind_returns:
            stock_perf = "\n\nIndividual stock returns (annualized):\n" + "\n".join(
                f"- {t}: {r*100:+.1f}%" for t, r in ind_returns.items()
            )

        prompt = f"""You are a senior portfolio analyst at a top-tier investment firm. Write a comprehensive, professional portfolio analysis report for the following portfolio.

Portfolio: {", ".join(f"{t} ({w:.1%})" for t, w in zip(tickers, weights))}
Period: {period}
Annualized Return: {ret:.2%}
Annualized Volatility: {vol:.2%}
Sharpe Ratio: {sharpe:.2f}
Max Drawdown: {dd:.2%}{stock_perf}{goals_text}

Write a full analysis report with these sections:

## Executive Summary
A 2-3 sentence overview of portfolio performance and key takeaway.

## Performance Analysis
Detailed analysis of returns vs risk. Comment on whether the return justifies the volatility. Reference specific numbers.

## Risk Assessment
Analyze the volatility and max drawdown. What does this mean for the investor? Is this portfolio suitable for their risk tolerance?

## Portfolio Composition Analysis
Analyze the allocation. Is it well-diversified? Are there concentration risks? Comment on individual holdings if performance data is available.

## Strengths
3-4 bullet points of what this portfolio does well.

## Areas for Improvement
3-4 bullet points of specific actionable improvements.

## Conclusion
A clear, direct recommendation. Should the investor hold, rebalance, or make changes?

Write in a professional but accessible tone. Be specific — reference actual numbers throughout. Use bullet points (- item) for lists. Keep it thorough but concise — aim for 500-700 words total. Do not include any disclaimers or caveats within the analysis itself."""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return {"analysis": response.content[0].text}
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


class ChatRequest(BaseModel):
    message: str
    history: list = []
    portfolio_context: dict = {}
    user_goals: dict = {}
    market_context: str = ""
    user_id: str | None = None


@app.post("/chat")
def chat(req: ChatRequest, request: Request):
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
            investor_profile = "\n\nINVESTOR PROFILE (from onboarding — always consider this in your answers):\n" + "\n".join(f"• {l}" for l in profile_lines)

        benchmark_text = f"\n- Benchmark Return: {benchmark_return:.2%}" if benchmark_return is not None else ""
        health_text = f"\n- Portfolio Health Score: {health_score}/100" if health_score is not None else ""
        market_text = f"\n\nREAL-TIME MARKET PRICES (fetched seconds ago):\n{req.market_context}" if req.market_context else ""

        system = f"""You are Corvo AI, a personal portfolio analyst who knows this investor deeply. You have their full financial profile from onboarding and always tailor advice specifically to their situation — their age, goals, risk tolerance, and timeline.

CURRENT PORTFOLIO:
- Holdings: {', '.join(f"{t} ({w:.1%})" for t, w in zip(tickers, weights)) if tickers else "Not yet analyzed"}
- Annualized Return: {ret:.2%}
- Annualized Volatility: {vol:.2%}
- Sharpe Ratio: {sharpe:.2f}
- Max Drawdown: {dd:.2%}
- Period: {period}{benchmark_text}{health_text}{market_text}{investor_profile}

RESPONSE RULES:
• Be concise and direct — max 180 words
• Use bullet points (•) for lists
• Always reference specific numbers from the portfolio
• When the investor has a profile, reference their goals/age/timeline in your answer
• If they ask about risk, factor in their stated risk tolerance
• Plain text only — no markdown headers or bold"""

        messages = [{"role": h["role"], "content": h["content"]} for h in req.history]
        messages.append({"role": "user", "content": req.message})

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=600,
            system=system,
            messages=messages,
        )
        reply = response.content[0].text
        # Record usage for daily limit tracking
        if req.user_id:
            insert_chat_usage(req.user_id)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GenerateQuestionsRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    count: int = 5
    previously_wrong: list[str] = []


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

    system = "You are a financial education expert. Return ONLY valid JSON, no other text, no markdown fences."
    prompt = (
        f"Generate {count} multiple choice questions about {req.topic} at {req.difficulty} level."
        f"{wrong_clause} "
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
        ("&#x1F393;", "Financial Education", "Lessons, quizzes, and mini-games that teach real investing concepts &mdash; with XP and leaderboards."),
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
        print("[send-welcome-email] RESEND_API_KEY not set — skipping")
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

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName") or ticker,
            "current_price": round(current_price, 4),
            "change": round(change, 4),
            "change_pct": round(change_pct, 4),
            "market_cap": si("marketCap", 0),
            "pe_ratio": si("trailingPE", None),
            "forward_pe": si("forwardPE", None),
            "eps": si("trailingEps", None),
            "dividend_yield": si("dividendYield", None),
            "week52_high": si("fiftyTwoWeekHigh", None),
            "week52_low": si("fiftyTwoWeekLow", None),
            "volume": si("volume", 0),
            "avg_volume": si("averageVolume", 0),
            "beta": si("beta", None),
            "price_to_book": si("priceToBook", None),
            "revenue": si("totalRevenue", None),
            "net_income": si("netIncomeToCommon", None),
            "analyst_rating": analyst_rating,
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "chart_1d": chart_1d,
        }
    except Exception as e:
        print(f"Stock detail error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stock/{ticker}/history")
def stock_history(ticker: str, period: str = "1y", request: Request = None):
    """OHLC history for charting — 1D/1W/1M/3M/1Y/5Y."""
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
            return {"dates": [], "prices": []}
        return {
            "dates": [str(ts) for ts in hist.index],
            "prices": safe_list(hist["Close"].tolist()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_stats_cache: dict = {"user_count": 847, "ts": 0.0}

@app.get("/stats")
def platform_stats():
    """Return platform-level stats — user count from Supabase, cached 1 hour."""
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

            # 7-day sparkline (daily closes)
            hist = t.history(period="7d", interval="1d")
            sparkline = [safe_float(row["Close"]) for _, row in hist.iterrows()] if not hist.empty else []

            results.append({
                "ticker": ticker,
                "name": name,
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "sparkline": sparkline,
            })
        except Exception as e:
            results.append({"ticker": ticker, "name": ticker, "price": None, "change": None, "change_pct": None, "sparkline": [], "error": str(e)})
    return {"results": results}


@app.get("/test-email")
def test_email(email: str = ""):
    """Debug endpoint — send a test email via Resend and return the result."""
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
                "subject": "Corvo — Test Email",
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
  <title>Unsubscribed — Corvo</title>
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

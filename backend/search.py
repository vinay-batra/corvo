import httpx

async def search_tickers(query: str) -> list:
    """Search Yahoo Finance for tickers matching the query."""
    if not query or len(query) < 1:
        return []
    try:
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query,
            "quotesCount": 8,
            "newsCount": 0,
            "listsCount": 0,
            "enableFuzzyQuery": False,
            "enableCb": False,
        }
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, params=params, headers=headers)
            data = res.json()
        results = []
        for q in data.get("quotes", []):
            ticker = q.get("symbol", "")
            name = q.get("longname") or q.get("shortname") or ""
            exchange = q.get("exchDisp", "")
            qtype = q.get("quoteType", "")
            if ticker and name:
                results.append({
                    "ticker": ticker,
                    "name": name,
                    "exchange": exchange,
                    "type": qtype,
                })
        return results
    except Exception:
        return []

import anthropic

client = anthropic.Anthropic(api_key="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")

def build_system_prompt(portfolio_context: dict) -> str:
    tickers = portfolio_context.get("tickers", [])
    weights = portfolio_context.get("weights", [])
    ret = portfolio_context.get("portfolio_return", 0)
    vol = portfolio_context.get("portfolio_volatility", 0)
    sharpe = (ret - 0.04) / max(vol, 0.01)
    dd = portfolio_context.get("max_drawdown", 0)
    period = portfolio_context.get("period", "1y")
    return f"""You are ALPHAi, an expert AI portfolio analyst. Be concise and data-driven like a Goldman Sachs analyst.
Portfolio: {", ".join(tickers)}
Weights: {", ".join(f"{t}: {w:.1%}" for t, w in zip(tickers, weights))}
Return: {ret:.2%} | Volatility: {vol:.2%} | Sharpe: {sharpe:.2f} | Max DD: {dd:.2%} | Period: {period}
Answer in under 150 words. Plain text only. No markdown."""

def chat_with_claude(message: str, history: list, portfolio_context: dict) -> str:
    messages = [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": message})
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        system=build_system_prompt(portfolio_context),
        messages=messages,
    )
    return response.content[0].text


def parse_portfolio_from_image(image_base64: str, media_type: str) -> list:
    """Use Claude Vision to extract tickers and weights from a brokerage screenshot."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64,
                    }
                },
                {
                    "type": "text",
                    "text": """Look at this brokerage/portfolio screenshot. Extract all stock tickers and their portfolio weights/percentages.

Return ONLY a JSON array like this, nothing else:
[{"ticker": "AAPL", "weight": 0.35}, {"ticker": "MSFT", "weight": 0.25}]

Rules:
- ticker: the stock symbol in uppercase (e.g. AAPL, MSFT, BTC-USD, VOO)
- weight: the percentage as a decimal (25% = 0.25)
- If you see dollar amounts but no percentages, estimate weights proportionally
- For crypto, use the yfinance format: BTC-USD, ETH-USD, SOL-USD
- Skip cash, options, or anything that's not a stock/ETF/crypto
- If weights don't add to 1.0, normalize them
- Return ONLY the JSON array, no explanation"""
                }
            ]
        }]
    )
    import json, re
    text = response.content[0].text.strip()
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return []

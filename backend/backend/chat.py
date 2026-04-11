import anthropic

import os
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

def build_system_prompt(portfolio_context: dict) -> str:
    goals = portfolio_context.get("user_goals") or {}

    goals_section = ""
    if goals and goals.get("age"):
        risk_map = {
            "conservative": "Conservative (prefers stability over growth)",
            "moderate": "Moderate (comfortable with some volatility)",
            "aggressive": "Aggressive (willing to accept large swings for growth)",
            "yolo": "High Risk / High Reward (crypto, growth stocks)",
            "short_time": "Short-term (under 5 years)",
            "medium_time": "Medium-term (5-15 years)",
            "long_time": "Long-term (15-30 years)",
            "verylong_time": "Very long-term (30+ years)",
        }
        goal_map = {
            "retirement": "Retire comfortably",
            "wealth": "Build long-term wealth",
            "income": "Generate passive income",
            "house": "Save for a big purchase",
            "learn": "Learn investing",
        }
        goals_section = f"""
USER PROFILE:
- Age: {goals.get('age')}
- Annual Salary: ${goals.get('salary', 'not provided')}
- Amount Invested: ${goals.get('invested', 'not provided')}
- Monthly Contribution: ${goals.get('monthly_contribution', 'not provided')}
- Retirement Age Goal: {goals.get('retirement_age', 65)}
- Risk Tolerance: {risk_map.get(goals.get('riskTolerance', ''), goals.get('riskTolerance', 'not provided'))}
- Primary Goal: {goal_map.get(goals.get('goal', ''), goals.get('goal', 'not provided'))}

Years until retirement: {int(goals.get('retirement_age', 65)) - int(goals.get('age', 30))} years

IMPORTANT: Tailor ALL advice to this specific user's age, goals, risk tolerance, and financial situation. Reference their profile when relevant.
"""

    tickers = portfolio_context.get("tickers", [])
    weights = portfolio_context.get("weights", [])
    ret = portfolio_context.get("portfolio_return", 0)
    vol = portfolio_context.get("portfolio_volatility", 0)
    dd = portfolio_context.get("max_drawdown", 0)
    sharpe = (ret - 0.04) / vol if vol > 0 else 0

    holdings = ""
    if tickers and weights:
        holdings = "\n".join([f"  - {t}: {w*100:.1f}%" for t, w in zip(tickers, weights)])

    return f"""You are ALPHAi, a sharp, concise portfolio analyst. You give direct, actionable advice.
{goals_section}
CURRENT PORTFOLIO:
{holdings if holdings else "  No holdings data"}

PORTFOLIO METRICS:
- Return: {ret*100:.2f}%
- Volatility: {vol*100:.2f}%
- Sharpe Ratio: {sharpe:.2f}
- Max Drawdown: {dd*100:.2f}%
- Period: {portfolio_context.get('period', '1y')}

RESPONSE RULES (CRITICAL):
1. Be concise. Max 150 words unless a detailed breakdown is explicitly requested.
2. Use bullet points for lists. Never write walls of text.
3. Use ** for section headers if needed (e.g., **Risk Assessment**)
4. Lead with the most important insight first.
5. End with one clear, specific action recommendation.
6. Reference the user's age/goals when relevant (e.g., "At 28 with 37 years until retirement...")
7. Never repeat the question back. Just answer it.
8. Never use em dashes (the character —) in your response. Use commas, colons, or rewrite naturally.
"""

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
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": image_base64}
                },
                {
                    "type": "text",
                    "text": "Extract all stock/ETF holdings from this brokerage screenshot. Return ONLY a JSON array like: [{\"ticker\": \"AAPL\", \"weight\": 0.25}]. Use the percentage allocations as weights (0-1). If no percentages, distribute equally. Return only the JSON array, nothing else."
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

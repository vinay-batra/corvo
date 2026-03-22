# New endpoint to add to main.py

@app.get("/validate-ticker")
def validate_ticker(ticker: str):
    """Check if a ticker is valid and return its name."""
    try:
        t = yf.Ticker(ticker.upper().strip())
        info = t.fast_info
        # Try to get a price to confirm it exists
        hist = t.history(period="5d")
        if hist.empty:
            return {"valid": False, "name": ""}
        name = getattr(info, 'company_name', None) or ticker.upper()
        return {"valid": True, "name": name, "ticker": ticker.upper()}
    except Exception:
        return {"valid": False, "name": ""}


class ImageRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"

@app.post("/parse-portfolio-image")
def parse_portfolio_image(req: ImageRequest):
    """Parse a brokerage screenshot and return tickers + weights."""
    from chat import parse_portfolio_from_image
    try:
        assets = parse_portfolio_from_image(req.image_base64, req.media_type)
        return {"assets": assets}
    except Exception as e:
        return {"assets": [], "error": str(e)}

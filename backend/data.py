import yfinance as yf
import pandas as pd

def get_data(tickers, start="2020-01-01", period=None):
    if period:
        data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    else:
        data = yf.download(tickers, start=start, auto_adjust=True, progress=False)

    if "Adj Close" in data.columns:
        data = data["Adj Close"]
    elif "Close" in data.columns:
        data = data["Close"]

    if isinstance(data, pd.DataFrame):
        data = data.dropna(axis=1, how="all")

    return data

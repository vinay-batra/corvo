import numpy as np

def calculate_returns(data):
    return data.pct_change().dropna()

def portfolio_performance(returns, weights):
    weights = np.array(weights)
    return (returns * weights).sum(axis=1)

def cumulative_returns(returns):
    return (1 + returns).cumprod()

def max_drawdown(growth):
    rolling_max = growth.cummax()
    drawdown = (growth - rolling_max) / rolling_max
    max_dd = drawdown.min()
    return drawdown, max_dd
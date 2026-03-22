import numpy as np
import pandas as pd

def optimize_portfolio(returns, num_portfolios=5000):
    results = []
    weights_record = []

    num_assets = len(returns.columns)

    for _ in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)

        portfolio_return = np.sum(returns.mean() * weights) * 252
        portfolio_volatility = np.sqrt(
            np.dot(weights.T, np.dot(returns.cov() * 252, weights))
        )

        sharpe = portfolio_return / portfolio_volatility

        results.append((portfolio_return, portfolio_volatility, sharpe))
        weights_record.append(weights)

    results = np.array(results)

    max_sharpe_idx = np.argmax(results[:, 2])
    optimal_weights = weights_record[max_sharpe_idx]

    return optimal_weights
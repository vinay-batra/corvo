import numpy as np

def generate_portfolios(returns, num_portfolios=3000):
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

        results.append([portfolio_volatility, portfolio_return, sharpe])
        weights_record.append(weights)

    return np.array(results), weights_record
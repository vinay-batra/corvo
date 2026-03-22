from data import get_data
from portfolio import calculate_returns, portfolio_performance, cumulative_returns

tickers = ["AAPL", "MSFT"]
weights = [0.5, 0.5]

data = get_data(tickers)
returns = calculate_returns(data)

portfolio_returns = portfolio_performance(returns, weights)
growth = cumulative_returns(portfolio_returns)

print(growth.head())
import matplotlib.pyplot as plt

growth.plot(title="Portfolio Growth")
plt.show()
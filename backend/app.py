import streamlit as st
import datetime as dt
import pandas as pd
import plotly.graph_objects as go

from data import get_data
from portfolio import calculate_returns, portfolio_performance, cumulative_returns, max_drawdown
from optimizer import optimize_portfolio
from efficient_frontier import generate_portfolios

# ----------------------
# PAGE CONFIG
# ----------------------

st.set_page_config(page_title="Portfolio Intelligence", layout="wide")

# ----------------------
# CUSTOM STYLE
# ----------------------

def set_custom_style():
    st.markdown("""
    <style>
    .stApp {
        background: linear-gradient(135deg, #0f172a, #1e293b);
        color: white;
    }

    section[data-testid="stSidebar"] {
        background: #020617;
    }

    h1, h2, h3 {
        color: #e2e8f0;
    }

    div[data-testid="metric-container"] {
        background-color: #111827;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #1f2937;
    }

    .stButton>button {
        background: linear-gradient(90deg, #3b82f6, #6366f1);
        color: white;
        border-radius: 8px;
        border: none;
        padding: 0.5rem 1rem;
    }

    .stDataFrame {
        border-radius: 10px;
        overflow: hidden;
    }
    </style>
    """, unsafe_allow_html=True)

set_custom_style()

# ----------------------
# TITLE
# ----------------------

st.title("Portfolio Intelligence Platform")
st.markdown("Analyze, optimize, and visualize portfolios in real time.")

# ----------------------
# SIDEBAR
# ----------------------

st.sidebar.header("Configuration")

tickers = st.sidebar.multiselect(
    "Select Stocks",
    ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"],
    default=["AAPL", "MSFT"]
)

time_range = st.sidebar.selectbox(
    "Time Range",
    ["1 Month", "6 Months", "1 Year", "5 Years", "Max"]
)

optimize = st.sidebar.toggle("Use Optimization", value=True)

# ----------------------
# TIME LOGIC
# ----------------------

today = dt.datetime.today()

if time_range == "1 Month":
    start = today - dt.timedelta(days=30)
elif time_range == "6 Months":
    start = today - dt.timedelta(days=180)
elif time_range == "1 Year":
    start = today - dt.timedelta(days=365)
elif time_range == "5 Years":
    start = today - dt.timedelta(days=365*5)
else:
    start = "2000-01-01"

# ----------------------
# VALIDATION
# ----------------------

if len(tickers) == 0:
    st.warning("Select at least one stock")
    st.stop()

# ----------------------
# DATA
# ----------------------

with st.spinner("Loading market data..."):
    data = get_data(tickers, start=start)
    returns = calculate_returns(data)

# ----------------------
# WEIGHTS
# ----------------------

if optimize:
    weights = optimize_portfolio(returns)
else:
    weights = [1 / len(tickers)] * len(tickers)

weights_series = pd.Series(weights, index=tickers)

# ----------------------
# PORTFOLIO
# ----------------------

portfolio_returns = portfolio_performance(returns, weights)
growth = cumulative_returns(portfolio_returns)

drawdown, max_dd = max_drawdown(growth)

# Benchmark
benchmark_data = get_data(["^GSPC"], start=start)
benchmark_returns = calculate_returns(benchmark_data)
benchmark_returns = benchmark_returns.reindex(portfolio_returns.index).dropna()
benchmark_growth = cumulative_returns(benchmark_returns)

# ----------------------
# KPIs
# ----------------------

col1, col2, col3 = st.columns(3)

col1.metric("Max Drawdown", f"{max_dd:.2%}")
col2.metric("Assets", len(tickers))
col3.metric("Time Range", time_range)

# ----------------------
# TABS
# ----------------------

tab1, tab2, tab3 = st.tabs(["Performance", "⚡ Optimization", "📊 Data"])

# ----------------------
# TAB 1: PERFORMANCE
# ----------------------

with tab1:
    st.markdown("## Portfolio Performance")

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=growth.index,
        y=growth,
        name="Portfolio",
        line=dict(width=3)
    ))

    fig.add_trace(go.Scatter(
        x=benchmark_growth.index,
        y=benchmark_growth.squeeze(),
        name="S&P 500",
        line=dict(dash="dash")
    ))

    fig.update_layout(
        template="plotly_dark",
        height=500,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)"
    )

    st.plotly_chart(fig, use_container_width=True)

    st.markdown("## Drawdown")

    dd_fig = go.Figure()

    dd_fig.add_trace(go.Scatter(
        x=drawdown.index,
        y=drawdown,
        fill='tozeroy',
        name="Drawdown"
    ))

    dd_fig.update_layout(
        template="plotly_dark",
        height=400,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)"
    )

    st.plotly_chart(dd_fig, use_container_width=True)

# ----------------------
# TAB 2: OPTIMIZATION
# ----------------------

with tab2:
    st.markdown("## ⚡ Efficient Frontier")

    results, _ = generate_portfolios(returns)

    ef_fig = go.Figure()

    ef_fig.add_trace(go.Scatter(
        x=results[:, 0],
        y=results[:, 1],
        mode="markers",
        marker=dict(
            color=results[:, 2],
            colorscale="Viridis",
            showscale=True,
            size=5
        )
    ))

    ef_fig.update_layout(
        template="plotly_dark",
        xaxis_title="Volatility",
        yaxis_title="Return",
        height=500,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)"
    )

    st.plotly_chart(ef_fig, use_container_width=True)

    st.markdown("## 📦 Portfolio Weights")
    st.dataframe(weights_series)

# ----------------------
# TAB 3: DATA
# ----------------------

with tab3:
    st.markdown("## Recent Data")
    st.dataframe(data.tail())

    csv = data.to_csv().encode("utf-8")

    st.download_button(
        label="Download CSV",
        data=csv,
        file_name="portfolio_data.csv",
        mime="text/csv"
    )
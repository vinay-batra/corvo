import type { Metadata } from "next";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";
import FeedbackButton from "../../../components/FeedbackButton";

export const metadata: Metadata = {
  title: "How Corvo Calculates Your Sharpe Ratio | Corvo Blog",
  description: "We use a live risk-free rate pulled from the 3-month T-bill, not a hardcoded number. Here is exactly how the math works.",
  keywords: ["sharpe ratio calculation", "risk-free rate", "T-bill yield", "portfolio analytics", "corvo sharpe"],
  openGraph: {
    title: "How Corvo Calculates Your Sharpe Ratio",
    description: "We use a live risk-free rate pulled from the 3-month T-bill, not a hardcoded number. Here is exactly how the math works.",
    url: "https://corvo.capital/blog/how-corvo-calculates-sharpe-ratio",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-04-17",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Corvo Calculates Your Sharpe Ratio",
    description: "Live risk-free rate from the 3-month T-bill. Here is exactly how the math works.",
  },
};

const TOC: TocItem[] = [
  { id: "the-formula", title: "The Formula" },
  { id: "why-risk-free-rate-matters", title: "Why the Risk-Free Rate Matters" },
  { id: "live-irx-data", title: "How Corvo Pulls Live Rate Data" },
  { id: "good-vs-bad", title: "Good vs Bad Sharpe Ratios" },
  { id: "comparing-portfolios", title: "Comparing Two Portfolios" },
];

const RELATED: RelatedPost[] = [
  {
    slug: "how-to-calculate-sharpe-ratio",
    title: "How to Calculate Sharpe Ratio for Your Portfolio",
    category: "Education",
    categoryColor: "#8eb4c8",
    readTime: "7 min read",
    excerpt: "The most useful single number for understanding if your returns justify your risk.",
  },
  {
    slug: "bloomberg-alternative",
    title: "The Best Free Bloomberg Alternative in 2026",
    category: "Strategy",
    categoryColor: "#c9a84c",
    readTime: "5 min read",
    excerpt: "Bloomberg costs $24,000 a year. Here is what you are actually missing, and what you are not.",
  },
];

export default function HowCorvoCalculatesSharpeRatioPage() {
  return (
    <BlogPost
      title="How Corvo Calculates Your Sharpe Ratio"
      date="April 17, 2026"
      readTime="5 min read"
      category="Product"
      description="We use a live risk-free rate pulled from the 3-month T-bill, not a hardcoded number. Here is exactly how the math works."
      toc={TOC}
      related={RELATED}
    >
      <p>
        Most tools that show you a Sharpe ratio use a hardcoded risk-free rate. Corvo does not. Here
        is exactly how the calculation works and why it matters.
      </p>

      <h2 id="the-formula">The Formula</h2>
      <p>
        The Sharpe ratio is: (Portfolio Return - Risk-Free Rate) / Portfolio Volatility.
      </p>
      <p>
        Each piece of this matters. The portfolio return is your annualized return over the selected
        time period, calculated from the daily price history of each holding weighted by your
        allocation. The denominator is your annualized volatility, measured as the standard deviation
        of daily returns scaled to an annual figure using the square root of 252 trading days. The
        risk-free rate is where most tools cut corners.
      </p>

      <h2 id="why-risk-free-rate-matters">Why the Risk-Free Rate Matters</h2>
      <p>
        The risk-free rate is the return you could earn without taking any risk. In practice, this
        is approximated by short-term U.S. Treasury yields, specifically the 3-month T-bill.
      </p>
      <p>
        In a near-zero interest rate environment, the risk-free rate approaches 0%, which makes
        almost any positive return look good on a risk-adjusted basis. With short-term rates above
        4%, the calculation changes substantially. A portfolio returning 8% per year with a risk-free
        rate of 4.5% has an excess return of only 3.5%. The same portfolio in a 0% rate environment
        had an excess return of 8%. The Sharpe ratios are not comparable without accounting for this.
      </p>
      <p>
        Using a hardcoded rate of 2% or 3% produces a number that looks authoritative but is
        systematically wrong whenever rates have moved. Most retail tools use a fixed rate because
        it is simpler to implement. The result is Sharpe ratios that are inflated during high-rate
        environments and deflated during low-rate environments.
      </p>

      <h2 id="live-irx-data">How Corvo Pulls Live Rate Data</h2>
      <p>
        Corvo pulls the current 3-month T-bill yield using the ^IRX ticker via yfinance. This gives
        a real-time approximation of the risk-free rate that reflects actual market conditions at
        the time of your analysis. The ^IRX ticker tracks the annualized yield of 3-month U.S.
        Treasury bills, which is the standard proxy for the risk-free rate in academic and
        institutional finance.
      </p>
      <p>
        The rate is fetched as part of each analysis run. If the live rate is unavailable due to
        a data outage, Corvo falls back to a conservative estimate based on recent historical values.
        In normal conditions, your Sharpe ratio reflects the actual current cost of holding risk
        assets instead of parking cash in risk-free instruments.
      </p>

      <h2 id="good-vs-bad">Good vs Bad Sharpe Ratios</h2>
      <p>
        Broadly accepted thresholds for a correctly calculated Sharpe ratio:
      </p>
      <ul>
        <li><strong>Below 0.5</strong> - Poor. You are taking on meaningful volatility without adequate compensation in returns.</li>
        <li><strong>0.5 to 1.0</strong> - Adequate. Returns are somewhat justified by the risk taken.</li>
        <li><strong>1.0 to 2.0</strong> - Good. Solid risk-adjusted performance, better than most diversified indexes.</li>
        <li><strong>Above 2.0</strong> - Excellent. Rare in practice for diversified portfolios over multi-year periods.</li>
      </ul>
      <p>
        These thresholds assume a correctly calculated risk-free rate. A Sharpe ratio calculated
        with a hardcoded 0% risk-free rate will always appear better than one calculated against
        the current 4%+ T-bill yield. If you are comparing Corvo's Sharpe number against another
        tool's, verify which rate they are using before drawing conclusions.
      </p>

      <h2 id="comparing-portfolios">Comparing Two Portfolios</h2>
      <p>
        The Sharpe ratio is most useful when comparing two portfolios with different return and
        volatility profiles. Portfolio A returning 22% with a Sharpe ratio of 0.8 is not
        necessarily better than Portfolio B returning 14% with a Sharpe ratio of 1.4. The second
        portfolio generated better returns per unit of risk, which means it is more efficient at
        converting volatility into returns.
      </p>
      <p>
        This is what Corvo's benchmark comparison is designed to show: not just whether you beat
        the index, but whether you did so at a reasonable cost in volatility. Beating the S&P 500
        by 3% while taking on twice the volatility is not a win. Matching the S&P 500 with half
        the volatility is.
      </p>

      <FeedbackButton />
    </BlogPost>
  );
}

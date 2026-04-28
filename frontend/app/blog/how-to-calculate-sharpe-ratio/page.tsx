import type { Metadata } from "next";
import Link from "next/link";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";

export const metadata: Metadata = {
  title: "How to Calculate Sharpe Ratio for Your Portfolio (And Why It Matters) | Corvo Blog",
  description: "The Sharpe ratio is the single most useful number for understanding if your returns are worth the risk you are taking. Learn the formula, what good looks like, and real examples.",
  keywords: ["how to calculate sharpe ratio portfolio", "sharpe ratio formula", "sharpe ratio explained", "risk adjusted return"],
  openGraph: {
    title: "How to Calculate Sharpe Ratio for Your Portfolio",
    description: "The Sharpe ratio tells you if your returns are worth the risk. Here is the formula, examples, and how to interpret your number.",
    url: "https://corvo.capital/blog/how-to-calculate-sharpe-ratio",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-04-05",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Calculate Sharpe Ratio for Your Portfolio",
    description: "The most useful single number for understanding if your returns justify your risk.",
  },
};

const TOC: TocItem[] = [
  { id: "what-is-sharpe", title: "What Is the Sharpe Ratio?" },
  { id: "the-formula", title: "The Formula Explained" },
  { id: "interpreting", title: "Interpreting Your Number" },
  { id: "examples", title: "Real Portfolio Examples" },
  { id: "common-mistakes", title: "Common Mistakes" },
  { id: "how-corvo-calculates", title: "How Corvo Calculates It" },
];

const RELATED: RelatedPost[] = [
  {
    slug: "portfolio-diversification-guide",
    title: "The Complete Guide to Portfolio Diversification in 2026",
    category: "Strategy",
    categoryColor: "#c9a84c",
    readTime: "8 min read",
    excerpt: "True diversification is about correlation, not the number of holdings. Here is how to measure it.",
  },
  {
    slug: "bloomberg-alternative",
    title: "The Best Free Bloomberg Alternative in 2026",
    category: "Strategy",
    categoryColor: "#c9a84c",
    readTime: "5 min read",
    excerpt: "Bloomberg costs $24,000 a year. Here is what retail investors actually need instead.",
  },
];

export default function SharpeRatioPage() {
  return (
    <BlogPost
      title="How to Calculate Sharpe Ratio for Your Portfolio (And Why It Matters)"
      date="April 5, 2026"
      readTime="7 min read"
      category="Education"
      description="The Sharpe ratio is the single most useful number for understanding if your investment returns are worth the risk you are taking. Learn the formula, interpretation, and real examples."
      toc={TOC}
      related={RELATED}
    >
      <h2 id="what-is-sharpe">What Is the Sharpe Ratio?</h2>
      <p>
        The Sharpe ratio is the most widely used measure of risk-adjusted investment performance. Developed
        by Nobel laureate William Sharpe in 1966, it answers a deceptively simple question: for every unit
        of risk you are taking, how much return are you getting?
      </p>
      <p>
        Two portfolios can both return 15% in a year. But if one achieves that return with wild 30% swings
        while the other stays steady with 10% volatility, they are not equally good. The second portfolio
        is doing more with less risk. The Sharpe ratio captures exactly that distinction and puts it into
        a single number you can track over time.
      </p>
      <p>
        Without risk adjustment, investors tend to chase whatever is generating the best raw returns, often
        taking on far more risk than they realize. The Sharpe ratio forces an honest accounting of the
        risk-return relationship.
      </p>

      <h2 id="the-formula">The Formula Explained</h2>
      <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 14, padding: "28px 36px", margin: "28px 0", textAlign: "center" as const }}>
        <p style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(14px,2.5vw,20px)", color: "#c9a84c", letterSpacing: -0.3, marginBottom: 12 }}>
          Sharpe Ratio = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub>
        </p>
        <p style={{ fontSize: 11, color: "rgba(232,224,204,0.4)", letterSpacing: 0.3 }}>
          Portfolio Return minus Risk-Free Rate, divided by Portfolio Standard Deviation
        </p>
      </div>
      <p>Breaking down each component:</p>
      <ul>
        <li>
          <strong>Portfolio Return (Rp)</strong> - your annualized return, including dividends and any
          realized gains. Using price return alone understates performance.
        </li>
        <li>
          <strong>Risk-Free Rate (Rf)</strong> - typically the yield on 3-month US Treasury bills (currently
          around 4.3-4.5%). This represents what you could earn with zero risk.
        </li>
        <li>
          <strong>Standard Deviation (σp)</strong> - the annualized volatility of your portfolio's daily
          returns. Higher volatility means a larger denominator and a lower Sharpe ratio.
        </li>
      </ul>
      <p>
        The subtraction in the numerator is the key insight. We are not measuring total return; we are measuring
        excess return above what you would get by just holding safe government bonds. If you are taking on
        investment risk, you deserve to be compensated for it. The Sharpe ratio tells you how well compensated
        you are.
      </p>

      <h2 id="interpreting">Interpreting Your Number</h2>
      <p>Raw Sharpe ratios are only meaningful in context. Here is the general interpretation framework:</p>
      <table>
        <thead>
          <tr>
            <th>Sharpe Ratio</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Below 0</td><td>Your return is worse than risk-free assets. You are taking risk for nothing.</td></tr>
          <tr><td>0 to 0.5</td><td>Below average. You may be taking too much risk relative to your return.</td></tr>
          <tr><td>0.5 to 1.0</td><td>Adequate. Broadly in line with passive index investing.</td></tr>
          <tr><td>1.0 to 2.0</td><td>Good. You are generating meaningful excess return per unit of risk.</td></tr>
          <tr><td>Above 2.0</td><td>Exceptional. Rare in real portfolios; worth scrutinizing for survivorship bias.</td></tr>
        </tbody>
      </table>
      <p>
        The S&P 500 historically achieves a Sharpe ratio of around 0.4 to 0.6 over long periods. Individual
        stocks tend to be lower because they carry more volatility without proportionally higher returns.
        Well-managed hedge funds typically target ratios above 1.0.
      </p>


      <h2 id="examples">Real Portfolio Examples</h2>
      <p>
        Numbers become intuitive through examples. Here are three hypothetical portfolios with the same
        market environment (risk-free rate of 4.3%):
      </p>
      <table>
        <thead>
          <tr>
            <th>Portfolio</th>
            <th>Annual Return</th>
            <th>Std Deviation</th>
            <th>Sharpe Ratio</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>A (concentrated tech)</td><td>14%</td><td>28%</td><td>0.35</td><td>Below average</td></tr>
          <tr><td>B (balanced 60/40)</td><td>11%</td><td>9%</td><td>0.74</td><td>Good</td></tr>
          <tr><td>C (volatile growth)</td><td>22%</td><td>42%</td><td>0.42</td><td>Below average</td></tr>
        </tbody>
      </table>
      <p>
        Portfolio B wins, even though it has the lowest absolute return. It achieves 11% efficiently. Portfolio C
        looks impressive on the surface but its volatility is so high that you are not adequately compensated
        for the risk you are taking.
      </p>
      <p>
        This is the core insight: chasing returns without accounting for risk often leads to worse risk-adjusted
        outcomes than a disciplined balanced approach. The investor in Portfolio B sleeps better, takes less
        risk, and achieves better risk-adjusted performance.
      </p>

      <h2 id="common-mistakes">Common Mistakes in Sharpe Ratio Analysis</h2>
      <h3>Using price return instead of total return</h3>
      <p>
        If your portfolio pays dividends, you need to include dividend reinvestment in your return calculation.
        Ignoring dividends understates true return and artificially lowers your Sharpe ratio.
      </p>
      <h3>Using the wrong time period for the risk-free rate</h3>
      <p>
        The risk-free rate should match the investment horizon. For short-term analysis, use the 3-month T-bill
        yield. For long-term analysis, the 10-year Treasury yield is more appropriate. Using the wrong rate
        distorts the excess return calculation.
      </p>
      <h3>Treating it as a standalone metric</h3>
      <p>
        Sharpe ratio can be manipulated. A portfolio that systematically sells far out-of-the-money options
        collects premium smoothly and looks great on Sharpe ratio, right up until it does not. Always pair
        Sharpe with maximum drawdown analysis, which captures the worst-case peak-to-trough decline.
      </p>
      <h3>Comparing across asset classes without context</h3>
      <p>
        A bond-heavy portfolio will naturally have a higher Sharpe ratio than an equity portfolio in many
        environments, simply because of lower volatility. This does not mean bonds are "better" for all
        investors. Context matters: your target return, time horizon, and tax situation all affect what
        Sharpe ratio you should be aiming for.
      </p>

      <h2 id="how-corvo-calculates">How Corvo Calculates It Automatically</h2>
      <p>
        Corvo calculates your portfolio's Sharpe ratio automatically using three inputs:
      </p>
      <ul>
        <li>Historical return data for every position, including dividends and corporate actions</li>
        <li>The current 3-month T-bill yield as the risk-free rate, updated daily</li>
        <li>Rolling 252-day standard deviation of daily portfolio returns, annualized</li>
      </ul>
      <p>
        Your portfolio Sharpe ratio appears on the Risk tab of your Corvo dashboard. The platform also
        benchmarks your ratio against the S&P 500 so you can see at a glance whether your active stock
        selection is adding value after accounting for the extra volatility you are taking on.
      </p>
      <p>
        You can also drill into individual position Sharpe ratios to identify which holdings are dragging
        down your portfolio-level efficiency. A single concentrated position with a very low Sharpe ratio
        often explains why a seemingly diversified portfolio underperforms its benchmark on a risk-adjusted basis.
      </p>

    </BlogPost>
  );
}

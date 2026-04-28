import type { Metadata } from "next";
import Link from "next/link";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";

export const metadata: Metadata = {
  title: "The Complete Guide to Portfolio Diversification in 2026 | Corvo Blog",
  description: "Most investors think they are diversified. Most are wrong. True diversification is about correlation, not the number of holdings. Learn how to measure and improve it.",
  keywords: ["portfolio diversification guide", "how to diversify portfolio", "portfolio correlation", "sector diversification", "diversification strategy"],
  openGraph: {
    title: "The Complete Guide to Portfolio Diversification in 2026",
    description: "True diversification is about correlation, not the number of holdings. Here is how to measure it properly.",
    url: "https://corvo.capital/blog/portfolio-diversification-guide",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-04-02",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Complete Guide to Portfolio Diversification in 2026",
    description: "Most investors think they are diversified. Most are wrong. Here is how to measure it properly.",
  },
};

const TOC: TocItem[] = [
  { id: "what-diversification-means", title: "What Diversification Really Means" },
  { id: "correlation", title: "Correlation: The Key Number" },
  { id: "common-mistakes", title: "Common Portfolio Mistakes" },
  { id: "sector-exposure", title: "Sector Exposure" },
  { id: "geographic-diversification", title: "Geographic Diversification" },
  { id: "how-to-measure", title: "How to Measure Your Exposure" },
  { id: "how-corvo-helps", title: "How Corvo Maps Your Risk" },
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
    slug: "monte-carlo-simulation-investing",
    title: "What is Monte Carlo Simulation and Why Should Investors Care?",
    category: "Education",
    categoryColor: "#8eb4c8",
    readTime: "6 min read",
    excerpt: "Running 8,500 simulations of your portfolio's future is the best way to understand retirement risk.",
  },
];

export default function DiversificationGuidePage() {
  return (
    <BlogPost
      title="The Complete Guide to Portfolio Diversification in 2026"
      date="April 2, 2026"
      readTime="8 min read"
      category="Strategy"
      description="Most investors think they are diversified. Most are wrong. True diversification is about correlation, not the number of holdings. Here is how to measure and improve your portfolio's risk exposure."
      toc={TOC}
      related={RELATED}
    >
      <h2 id="what-diversification-means">What Diversification Really Means</h2>
      <p>
        Everyone knows they should diversify. Few people actually do it well.
      </p>
      <p>
        The intuitive version of diversification is simple: do not put all your eggs in one basket. Spread
        your money across different stocks. But this understanding misses the point entirely. You can own
        50 different stocks and be perfectly undiversified. True diversification is not about the number
        of holdings. It is about correlation.
      </p>
      <p>
        Diversification is the only free lunch in investing. By combining assets that do not move together,
        you reduce portfolio volatility without necessarily reducing expected return. The math is elegant:
        two assets each with 20% volatility can combine into a portfolio with less than 20% volatility if
        their correlation is below 1.0.
      </p>

      <h2 id="correlation">Correlation: The Number That Changes Everything</h2>
      <p>
        Correlation measures how two assets move together. It ranges from -1 (they always move in opposite
        directions) to +1 (they always move together). A correlation of 0 means the movements are completely
        independent.
      </p>
      <p>
        For diversification, you want low or negative correlations across your holdings. Here is why:
      </p>
      <p>
        If Apple (AAPL) and Microsoft (MSFT) have a correlation of 0.82 (which is roughly true historically),
        owning both does not diversify you much. When Apple falls on bad earnings guidance, Microsoft probably
        falls too, because both are large-cap technology companies exposed to the same macro forces: interest
        rates, consumer spending, advertising cycles, and regulatory scrutiny.
      </p>
      <p>
        But if you pair Apple with TLT (long-term Treasury bonds), you get genuine risk reduction. Treasury
        bonds often rise when equities fall, particularly during risk-off events. The correlation has been
        negative in many market environments. The two assets genuinely buffer each other.
      </p>
      <p>
        The practical takeaway: when building a portfolio, adding a second tech stock is not diversifying.
        Adding an uncorrelated asset class is.
      </p>

      <h2 id="common-mistakes">Common Portfolio Mistakes</h2>
      <p>Most retail portfolios cluster in three identifiable patterns:</p>
      <h3>Sector concentration</h3>
      <p>
        The average US retail investor's portfolio is 40-60% technology. They might own Apple, Microsoft,
        Google, NVIDIA, AMD, and Meta, believing they are diversified because they own six different companies.
        But when the Federal Reserve raises rates and technology multiples compress, all six positions fall
        simultaneously. The "diversification" was illusory.
      </p>
      <h3>Market cap bias toward large-cap US tech</h3>
      <p>
        Many retail investors overweight large-cap US stocks. The S&P 500 itself is now highly concentrated
        in the top 10 holdings (over 30% of the index). A portfolio combining S&P 500 ETF plus QQQ plus
        individual tech stocks is effectively a leveraged bet on a narrow segment of the US economy. When
        that segment underperforms, there is no portfolio buffer.
      </p>
      <h3>Home country bias</h3>
      <p>
        US investors often hold 90% or more of their equity allocation in US stocks. The United States
        represents only about 60% of global market capitalization. Ignoring international markets means
        missing potential return and diversification benefits from economies with different cycles.
      </p>


      <h2 id="sector-exposure">Sector Exposure and How to Think About It</h2>
      <p>
        The right way to measure sector exposure is by the economic sensitivity of each holding, not just
        the formal GICS sector classification. A financial data company might be classified as Information
        Technology but behave more like financials during market stress.
      </p>
      <p>
        As a rough guide, here are reasonable sector weight targets for a diversified long-term portfolio:
      </p>
      <table>
        <thead>
          <tr>
            <th>Sector Group</th>
            <th>Suggested Weight</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Technology and growth</td><td>20 to 35%</td><td>Long-term compounding, but high volatility</td></tr>
          <tr><td>Defensives (utilities, staples, healthcare)</td><td>15 to 25%</td><td>Recession buffer, lower correlation to growth</td></tr>
          <tr><td>Financials</td><td>10 to 15%</td><td>Benefits from rising rates, broad economic exposure</td></tr>
          <tr><td>Real assets (REITs, commodities, energy)</td><td>10 to 20%</td><td>Inflation hedge, low correlation to nominal assets</td></tr>
          <tr><td>International equities</td><td>20 to 40%</td><td>Different economic cycles, currency diversification</td></tr>
        </tbody>
      </table>
      <p>
        These are guidelines, not rules. Your personal situation, time horizon, and risk tolerance should
        shape the actual weights. The point is that intentional sector allocation beats accidental
        concentration.
      </p>

      <h2 id="geographic-diversification">Geographic Diversification</h2>
      <p>
        International stocks provide a genuine diversification benefit not just from different companies
        but from different economic cycles. A US recession does not always coincide with European or Asian
        downturns. Japan has had periods of strong equity performance while the US struggled, and vice versa.
      </p>
      <p>
        Currency exposure adds a second layer of diversification. When the US dollar weakens, international
        holdings denominated in euros, yen, or pounds gain additional return for US-based investors. When
        the dollar strengthens, those gains reverse. This currency volatility can feel uncomfortable in the
        short term but provides meaningful diversification over long periods.
      </p>
      <p>
        Practically speaking, adding 20 to 30% international exposure via ETFs (VEA for developed markets,
        VWO for emerging markets) significantly reduces correlation to US market cycles without materially
        reducing expected long-run returns.
      </p>

      <h2 id="how-to-measure">How to Measure Your Actual Exposure</h2>
      <p>
        Knowing that you should be diversified is different from knowing whether you actually are. Here is
        how to measure it:
      </p>
      <ul>
        <li>
          <strong>Correlation matrix</strong> - a grid showing the pairwise correlation between every holding.
          Red cells indicate highly correlated pairs that are not providing diversification. Green or neutral
          cells indicate genuine portfolio offsets.
        </li>
        <li>
          <strong>Sector breakdown</strong> - what percentage of your portfolio is exposed to each economic
          sector. Most brokerage platforms show this, but they often misclassify holdings.
        </li>
        <li>
          <strong>Geographic revenue exposure</strong> - many US-listed companies derive 40 to 60% of revenue
          internationally. Looking at stock exchange listing alone overstates domestic concentration.
        </li>
        <li>
          <strong>Factor exposure</strong> - how sensitive your portfolio is to growth vs. value, momentum,
          quality, and size factors. A growth-heavy portfolio behaves differently than a value-heavy one
          in rising-rate environments.
        </li>
      </ul>

      <h2 id="how-corvo-helps">How Corvo Maps Your Exposure</h2>
      <p>
        Corvo analyzes your portfolio across four dimensions automatically:
      </p>
      <ul>
        <li>Sector allocation across all 11 GICS sectors</li>
        <li>Geographic exposure by revenue origin, not just listing location</li>
        <li>Market cap distribution across mega, large, mid, and small cap</li>
        <li>Asset class mix covering equities, fixed income, commodities, and cash equivalents</li>
      </ul>
      <p>
        The correlation heatmap in Corvo shows the pairwise correlation between every holding in your
        portfolio. Red cells highlight highly correlated pairs that are amplifying risk rather than reducing
        it. Clicking any cell shows the historical relationship over your chosen time period.
      </p>
      <p>
        The portfolio health score specifically penalizes over-concentration in any single sector, excessive
        correlation between top positions, and heavy domestic-only allocation relative to your portfolio size.
        When your health score drops, the platform explains exactly why and suggests specific adjustments.
      </p>

    </BlogPost>
  );
}

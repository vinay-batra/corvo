import type { Metadata } from "next";
import Link from "next/link";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";

export const metadata: Metadata = {
  title: "What is Monte Carlo Simulation and Why Should Investors Care? | Corvo Blog",
  description: "Monte Carlo simulation runs 300 scenarios of your portfolio's future to show you the real distribution of retirement outcomes. Here is how it works and what to do with the results.",
  keywords: ["monte carlo simulation investing", "monte carlo portfolio", "retirement simulation", "portfolio simulation", "monte carlo retirement planning"],
  openGraph: {
    title: "What is Monte Carlo Simulation and Why Should Investors Care?",
    description: "Running 300 simulations of your portfolio's future is the best way to understand your real retirement risk.",
    url: "https://corvo.capital/blog/monte-carlo-simulation-investing",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-03-28",
  },
  twitter: {
    card: "summary_large_image",
    title: "What is Monte Carlo Simulation and Why Should Investors Care?",
    description: "Running 300 simulations of your portfolio's future is the best way to understand your real retirement risk.",
  },
};

const TOC: TocItem[] = [
  { id: "what-is-monte-carlo", title: "What Is Monte Carlo Simulation?" },
  { id: "why-300-paths", title: "Why 300 Paths Matter" },
  { id: "sequence-of-returns", title: "Sequence of Returns Risk" },
  { id: "reading-results", title: "Reading Your Results" },
  { id: "probability-distribution", title: "The Probability Distribution" },
  { id: "corvo-implementation", title: "How Corvo Runs 300 Simulations" },
];

const RELATED: RelatedPost[] = [
  {
    slug: "bloomberg-alternative",
    title: "The Best Free Bloomberg Alternative in 2026",
    category: "Strategy",
    categoryColor: "#c9a84c",
    readTime: "5 min read",
    excerpt: "Bloomberg costs $24,000 a year. Here is what retail investors actually need instead.",
  },
  {
    slug: "portfolio-diversification-guide",
    title: "The Complete Guide to Portfolio Diversification in 2026",
    category: "Strategy",
    categoryColor: "#c9a84c",
    readTime: "8 min read",
    excerpt: "True diversification is about correlation, not the number of holdings.",
  },
];

export default function MonteCarloPage() {
  return (
    <BlogPost
      title="What is Monte Carlo Simulation and Why Should Investors Care?"
      date="March 28, 2026"
      readTime="6 min read"
      category="Education"
      description="Monte Carlo simulation runs hundreds of scenarios of your portfolio's future to show you the real distribution of retirement outcomes, not just a single optimistic projection."
      toc={TOC}
      related={RELATED}
    >
      <h2 id="what-is-monte-carlo">What Is Monte Carlo Simulation?</h2>
      <p>
        Monte Carlo simulation sounds intimidating. It is actually a beautifully simple idea.
      </p>
      <p>
        The name comes from the Monte Carlo casino in Monaco. Like gambling, investing involves outcomes
        that we can describe in probability terms but cannot predict precisely. Monte Carlo methods use
        random sampling to model the full range of possible outcomes, rather than pretending any single
        forecast is reliable.
      </p>
      <p>
        In investing, a Monte Carlo simulation takes your current portfolio and fast-forwards it through
        thousands of possible future scenarios. Each scenario uses randomized returns based on the historical
        characteristics of your holdings: expected return, volatility, and correlation with other positions.
      </p>
      <p>
        Run enough scenarios, and you start to see the complete distribution of possible outcomes. Not just
        "my portfolio will return 8% per year," but "there is a 90% chance my portfolio will be worth at
        least X in 20 years, and a 5% chance it reaches Y." Those probability statements are far more
        honest and useful than any single-point projection.
      </p>

      <h2 id="why-300-paths">Why 300 Paths (Not Just One) Matters</h2>
      <p>
        Financial models often project a "base case" return. Plug in 8% annual growth and extrapolate
        30 years. It looks tidy. It is misleading.
      </p>
      <p>
        The problem with a single projection is that it assumes markets deliver returns in a smooth,
        predictable sequence. Real markets do not work that way. Returns arrive in lumps, sometimes in
        violent bursts of gain followed by prolonged drawdowns. The sequence in which those returns arrive
        matters enormously for outcomes, especially when you are making regular contributions or withdrawals.
      </p>
      <p>
        Running 300 simulations, each with different randomly-ordered return sequences, captures this
        distribution of outcomes. You see worst-case scenarios, best-case scenarios, and everything in
        between. The spread of the fan chart tells you how uncertain your outcome actually is.
      </p>
      <p>
        More simulations reduce sampling error. Fewer simulations give you a noisier, less reliable
        distribution. 300 paths is a standard threshold that balances computational speed with statistical
        reliability for retail portfolio analysis.
      </p>

      <h2 id="sequence-of-returns">Sequence of Returns Risk</h2>
      <p>
        The concept that makes Monte Carlo essential for retirement planning is sequence of returns risk.
        Two investors can have the same average annual return over 20 years but radically different outcomes
        depending on when the good and bad years occur.
      </p>
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Years 1-5</th>
            <th>Years 6-20</th>
            <th>20-Year Average</th>
            <th>Likely Outcome</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Investor A (saving phase)</td><td>Poor returns</td><td>Strong returns</td><td>8%</td><td>May end up ahead</td></tr>
          <tr><td>Investor B (withdrawal phase)</td><td>Strong returns</td><td>Poor returns</td><td>8%</td><td>May run out of money</td></tr>
        </tbody>
      </table>
      <p>
        Investor B runs out of money despite having the same average return as Investor A. The reason: when
        markets fall early during a retirement withdrawal period, you are forced to sell shares at low prices
        to fund living expenses. You then have fewer shares to benefit from the eventual recovery. The damage
        is permanent in a way that early losses during a savings phase are not.
      </p>
      <p>
        A single projected return of 8% would show both investors reaching the same destination. Only Monte
        Carlo simulation reveals this critical difference in outcome.
      </p>


      <h2 id="reading-results">Reading Your Monte Carlo Results</h2>
      <p>
        When Corvo shows you Monte Carlo results, you will see a fan chart: a band of possible portfolio
        trajectories spreading out over time. Three lines stand out:
      </p>
      <ul>
        <li>
          <strong>The 90th percentile path</strong> - your portfolio trajectory if markets are unusually
          favorable. Think of this as the optimistic scenario.
        </li>
        <li>
          <strong>The 50th percentile path (median)</strong> - the middle outcome. Half of scenarios end
          above this line, half below. This is your most realistic central estimate.
        </li>
        <li>
          <strong>The 10th percentile path</strong> - what happens if markets are unkind. This is your
          stress test scenario.
        </li>
      </ul>
      <p>
        The gap between the 90th and 10th percentile lines tells you something important: the wider the
        fan, the more uncertainty in your outcome. A portfolio of volatile growth stocks will have a very
        wide fan. A portfolio heavy in bonds will have a narrower fan with a lower median.
      </p>
      <p>
        The critical insight for most investors: focus more attention on the 10th percentile than the
        90th percentile. Retirement planning should be stress-tested against the pessimistic scenario.
        If you run out of money in that scenario, your allocation needs adjustment. Counting on the optimistic
        scenario is not a plan; it is hope.
      </p>

      <h2 id="probability-distribution">The Probability Distribution</h2>
      <p>
        Beyond the fan chart, Monte Carlo simulation generates probability statements at specific time
        horizons. These are the numbers that change how investors think about their plans:
      </p>
      <ul>
        <li>Probability that your portfolio reaches your retirement target by a specific age</li>
        <li>Median portfolio value at retirement under realistic conditions</li>
        <li>Value at risk: the portfolio loss you might experience in the worst 10% of scenarios</li>
        <li>Probability of portfolio depletion within a 30-year retirement period</li>
      </ul>
      <p>
        These probability statements force honest conversations about risk tolerance. An investor who says
        "I can handle volatility" often changes that view when they see a specific scenario that depletes
        their retirement savings within 15 years of stopping work.
      </p>
      <p>
        The power of seeing a real probability distribution is that it makes the trade-offs concrete. Moving
        from an 80/20 equity/bond allocation to 60/40 narrows the fan chart and shifts the median lower,
        but significantly improves the worst-case outcome. Seeing that trade-off visually is the fastest
        way to understand your own risk tolerance in practical terms.
      </p>

      <h2 id="corvo-implementation">How Corvo Runs 300 Simulations</h2>
      <p>
        Corvo's Monte Carlo engine works in four steps:
      </p>
      <h3>Step 1: Historical calibration</h3>
      <p>
        For every holding in your portfolio, Corvo analyzes the historical return distribution: expected
        annual return, annualized volatility, and pairwise correlation with every other holding. This
        calibration uses the last three years of daily return data by default, adjustable to five or
        ten years.
      </p>
      <h3>Step 2: Correlated random paths</h3>
      <p>
        Corvo generates 300 sets of annual returns using the Cholesky decomposition of the correlation
        matrix. This technical step preserves the realistic relationships between your holdings: tech stocks
        and Treasury bonds do not suddenly become independent in the simulation. If they historically move
        together, they move together in the model too.
      </p>
      <h3>Step 3: Portfolio construction</h3>
      <p>
        Each of the 300 paths applies your specific position weights, rebalancing assumptions, and any
        contribution or withdrawal schedule you have set. An investor who contributes $1,000 per month gets
        a different simulation than one who is drawing down $3,000 per month in retirement.
      </p>
      <h3>Step 4: Distribution analysis</h3>
      <p>
        Corvo compiles the 300 portfolio outcomes into the probability distribution you see in the chart.
        The full simulation runs in seconds. You can immediately adjust your allocation or contribution
        schedule and see how it shifts the distribution, making the trade-offs between risk and outcome
        instantly visible.
      </p>

    </BlogPost>
  );
}

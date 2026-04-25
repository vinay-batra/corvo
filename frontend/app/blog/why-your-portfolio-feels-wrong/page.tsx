import type { Metadata } from "next";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";
import FeedbackButton from "../../../components/FeedbackButton";

export const metadata: Metadata = {
  title: "Why Your Portfolio Feels Wrong Even When the Numbers Look Right | Corvo Blog",
  description: "Market volatility messes with your perception. Here is how to read your portfolio data without letting short-term noise drive long-term decisions.",
  keywords: ["portfolio volatility", "max drawdown", "sharpe ratio", "benchmark comparison", "investing psychology"],
  openGraph: {
    title: "Why Your Portfolio Feels Wrong Even When the Numbers Look Right",
    description: "Market volatility messes with your perception. Here is how to read your portfolio data without letting short-term noise drive long-term decisions.",
    url: "https://corvo.capital/blog/why-your-portfolio-feels-wrong",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-04-10",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Your Portfolio Feels Wrong Even When the Numbers Look Right",
    description: "Market volatility messes with your perception. Here is how to read your data without letting noise drive decisions.",
  },
};

const TOC: TocItem[] = [
  { id: "volatility-and-perception", title: "How Volatility Warps Perception" },
  { id: "max-drawdown-matters", title: "Why Max Drawdown Matters More Than Daily Swings" },
  { id: "sharpe-ratio-context", title: "Sharpe Ratio Gives Context to Returns" },
  { id: "benchmark-comparison", title: "Why You Need a Benchmark" },
  { id: "practical-takeaway", title: "Practical Takeaway" },
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
    slug: "what-the-vix-tells-you",
    title: "What the VIX Actually Tells You About Your Portfolio",
    category: "Markets",
    categoryColor: "#5cb88a",
    readTime: "4 min read",
    excerpt: "The VIX is not a fear gauge. It is a volatility forecast, and knowing the difference matters.",
  },
];

export default function WhyPortfolioFeelsWrongPage() {
  return (
    <BlogPost
      title="Why Your Portfolio Feels Wrong Even When the Numbers Look Right"
      date="April 10, 2026"
      readTime="5 min read"
      category="Markets"
      description="Market volatility messes with your perception. Here is how to read your portfolio data without letting short-term noise drive long-term decisions."
      toc={TOC}
      related={RELATED}
    >
      <p>
        Your portfolio returned 18% last year. You still feel uneasy. This is not a psychology problem.
        It is a data problem.
      </p>
      <p>
        Market volatility creates a distorted signal. When prices swing 3% in a day, your brain logs
        that as meaningful. When your portfolio recovers the next week, you feel relieved rather than
        indifferent. Over time, this creates a gap between what your portfolio is actually doing and
        how it feels to hold it.
      </p>

      <h2 id="volatility-and-perception">How Volatility Warps Perception</h2>
      <p>
        Daily and weekly price movements are mostly noise. A stock falling 4% on a Tuesday because of
        macroeconomic uncertainty and then recovering by Friday has told you almost nothing about its
        long-term value. But it has triggered two stress responses.
      </p>
      <p>
        The problem is that emotional responses to volatility compound. After enough negative days, many
        investors make changes to their portfolio not because the fundamentals changed, but because the
        discomfort became too much. These changes almost always happen at the worst possible time: near
        the bottom, before the recovery.
      </p>
      <p>
        The antidote is not willpower. It is better data. When you can see that your portfolio's
        annualized return is solid, its Sharpe ratio is above 1.0, and its current drawdown is within
        historical norms, the day-to-day noise becomes easier to ignore.
      </p>

      <h2 id="max-drawdown-matters">Why Max Drawdown Matters More Than Daily Swings</h2>
      <p>
        Max drawdown measures the largest peak-to-trough decline your portfolio experienced over a given
        period. This is the number that actually tests your tolerance for holding through a rough stretch.
      </p>
      <p>
        If your portfolio returned 22% over five years but hit a max drawdown of -38% somewhere in that
        period, you lived through a moment where nearly 40% of your value had disappeared on paper. Most
        investors who abandoned their strategy during that period did not get back in before the recovery.
        They locked in the loss and missed the rebound.
      </p>
      <p>
        Knowing your historical max drawdown before it happens lets you size your positions and build a
        portfolio you can actually hold through the bad periods. A portfolio with a 15% max drawdown is
        easier to hold than one with a 40% max drawdown, even if the total return is the same. The path
        matters because humans have to live on the path.
      </p>

      <h2 id="sharpe-ratio-context">Sharpe Ratio Gives Context to Returns</h2>
      <p>
        An 18% return looks good in isolation. But if the market returned 24% and you took on 50% more
        volatility to get there, your 18% is a bad outcome. The Sharpe ratio captures exactly this:
        your returns relative to the risk you took to earn them.
      </p>
      <p>
        A Sharpe ratio above 1.0 is generally considered solid. Above 2.0 is excellent and rare over
        multi-year periods. If your portfolio has a Sharpe ratio below 0.5, you are accepting too much
        volatility for the returns you are generating, which is another way of saying the discomfort you
        feel is not being adequately compensated.
      </p>
      <p>
        This is why a portfolio that feels wrong often has a low Sharpe ratio. The volatility is real.
        The returns are not keeping pace with it.
      </p>

      <h2 id="benchmark-comparison">Why You Need a Benchmark</h2>
      <p>
        Without a benchmark, every number is meaningless. Your portfolio returned 15%? Compared to what?
        The S&P 500 returned 26% in 2023. Matching the market is not failure, but believing you are
        beating it when you are not is a problem that compounds over time.
      </p>
      <p>
        Pick a benchmark that matches your actual risk profile and compare consistently over the same
        time period. For most retail investors, that is the S&P 500 or a total market index. For a
        more conservative portfolio with bonds and defensive positions, a blended benchmark is more
        appropriate.
      </p>
      <p>
        The benchmark does not tell you what to do. It tells you whether what you are doing is working
        relative to the simplest available alternative.
      </p>

      <h2 id="practical-takeaway">Practical Takeaway</h2>
      <p>
        Before making any changes to your portfolio based on how it feels, check three numbers: max
        drawdown, Sharpe ratio, and benchmark comparison. If all three are within acceptable ranges,
        what you are experiencing is noise. Your portfolio is not broken. The market is doing what
        markets do.
      </p>
      <p>
        If one or more of those numbers is outside acceptable ranges, you have an actual signal. That is
        the time to act, and only then.
      </p>

      <FeedbackButton />
    </BlogPost>
  );
}

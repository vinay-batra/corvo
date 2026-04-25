import type { Metadata } from "next";
import BlogPost from "../BlogPost";
import type { TocItem, RelatedPost } from "../BlogPost";
import FeedbackButton from "../../../components/FeedbackButton";

export const metadata: Metadata = {
  title: "Building a Portfolio Analyzer: What We Learned | Corvo Blog",
  description: "From a personal frustration project to a tool used by thousands. Here is what building Corvo taught us about retail investing tools.",
  keywords: ["corvo product", "portfolio analyzer", "retail investing tools", "building corvo", "fintech"],
  openGraph: {
    title: "Building a Portfolio Analyzer: What We Learned",
    description: "From a personal frustration project to a tool used by thousands. Here is what building Corvo taught us about retail investing tools.",
    url: "https://corvo.capital/blog/building-corvo-what-we-learned",
    siteName: "Corvo",
    type: "article",
    publishedTime: "2026-04-01",
  },
  twitter: {
    card: "summary_large_image",
    title: "Building a Portfolio Analyzer: What We Learned",
    description: "From a frustration project to thousands of users. What building Corvo taught us.",
  },
};

const TOC: TocItem[] = [
  { id: "the-original-frustration", title: "The Original Frustration" },
  { id: "key-product-decisions", title: "Key Product Decisions" },
  { id: "what-users-care-about", title: "What Users Actually Care About" },
  { id: "what-is-coming-next", title: "What Is Coming Next" },
];

const RELATED: RelatedPost[] = [
  {
    slug: "how-corvo-calculates-sharpe-ratio",
    title: "How Corvo Calculates Your Sharpe Ratio",
    category: "Product",
    categoryColor: "#a78bfa",
    readTime: "5 min read",
    excerpt: "Live risk-free rate from the 3-month T-bill. Here is exactly how the math works.",
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

export default function BuildingCorvoWhatWeLearnedPage() {
  return (
    <BlogPost
      title="Building a Portfolio Analyzer: What We Learned"
      date="April 1, 2026"
      readTime="5 min read"
      category="Product"
      description="From a personal frustration project to a tool used by thousands. Here is what building Corvo taught us about retail investing tools."
      toc={TOC}
      related={RELATED}
    >
      <p>
        Corvo started as a frustration project. The frustration was specific: there was no good free
        tool for analyzing a personal investment portfolio using real metrics. Here is what building
        it taught us.
      </p>

      <h2 id="the-original-frustration">The Original Frustration</h2>
      <p>
        The existing options were expensive, outdated, or both. The free tools were basic to the point
        of uselessness. They showed you a pie chart and your total return. The paid options charged
        $50 to $200 per month for interfaces that felt like they were designed in 2009 and never
        updated. Getting a correct Sharpe ratio required either paying for a Bloomberg subscription
        or building it yourself.
      </p>
      <p>
        The specific problem that started everything was the Sharpe ratio calculation. Every tool
        either did not show it, or showed it using a hardcoded risk-free rate from years prior. For
        a metric that is the foundation of risk-adjusted return analysis, this was a strange gap.
        The formula is not complicated. The data is publicly available. Nobody had just built it
        correctly and made it free.
      </p>
      <p>
        Building a correct Sharpe ratio calculator turned into building a correct portfolio analyzer,
        which turned into Corvo.
      </p>

      <h2 id="key-product-decisions">Key Product Decisions</h2>
      <p>
        Three decisions shaped the product.
      </p>
      <p>
        First, free. Not freemium with a locked paywall after five minutes of use. Actually free.
        The analytics that matter for personal investing should not cost money. The data is public.
        The math is not proprietary. This made the product harder to build sustainably, but it was
        the right call for the users we were trying to serve.
      </p>
      <p>
        Second, no fluff. The temptation when building any dashboard product is to add more. More
        charts, more data points, more toggles that make the product look capable without actually
        being useful. We pushed back against this constantly. If a metric was not helping someone
        make a better decision about their portfolio, it did not belong in the product.
      </p>
      <p>
        Third, real metrics. Sharpe ratio with a live risk-free rate. Monte Carlo with 8,500 paths.
        Max drawdown calculated from actual price history. Tax loss harvesting with real wash-sale
        rule logic. If a feature was worth including, it was worth calculating correctly. Approximate
        answers to important questions are worse than no answers, because they create false confidence.
      </p>

      <h2 id="what-users-care-about">What Users Actually Care About</h2>
      <p>
        Building in public taught us something unexpected: most users do not engage with the
        advanced features first. They engage with one question: is my portfolio doing well or not?
      </p>
      <p>
        The health score was the feature that resonated most immediately. A single number from 0 to
        100 that tells you whether to pay attention. Not a chart you have to interpret. Not a table
        of statistics requiring financial literacy to parse. A number and a label: Excellent, Good,
        Fair, or Weak. Most users understood it in under 30 seconds and immediately trusted it more
        than any other output on the page.
      </p>
      <p>
        The second most impactful feature was the benchmark comparison. Knowing you returned 15%
        last year feels good until you learn the S&P 500 returned 26%. The benchmark adds the
        context that makes every other number meaningful. Without it, good returns can mask poor
        decisions, and modest returns in a down market can hide genuine skill.
      </p>
      <p>
        The Monte Carlo simulation was the feature that created the most user conversations. Seeing
        the range of possible outcomes for your portfolio over 10 or 20 years, based on your
        actual holdings and their historical behavior, changes how people think about retirement
        planning. It makes abstract risk concrete.
      </p>

      <h2 id="what-is-coming-next">What Is Coming Next</h2>
      <p>
        Goal tracking, so portfolio health is measured against your actual retirement target rather
        than an abstract benchmark. Better capital gains tools, specifically around the timing of
        long-term versus short-term gains. More saved portfolio comparison features. And continued
        improvement to the AI analysis layer, which gets better with each analysis run.
      </p>
      <p>
        The core product is stable. What we are building now is depth on top of the foundation:
        more accuracy, more context, and better tools for making decisions rather than just
        understanding data. The goal has not changed: give retail investors the analytical depth
        they need, at a price that makes sense.
      </p>

      <FeedbackButton />
    </BlogPost>
  );
}

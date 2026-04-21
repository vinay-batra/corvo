import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://corvo.capital', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://corvo.capital/app', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://corvo.capital/learn', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://corvo.capital/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://corvo.capital/demo', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://corvo.capital/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://corvo.capital/blog/how-to-calculate-sharpe-ratio', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/blog/portfolio-diversification-guide', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/blog/bloomberg-alternative', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/blog/monte-carlo-simulation-investing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/compare/bloomberg', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/compare/robinhood', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/compare/yahoo-finance', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://corvo.capital/faq', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://corvo.capital/changelog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];
}

import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import React from "react";
import PostHogProvider from "@/components/PosthogProvider";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallBanner from "@/components/InstallBanner";
import { ToastProvider } from "@/components/Toast";
import ConditionalParticleCanvas from "@/components/ConditionalParticleCanvas";
import AmbientOrbs from "@/components/AmbientOrbs";
import PublicAIChatLoader from "@/components/PublicAIChatLoader";
import FeedbackButton from "@/components/FeedbackButton";

export const metadata: Metadata = {
  title: { default: "Corvo: Free Portfolio Analytics & AI Investing Tools", template: "%s - Corvo" },
  description: "Corvo is a free AI-powered portfolio analytics platform. Get Sharpe ratio, Monte Carlo simulation, health scores, and AI insights for your stock portfolio. No subscription required.",
  keywords: ["portfolio analytics", "free portfolio tracker", "sharpe ratio calculator", "monte carlo simulation", "AI investing tools", "portfolio diversification", "tax loss harvesting", "dividend tracker", "stock portfolio analyzer", "retail investor tools", "bloomberg alternative", "corvo capital"],
  authors: [{ name: "Corvo", url: "https://corvo.capital" }],
  creator: "Corvo",
  publisher: "Corvo",
  metadataBase: new URL("https://corvo.capital"),
  alternates: { canonical: "https://corvo.capital" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Corvo" },
  other: { "mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=2",      sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2",      sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180" }],
    shortcut: [{ url: "/favicon-32x32.png?v=2" }],
  },
  openGraph: {
    title: "Corvo - Free AI Portfolio Analytics",
    description: "Institutional-grade portfolio analytics for retail investors. Free.",
    url: "https://corvo.capital",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png?v=2", width: 1200, height: 630, alt: "Corvo Portfolio Analytics Dashboard" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
    description: "Free institutional-grade portfolio analytics for retail investors. No subscription required.",
    images: ["https://corvo.capital/og-image.png?v=2"],
    creator: "@corvocapital",
  },
  verification: { google: "lIQ8IhN0F6sjZp1eqzlcmvmd3M30zQ0a3H4GCYV_dNI" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('corvo_theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}})();` }} />
        {/* Canonical set per-page via metadata.alternates.canonical - no global override here */}
        <meta name="theme-color" content="#c9a84c" />
        {/* Fonts: one preconnected stylesheet instead of two render-blocking CSS
            @imports (see globals.css). Collapses three serial network hops into
            one and guarantees display=swap on all three families. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
        {/* Skip-to-content for keyboard users - styled via globals.css .skip-link */}
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Corvo",
          "url": "https://corvo.capital",
          "description": "Free AI-powered portfolio analytics platform",
          "applicationCategory": "FinanceApplication",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "featureList": ["Portfolio Analysis", "Monte Carlo Simulation", "AI Chat", "Health Score", "Tax Loss Harvesting"]
        }) }} />
        <ConditionalParticleCanvas />
        <AmbientOrbs />
        <Suspense>
          <PostHogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </PostHogProvider>
        </Suspense>
        <PublicAIChatLoader />
        <FeedbackButton />
        <Analytics />
        <ServiceWorkerRegistrar />
        <InstallBanner />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import React from "react";
import PostHogProvider from "@/components/PosthogProvider";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallBanner from "@/components/InstallBanner";
import { ToastProvider } from "@/components/Toast";
import ParticleCanvas from "@/components/ParticleCanvas";
import PublicAIChatLoader from "@/components/PublicAIChatLoader";

export const metadata: Metadata = {
  title: { default: "Corvo: Free Portfolio Analytics & AI Investing Tools", template: "%s | Corvo" },
  description: "Free institutional-grade portfolio analytics for retail investors. Sharpe ratio, Monte Carlo simulation, AI portfolio chat, tax loss harvesting, dividend tracking and more. No subscription required.",
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
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }, { url: "/icon-192.png", sizes: "192x192" }],
  },
  openGraph: {
    title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
    description: "Free institutional-grade portfolio analytics for retail investors. Sharpe ratio, Monte Carlo simulation, AI portfolio chat, tax loss harvesting and more. No subscription required.",
    url: "https://corvo.capital",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png", width: 1200, height: 630, alt: "Corvo Portfolio Analytics Dashboard" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
    description: "Free institutional-grade portfolio analytics for retail investors. No subscription required.",
    images: ["https://corvo.capital/og-image.png"],
    creator: "@corvocapital",
  },
  verification: { google: "lIQ8IhN0F6sjZp1eqzlcmvmd3M30zQ0a3H4GCYV_dNI" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('corvo_theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){}})();` }} />
        <link rel="canonical" href="https://corvo.capital" />
        <meta name="theme-color" content="#c9a84c" />
      </head>
      <body style={{ margin: 0 }}>
        <ParticleCanvas />
        <Suspense>
          <PostHogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </PostHogProvider>
        </Suspense>
        <PublicAIChatLoader />
        <Analytics />
        <ServiceWorkerRegistrar />
        <InstallBanner />
      </body>
    </html>
  );
}

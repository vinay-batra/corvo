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
  title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
  description: "Free institutional-grade portfolio analytics for retail investors. Monte Carlo simulation, Sharpe ratio, AI chat, real-time alerts and more. No subscription required.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Corvo",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icon-192.png", sizes: "192x192" },
    ],
  },
  openGraph: {
    title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
    description: "Free institutional-grade portfolio analytics for retail investors. Monte Carlo simulation, Sharpe ratio, AI chat, real-time alerts and more. No subscription required.",
    url: "https://corvo.capital",
    siteName: "Corvo",
    images: [{ url: "https://corvo.capital/og-image.png", width: 1200, height: 630, alt: "Corvo: Free Portfolio Analytics & AI Investing Tools" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corvo: Free Portfolio Analytics & AI Investing Tools",
    description: "Free institutional-grade portfolio analytics for retail investors. Monte Carlo simulation, Sharpe ratio, AI chat, real-time alerts and more. No subscription required.",
    images: ["https://corvo.capital/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" style={{ background: "#0a0e14" }}>
      <head>
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body style={{ margin: 0, background: "#0d1117" }}>
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

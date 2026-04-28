import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const cspHeader = [
  "default-src 'self'",
  // unsafe-inline required for theme detection inline script in layout.tsx; unsafe-eval intentionally omitted
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://web-production-7a78d.up.railway.app https://app.posthog.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://*.vercel-insights.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: cspHeader }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, { silent: true });

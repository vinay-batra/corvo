import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://web-production-7a78d.up.railway.app";

const cspHeader = [
  "default-src 'self'",
  // 'unsafe-inline' kept here intentionally. Removing it in App Router
  // requires a nonce-based CSP from a proxy.ts file, which forces every
  // page to be dynamically rendered on each request (no static
  // optimization, no CDN caching, higher server cost per request). That
  // tradeoff isn't worth the marginal XSS reduction at our current scale.
  // The experimental SRI flag below adds integrity verification to all
  // Next.js-generated bundles as a layer of defense without sacrificing
  // static rendering. If we eventually outgrow that tradeoff, the path
  // forward is in node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
  // (move CSP to proxy.ts, add 'nonce-${nonce}' and 'strict-dynamic',
  // call connection() in pages that must be dynamic).
  // unsafe-eval intentionally omitted.
  "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://vercel.live https://*.vercel.live",
  "style-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://*.supabase.co ${apiUrl} https://app.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://*.vercel-insights.com`,
  // 'none' must stand alone in CSP - mixing it with vercel.live caused
  // the browser to ignore the whole directive (and silently fall back to
  // child-src / default-src 'self'), blocking the Vercel Live feedback
  // iframe and logging a console warning.
  "frame-src https://vercel.live",
  // Clickjacking defense: only let Corvo itself (and the Vercel Live preview
  // toolbar that we use on preview deploys) iframe Corvo pages. Without this
  // directive the X-Frame-Options=DENY equivalent isn't enforced and an
  // attacker page could iframe /app + overlay an invisible button over the
  // user's actual Save / Delete actions.
  "frame-ancestors 'self' https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  experimental: {
    // Subresource Integrity: Next.js generates SHA-256 hashes for every
    // built JS bundle and emits `integrity="sha256-..."` on the <script>
    // tags. Browsers verify the hash before executing - if a CDN ever
    // serves a tampered asset (cache poisoning, MITM on a stale TLS cert,
    // a compromised dependency), the script is rejected. Pairs with the
    // tightened CSP above so even if 'unsafe-inline' is bypassed via some
    // future Next.js change, the actual loaded scripts still have to
    // match a known hash.
    sri: { algorithm: "sha256" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: cspHeader }],
      },
    ];
  },
};

// `silent` was previously true, which masked source-map upload failures
// during build. Keep CI logs noisy unless explicitly silenced via env so
// regressions surface immediately.
export default withSentryConfig(nextConfig, {
  silent: process.env.SENTRY_SUPPRESS_LOGS === "1",
});

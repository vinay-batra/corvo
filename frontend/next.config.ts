import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://web-production-7a78d.up.railway.app";

const cspHeader = [
  "default-src 'self'",
  // 'unsafe-inline' kept here intentionally. Removing it in App Router
  // requires a nonce-based CSP from a proxy.ts file, which forces every
  // page to be dynamically rendered on each request. The path forward
  // is in node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
  // (move CSP to proxy.ts, add 'nonce-${nonce}' and 'strict-dynamic',
  // call connection() in pages that must be dynamic).
  // unsafe-eval intentionally omitted.
  // challenges.cloudflare.com is REQUIRED for the Turnstile captcha on the
  // auth page. Turnstile loads api.js (script-src) and renders its "verify
  // your browser" challenge in an iframe (frame-src). Without these the
  // widget never mounts, the captchaToken stays null, and the Log in button
  // is permanently disabled - i.e. "login does nothing". Do NOT remove these.
  "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://vercel.live https://*.vercel.live https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://*.supabase.co ${apiUrl} https://app.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://*.vercel-insights.com https://challenges.cloudflare.com`,
  // 'none' must stand alone in CSP - mixing it with vercel.live caused
  // the browser to ignore the whole directive (and silently fall back to
  // child-src / default-src 'self'), blocking the Vercel Live feedback
  // iframe and logging a console warning. challenges.cloudflare.com is the
  // Turnstile captcha iframe (see script-src note above).
  "frame-src https://vercel.live https://challenges.cloudflare.com",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // 2 years, include subdomains, eligible for the HSTS preload list.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send origin only on cross-origin navigations so query params (next=,
          // user_id=, ref=) never leak in the Referer to off-site links.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Deny powerful features the app does not use.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()" },
          // Redundant with the CSP frame-ancestors directive but harmless
          // defense-in-depth for ancient clients.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
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

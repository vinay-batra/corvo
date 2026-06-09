// Lazy-init shim so the posthog-js SDK payload loads behind a dynamic import()
// (resolved after PosthogProvider mounts) instead of sitting on the critical
// path of every route that imports `posthog`. Components keep importing this
// tiny wrapper and calling `posthog.capture(...)` unchanged; calls before the
// SDK finishes loading are no-ops (acceptable for analytics).

type PH = typeof import("posthog-js")["default"];
let _ph: PH | null = null;
let _initStarted = false;

export async function initPostHog() {
  if (typeof window === "undefined" || _initStarted) return;
  _initStarted = true;
  const mod = await import("posthog-js");
  const ph = mod.default;
  if (!ph.__loaded) {
    ph.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      capture_pageview: false, // handled by PostHogPageView
      capture_pageleave: true,
      persistence: "localStorage",
    });
  }
  _ph = ph;
}

// Thin, sync-safe wrapper components import. No-ops until init resolves.
export const posthog = {
  capture: (event: string, props?: Record<string, unknown>) => { _ph?.capture(event, props); },
  identify: (id: string, props?: Record<string, unknown>) => { _ph?.identify(id, props); },
  reset: () => { _ph?.reset(); },
};

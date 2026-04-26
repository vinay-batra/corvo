# Changelog

All notable changes to Corvo are documented here.

---

## v0.19 — April 26, 2026

### Fixed
- **Critical auth bug:** missing `middleware.ts` caused expired JWTs on all SSR requests, silently logging users out
- **Supabase singleton:** `app/page.tsx` was instantiating a second Supabase client without `cookieOptions`, causing sessions to expire on browser close; all client creation now goes through `lib/supabase.ts`
- **Morning briefing price accuracy:** now uses exact live prices from yfinance, never inferred or approximated
- **Onboarding double-render glitch:** step transitions no longer flash or re-mount components

### Added
- **Portfolio performance pill** in dashboard ticker scroll
- **Onboarding header:** Corvo logo (links to `/app`) and user menu with My Account, Referrals, Go To App, Settings, and Logout

---

## v0.18 — April 25, 2026

### Added
- Briefing collapse shows first-sentence preview instead of fully hiding content
- Ticker chips expanded to show price, dollar change, and percent change
- Referral links generated client-side using `/signup` path with full user ID

### Fixed
- Supabase SSR middleware added; inline client creation removed
- Rules compliance audit: dark mode variables, logic safety, icon cleanup

# Changelog

All notable changes to Corvo are documented here.

---

## v0.30 - May 12, 2026 - dashboard polish, day-over-day cron, logo overhaul, math fixes

### Added
- **Privacy toggle for the live portfolio value**. Eye / eye-off button next to the live dollar amount in GreetingBar header replaces the value with `$••••••` and hides the day delta. Persisted via `corvo_value_hidden` localStorage. Tabular-num figures keep the layout stable across the toggle so nothing reflows.
- **End-of-day portfolio snapshot cron** (`eod_portfolio_snapshot_loop`). Runs at 4:15 PM ET on weekdays, iterates every row in `portfolios`, and calls the existing `_portfolio_snapshot_inner` upsert. Backed by the v0.29 `portfolio_snapshots` schema fix - no new migration required. New admin endpoint `GET /admin/test-eod-snapshot` lets you manually trigger the cron without waiting for market close. Solves the long-standing "tomorrow it resets to the manual base again" problem: the data layer is now there for real day-over-day tracking. GreetingBar reads the snapshot history via the existing `perfHistory` prop and exposes yesterday's daily change in the live-value tooltip; richer visible carry-forward UI lands next iteration once the cron has accumulated a few weekdays of rows.
- **Hash anchor scroll on the homepage**. The homepage wraps content in a 100vh `containerRef` div, so the browser's native scroll-to-`#id` was scrolling the window (which can't move) instead of the actual scrollable container. New `useEffect` listens to `hashchange` and scrolls `containerRef` to the target element on both initial load and subsequent in-page nav clicks. Fixes "click Features in the nav → URL updates but nothing scrolls" - and works for `/#install`, `/#pricing` etc. too. Hardened to retry up to 20× at 100ms intervals if element / scroller aren't ready yet, with a second attempt at 700ms as a fallback because GsapHero's `ScrollTrigger.refresh()` at +120ms was clobbering the initial scroll position.
- **Collapsed-brief preview**. When the Daily / Evening Brief is collapsed, GreetingBar now shows a 2-line teaser pulled from `market.market` (the "Markets Today" snippet) directly under the greeting. `-webkit-line-clamp: 2` truncates cleanly; clicking the preview expands the full brief. Closes the gap where the collapsed brief was just "Good evening, X" with no content cue.
- **Logo overhaul** (multiple iterations, settled here): master `corvo-logo.png` is transparent gold raven with strokes 6px dilated via PIL `MaxFilter` so the silhouette holds at 30-40 px nav sizes. Browser-chrome icons (`favicon-16x16`, `favicon-32x32`, `favicon.ico`, `apple-touch-icon`, `icon-192`, `icon-512`) sit on a dark navy fill at 98% canvas coverage so the raven actually shows up in Chrome tabs, bookmarks, iOS home screen. Master stays transparent so the 26+ inline `<img src="/corvo-logo.png">` callsites sit cleanly on whatever page background they land on. Dashboard sidebar logo bumped 26 → 34 px at full opacity with the same gold drop-shadow PublicNav uses. AiChat avatar bumped 20 → 28 px with the inner ratio raised to 0.72 and a soft gold glow. Footer.tsx and PublicFooter.tsx gain 64 px / 88 px watermark logos centered at the bottom for brand presence. Pipelines kept in `/tmp/corvo_logo_transparent_thick.py` and `/tmp/corvo_favicon_v2.py`.
- **Admin endpoint `GET /admin/real-stats`**. Returns the raw, unfloored platform counts: `auth.users`, `profiles`, `portfolios`, `portfolio_snapshots`, `chat_usage`, `health_score_cache`, `price_alerts`, `price_targets`. The public `/stats` endpoint clamps `user_count` to a 847 floor for the homepage marketing copy - this endpoint reports the truth. Per-table counts use PostgREST's `Prefer: count=exact + Range: 0-0` trick. Failures are swallowed per-table so a single broken table doesn't 500 the whole response. Header: `X-Admin-Key: $SUPABASE_SERVICE_ROLE_KEY`.

### Changed
- **Morning / Evening Brief localStorage key bumped** from `corvo_brief_collapsed` to `corvo_brief_collapsed_v2`. Existing users who had inadvertently kept the brief expanded across sessions get reset to the collapsed default; v1 values are ignored. Same `"0"` semantics on the new key.
- **`/watchlist-data` rate limit bumped 30 → 600 per hour.** GreetingBar polls the endpoint every 60 s for index prices and holdings (2 calls per poll), so the previous 30/hour cap locked the dashboard tiles out after about 15 minutes - the live-value, Markets pills, and holdings chips all stayed stuck on "loading...". 600/hour gives multi-tab headroom and absorbs genuine bursts. CLAUDE.md rule corrected: 429s on this endpoint were a UX bug, not normal log noise.
- **GoalTracker projection CAGR clamped to a 4 - 10% long-horizon band.** Previous version compounded the user's observed CAGR (often a 1Y hot run, e.g. 25%) across the full 20-year horizon, producing fantasy projections ($50 k base → $4.7 M target vs $1 M goal). New `projectionCagr = max(0.04, min(observedCagr, 0.10))` is used for the projected value, the trajectory chart, and the required-CAGR math. Card surfaces both numbers and the assumption explicitly: "Projection assumes 10.0% CAGR (capped from your recent 25.5% - long-horizon estimates use 4-10% so a single hot or cold year doesn't dominate the math)". Stat row trimmed 3 → 2 columns; "Projected" sub reframed from "+$3.7M ahead of goal" to neutral "Meets / $X short of $1M". Green celebration footer dropped.
- **PerformanceChart dollar mode now anchors at TODAY.** Previously the chart treated `portfolioValue` as the *start*-of-period value and grew it forward by cumulative return, so a $50 k input showed $62.5 k at the right edge of the chart (cumulative +25% YTD). User-facing inconsistency with every other place in the app that uses `portfolioValue` as a "current" anchor. New implementation derives the implicit start-of-period value by walking cumulative return backwards from today, then plots everything against it - the last data point lands exactly on `portfolioValue`. Benchmark and saved-portfolio overlay use the same implicit start so the comparison reads as "if you'd put $start into S&P / saved-portfolio on day one".
- **WSID "Get Actions" button now actually clickable.** The pill called `e.stopPropagation()` unconditionally but only acted when `wsidOpen + wsidResult` were both true (refresh state). In the initial state the propagation was blocked without doing anything, so clicking the surrounding banner worked but clicking the button itself was a no-op. Now always fires `handleWhatShouldIDo`, clears the cached result first when refreshing, and accepts keyboard (Enter / Space).
- **WSID response parser pairs headline + explanation.** Claude was emitting each action's headline and its explanation as separate blank-line-separated blocks, so a 3-action plan rendered as 6 numbered bullets where every other one was really a paragraph. New parser detects the shape: a short single-line block (<130 char) followed by a substantially longer block (>1.6× length or >120 char) gets paired as headline + explanation. Multi-line blocks still work for backwards compat. Result: 3 bullets, each with paragraph below.
- **CLAUDE.md gains five authoritative rules** (Railway GitHub integration "GENUINELY BROKEN", em dash exception for `.agents/skills/*` plugin docs, `/watchlist-data` 600/hr rate-limit reality, session-scoped caveat on the live portfolio value pattern, projection assumption surfaced explicitly). Open items for v0.29 cleared.
- **AiChat avatar in message bubbles bumped 20 → 28 px**, inner logo ratio 0.58 → 0.72, soft gold glow on the frame. "Always watching" eyebrow above the empty-state headline dropped (the headline already carries the framing). Empty-state logo container bumped 32×26 → 42×42 with proper square aspect.

### Reversed mid-release
- **Logo master swung dark-tile → back to transparent.** Mid-day attempt to make the master `corvo-logo.png` a gold-on-dark-navy tile (matching the favicon treatment) was rejected by the user - it turned every inline logo into a small dark badge against light page backgrounds. Reverted to transparent with the stroke-thickening pipeline above. Favicons retained the dark fill - they need it for browser-chrome contrast.
- **Daily Signal removed from the dashboard; WSID restored.** Earlier in v0.30 the WSID card was deleted in favour of consolidating around DailySignal (collapse default + tooltip). User reversed course mid-day: DailySignal pulled out of the dashboard render entirely, all WSID state / handler / JSX / customizer entry / section-header gate restored. Net dashboard: GreetingBar → WSID action card → metrics. DailySignal component file kept at `frontend/components/DailySignal.tsx` and `/daily-signal` backend route still registered; both inert until re-imported / re-called.

### Fixed
- **AiChat hit the segment error boundary on a 25% chance.** `useEffect` rolled `Math.floor(Math.random() * 4)` for the active suggestion set, but `SUGGESTION_SETS` only has 3 entries. Index 3 returned `undefined` and `undefined.map()` in the empty-state render crashed into `app/error.tsx` ("Corvo hit an unexpected error"). Reload re-rolled and usually picked 0-2, masking the bug. Random now capped to `SUGGESTION_SETS.length`; render site has a `?? SUGGESTION_SETS[0]` fallback in case anyone adds or removes a set in the future.
- **Scroll nav not working on the features section**. See "Hash anchor scroll" above for the underlying cause.

### Operations
- **Railway "Deploy on Push" disabled at the dashboard level** (`Settings → Source → Auto deploy is disabled`). Backend pushes will no longer trigger broken auto-deploys regardless of `watchPatterns`. Manual `railway up` is the only path now. `railway.toml` keeps the watchPatterns as belt-and-suspenders if anyone ever re-enables auto-deploy.
- **All previously-leaked backend secrets rotated** (Anthropic, Finnhub, Supabase service role, Resend, VAPID). Old keys in public git history are now invalidated. **A second `SUPABASE_SERVICE_ROLE_KEY` rotation pending** - the key was pasted into a Claude chat session for the `/admin/real-stats` query and should be rotated again before end of day.
- **Backend deployed twice via canonical `railway up`** (manual sequence per CLAUDE.md Deployment section). EOD snapshot cron + new admin endpoint + `/watchlist-data` rate-limit bump all live on the running instance.
- **First `/admin/real-stats` snapshot (2026-05-12)**: 9 profiles, 4 saved portfolios, 55 chat_usage rows (assistant turns), 0 portfolio_snapshots (cron hasn't fired its first market-close yet), 0 health_score_cache rows, 1 price alert, 2 price targets. Homepage `/stats` still displays 847+ users due to the marketing floor.

---

## v0.29 - May 11, 2026

### Added
- **New logo**: gold raven head + rising arrow replaces the C-in-gold-circle. Cropped tight, transparent background. Master at `frontend/public/corvo-logo.png` (717×717). Favicon set generated for 16 / 32 / 48 / 180 / 192 / 512 px plus multi-resolution `favicon.ico`. New OG card (1200×630) with raven left + wordmark + tagline. New 400×400 social profile picture on dark fill.
- **Live portfolio value on the dashboard**: GreetingBar shows `base × (1 + today's %)` plus the dollar and percent delta next to "Good evening, Test." - visible even when the brief is collapsed. Sidebar Portfolio Value input mirrors the live number when unfocused, snaps to base on focus, saves user-edited input as the new base on blur.
- **PublicNav refresh**: 68 px tall, content-aligned inner container (1240 max-width / 56 px horizontal padding), hover bubbles on every link and button, fully-rounded gold Get Started pill, bulletproof scroll-aware hide on scroll down / show on scroll up via requestAnimationFrame polling. Homepage uses the same component now.
- **Dashboard tour fixes**: Step 2 (Daily Brief) was anchored to the wrong target - now anchored to the actual brief card. Step 5 consolidated into a single "Top bar" stop covering alerts, theme toggle, Export, Share, and settings.
- **Railway watchPatterns**: scoped auto-deploy to `backend/**`, `railway.toml`, and `Procfile`. Frontend pushes no longer trigger broken Railway build attempts.

### Changed
- **Evening Brief defaults to collapsed** so the Today's Signal card is the dashboard's focal point. localStorage `corvo_brief_collapsed` semantics flipped: only an explicit `"0"` keeps it expanded across sessions.
- **PublicNav structure**: back to 7 flat links (Features, Install, Pricing, Changelog, Blog, About, FAQ) after a brief Linear-style dropdown experiment.
- **Homepage**: replaced its inline 167-line nav with the shared `<PublicNav scrollerRef={containerRef} />`.

### Fixed
- **Hide-on-scroll-up nav was broken on the homepage** even after multiple attempts with scroll event listeners. Switched to `requestAnimationFrame` polling that reads scroll position once per frame regardless of how the page's GSAP container fires events. Works uniformly across every public page now.
- **portfolio_snapshots schema cache miss in prod** - backend was logging `Could not find the 'date' column of 'portfolio_snapshots' in the schema cache`. Root cause: the legacy migration file (`portfolio_snapshots.sql`, no timestamp prefix) was being silently skipped by `supabase db push`, so newer columns never reached prod. New migration `20260511020000_portfolio_snapshots_schema_fix.sql` adds missing columns idempotently and runs `notify pgrst, 'reload schema'` to drop PostgREST's stale cache.
- **Logo coverage gap** - the old C-in-circle was still embedded in `og-image.png` (the social link preview card) and `corvo-pfp.png` (Twitter avatar). Both regenerated with the new raven.
- **Stale public/ assets** deleted: old SVG logo variants, an orphan JPG, and the Next.js default SVG templates (file, globe, next, vercel, window).

---

## v0.28 - May 11, 2026 - audit-driven security + cleanup pass

### Security
- **Closed 3 IDOR vulnerabilities**: `POST /portfolio/snapshot`, `PATCH /price-targets/{id}`, `DELETE /price-targets/{id}`, and `POST /parse-portfolio-image` now JWT-verify the caller and reject when the token user does not match the request user.
- **Authenticated 4 leak routes**: `GET /referrals`, `GET /chat/usage`, `GET /portfolio/history`, and `POST /unsubscribe` now derive `user_id` from the JWT instead of trusting the request.
- **Stripped raw exception strings** from `/chat` SSE and `/parse-portfolio-image` responses (used to leak internal error text including partial Anthropic context).
- **Rate-limit IP source switched to `X-Forwarded-For`** so Railway's proxy doesn't collapse all clients to a single bucket.
- **LRU caps on 8 in-process caches** (`RATE_LIMITS`, `_image_parse_daily`, `_market_per_ticker_cache`, `_sectors_cache`, `_dividends_cache`, `_options_cache`, `_health_score_cache`, `_daily_signal_cache`) via shared `_cap_dict` helper.
- **Added rate limits** to `/prices`, `/search-ticker`, `/market-summary`, `/market-brief`, `/market-driver`, `/earnings-calendar`, `/earnings/transcript/{ticker}`, and `/portfolio/health-score`.
- **Enforced canonical Monte Carlo path count**: `/montecarlo/insight` and `/retirement-simulation` now force `req.simulations = 8500` regardless of client input.
- **`backend/.env` untracked from git**. The leaked Anthropic key has been rotated; older history still retains it.

### Supabase migrations
- **`20260511000000_security_hardening.sql`**: added `Users read own health scores` RLS policy on `health_score_cache` (was RLS-on with zero policies, locking it to service role only), dropped the wide `Authenticated users can read all profiles` policy, added tight `Users read own profile`, and created a `get_leaderboard(p_limit)` SECURITY DEFINER RPC that exposes only `id`, `display_name`, and `xp`. Frontend leaderboard query migrated to `supabase.rpc("get_leaderboard")`.
- **`20260511000100_drop_paper_trading.sql`**: drops `paper_portfolio` and `paper_trades` tables. Paper Trade was removed from the product in v0.24; the backend routes and frontend component were finally purged in this release.

### Removed
- **Paper Trade** backend routes (`GET /paper-trading/{user_id}`, `GET /paper-trading/{user_id}/history`, `POST /paper-trading/buy`, `POST /paper-trading/sell`, `POST /paper-trading/reset`) and helpers - about 270 lines.
- **Nine unused frontend components**: `PaperTrading`, `PriceTargetTracker`, `DividendTracker`, `EarningsImpactPreview`, `PeerComparison`, `PortfolioCompareTab`, `PortfolioHeartbeat`, `PortfolioHistory`, `MobileBottomNav`. None were imported anywhere.
- **Dead backend route**: `/docs-check`.
- **Emoji** in push notification title (rule violation).
- **Repo cruft**: ~7,400 stale files from `backend/` - duplicate frontend tree, full Streamlit prototype Python files, ghost mirror directory, virtualenv. `backend/` now contains only `main.py`, `requirements.txt`, `.env`, `.env.example`.

### Changed
- **Frontend hardening**: `lib/api.ts` now throws on missing `NEXT_PUBLIC_API_URL` in production instead of silently falling back to localhost. 33 component files migrated to the centralized `RESOLVED_API_URL` export. `middleware.ts` auth call wrapped in try/catch so transient Supabase outage doesn't 500 the site. New `app/error.tsx` segment-level error boundary. GSAP now dynamic-imported inside the hero effect instead of at module scope.
- **Light / dark mode**: 3 compare pages (Bloomberg, Yahoo Finance, Robinhood) converted from hardcoded hex to CSS variables (39 replacements). New `lib/theme.ts` helper (`cssVar`, `plotlyHoverlabel`, `currentTheme`) for libraries that can't read CSS vars directly. Plotly hover labels in 5 charts now theme-aware. Toggle knobs use new `--toggle-knob` / `--toggle-knob-shadow` variables. SharePortfolio canvas resolves CSS vars at runtime. ExportPDF and demo page palettes routed through CSS variables.
- **Mobile**: 7 wrong-breakpoint media queries (max-width 900, 600, 767) normalized to 768. Mobile chart heights overridden on DrawdownChart / MonteCarloChart / CorrelationHeatmap. Wide tables get a `corvo-responsive-table` class that reduces padding + font on mobile. Small icon buttons get a `corvo-touch-44` class enforcing 44×44 minimum touch targets. ProfileEditor 2-col grids collapse to 1-col at `≤768px`. Customize FAB and InstallBanner reposition cleanly on mobile (no more collision with AI / Feedback buttons). OnboardingTour tooltip clamps to viewport. Mobile tab bar bumped from 40 to 44 px and auto-scrolls the active tab into view.
- **Motion / animation**: 34 broken `motion.div` blocks with the `whileInView + initial={false}` anti-pattern (reveal would fire immediately and skip the scroll trigger) fixed with explicit inverse `initial={{ opacity: 0, y: 30 }}` states. `FadeUp` / `SlideIn` / `Reveal` helpers delegate to the IntersectionObserver-based `ScrollReveal`. CLAUDE.md rule updated.
- **Em / en dash sweep**: 330 em dashes and 42 en dashes removed across 79 project source files plus `AGENTS.md` and `CLAUDE.md`. Zero remaining in project source.

### Fixed
- **Background loops dogpiling on cold boot**: 8 loops now stagger their initial work by 30 to 240 s so the backend doesn't fire 8 simultaneous yfinance bursts and trip Yahoo's anti-abuse on every Railway restart.
- **Bare `except:` clauses** (6 of them) promoted to `except Exception:` so they no longer swallow `KeyboardInterrupt` / `SystemExit`.
- **Daily-signal "tied largest holding" guard**: when multiple holdings share the maximum weight, the AI no longer silently picks the first one - returns a generic "N holdings tied" descriptor.
- **Dashboard auto-load `useEffect`**: gained a cancelled flag and a cleanup return so it stops setting state on unmounted components.
- **17 console statements** wrapped in `process.env.NODE_ENV !== "production"` guards.

---

## v0.20 - April 27, 2026

### Added
- **AI chat overhaul:** web search enabled (`web_search` tool on `claude-sonnet-4-6`), streaming responses, available on every page, context-aware portfolio data injected, confident advisor tone enforced
- **Monte Carlo overhaul:** 1-30 year horizon selector, exactly 8,500 simulation paths, monthly GBM steps, advanced settings panel (contributions, inflation, fees, tax drag), histogram distribution view, confidence intervals - state persists across tab switches and theme changes
- **Rebalance Assistant:** drift table showing current vs. target allocation, AI-generated rebalance plan, goal-aware advice, "Continue in AI chat" button
- **Options Chain Viewer:** calls and puts table with delta (Black-Scholes), IV, volume, open interest, ITM highlighting, per-column plain-English tooltips, Max Pain section
- **Transaction Log:** buy/sell trade logging, cost basis tracking, realized P&L calculation, sortable table
- **Health Score upgrade:** daily caching (`health_score_cache` table), advisor-style headline, specific action items referencing real portfolio tickers
- **"What should I do today?" upgrade:** goal-aware advice, never recommends based on single-day moves, "Continue in AI chat" button
- **Email system rebuilt:** Morning Briefing, Week in Review, Monthly Summary, Price Alerts -- all with opt-in toggles in Settings, email theme (light/dark), clean subject lines, teaser format with CTA back to app
- **Auto-load saved portfolio on mount:** returning users see their portfolio immediately, never an empty state
- **Leaderboard fix:** shows all users, RLS policy corrected, "Corvo User" fallback for unnamed users
- **InfoTooltip expansion:** every financial metric, stat, and column header now has a plain-English explanation
- **Morning briefing expand/collapse:** "Expand/Collapse" button replaces bare chevron
- **Price alert editing:** inline edit form with condition and threshold, save and delete
- **Onboarding header:** Corvo logo links to `/app`, user menu in top right

### Fixed
- **Scrolling fixed globally:** `overscroll-behavior: none` set on `html`, `body`, and all major layout containers; passive scroll listeners; no reanimation on elastic scroll
- **Supabase SSR auth:** `middleware.ts` added at repo root, singleton client enforced via `lib/supabase.ts`, inline `createClient` calls removed

---

## v0.19 - April 26, 2026

### Fixed
- **Critical auth bug:** missing `middleware.ts` caused expired JWTs on all SSR requests, silently logging users out
- **Supabase singleton:** `app/page.tsx` was instantiating a second Supabase client without `cookieOptions`, causing sessions to expire on browser close; all client creation now goes through `lib/supabase.ts`
- **Morning briefing price accuracy:** now uses exact live prices from yfinance, never inferred or approximated
- **Onboarding double-render glitch:** step transitions no longer flash or re-mount components

### Added
- **Portfolio performance pill** in dashboard ticker scroll
- **Onboarding header:** Corvo logo (links to `/app`) and user menu with My Account, Referrals, Go To App, Settings, and Logout

---

## v0.18 - April 25, 2026

### Added
- Briefing collapse shows first-sentence preview instead of fully hiding content
- Ticker chips expanded to show price, dollar change, and percent change
- Referral links generated client-side using `/signup` path with full user ID

### Fixed
- Supabase SSR middleware added; inline client creation removed
- Rules compliance audit: dark mode variables, logic safety, icon cleanup

import PublicFooter from "@/components/PublicFooter";

const LAST_UPDATED = "May 19, 2026";

const S = {
  page:    { minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" } as React.CSSProperties,
  header:  { height: 52, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, background: "var(--bg)", position: "sticky" as const, top: 0, zIndex: 10 },
  body:    { maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" },
  h1:      { fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: -0.5 } as React.CSSProperties,
  h2:      { fontSize: 18, fontWeight: 600, color: "var(--text)", marginTop: 40, marginBottom: 12 } as React.CSSProperties,
  p:       { fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 14 } as React.CSSProperties,
  ul:      { paddingLeft: 20, marginBottom: 14 } as React.CSSProperties,
  li:      { fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 6 } as React.CSSProperties,
  label:   { fontSize: 10, letterSpacing: 2, color: "var(--text3)", textTransform: "uppercase" as const, marginBottom: 4, display: "block" },
  divider: { height: "0.5px", background: "var(--border)", margin: "40px 0" } as React.CSSProperties,
};

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <img src="/corvo-logo.png?v=2" width={22} height={22} alt="Corvo" />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Privacy Policy</span>
      </header>

      <div style={S.body}>
        <span style={S.label}>Legal</span>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={{ ...S.p, color: "var(--text3)", marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={S.p}>
          Corvo ("we", "our", or "us") operates the portfolio analytics platform at corvo.capital. This Privacy Policy explains what we collect, how we use it, who we share it with, and the controls you have over your data.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}>Information you provide directly:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Account information:</strong> email address and password (or OAuth provider identity) when you create an account.</li>
          <li style={S.li}><strong>Portfolio data:</strong> ticker symbols, weights, optional cost basis, optional purchase date, account type tags (taxable / Roth IRA / 401(k) / HSA / 529 / custodial), and reinvest-dividends preference. We never ask for brokerage credentials, account numbers, or routing information.</li>
          <li style={S.li}><strong>Profile information:</strong> optional display name, avatar, risk profile, investing horizon, primary goals, and life events you enter during onboarding.</li>
          <li style={S.li}><strong>Email and notification preferences:</strong> which digests you want (morning brief, weekly review, monthly summary, market close), price-alert configurations, and push-notification subscription tokens if you grant permission.</li>
          <li style={S.li}><strong>Chat history:</strong> conversations with the Corvo AI advisor, stored against your account so you can revisit them.</li>
          <li style={S.li}><strong>End-of-day snapshots:</strong> we record your portfolio's daily closing value into a snapshots table so the dashboard can ratchet day-over-day instead of resetting at every market open.</li>
        </ul>
        <p style={S.p}>Information collected automatically:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Usage data:</strong> pages visited, features used, and aggregate interaction patterns.</li>
          <li style={S.li}><strong>Device information:</strong> browser type, operating system, viewport, and IP address (used for rate limiting and abuse prevention).</li>
          <li style={S.li}><strong>Error diagnostics:</strong> when something crashes in the app, we capture stack traces and the request context (no portfolio contents) so we can fix it.</li>
        </ul>

        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <ul style={S.ul}>
          <li style={S.li}>Provide, maintain, and improve the portfolio analytics service.</li>
          <li style={S.li}>Generate AI insights, chat responses, health scores, daily action plans, and PDF reports for your portfolio.</li>
          <li style={S.li}>Send digest emails, alerts, and push notifications you have opted into.</li>
          <li style={S.li}>Detect and prevent fraud, abuse, and security incidents.</li>
          <li style={S.li}>Respond to support requests.</li>
          <li style={S.li}>Analyze aggregate usage to prioritize product work.</li>
        </ul>
        <p style={S.p}>We do not sell your personal information. We do not use your portfolio holdings for advertising. We do not share your data with third-party marketers.</p>

        <h2 style={S.h2}>3. Third-Party Services</h2>
        <p style={S.p}>We use the following processors to operate Corvo:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Supabase:</strong> database, authentication, and file storage. Your account record and portfolio data live here, protected by row-level security so each user can only read their own rows.</li>
          <li style={S.li}><strong>Anthropic Claude:</strong> AI chat, health scores, daily signals, action plans, and report generation. We send portfolio context (tickers, weights, computed metrics) and your message to Anthropic. We do not send your email, password, or any identifying information. Anthropic's data retention and processing policies apply.</li>
          <li style={S.li}><strong>Yahoo Finance (via yfinance):</strong> public market price and fundamentals data. Only ticker symbols leave Corvo; nothing about you is sent.</li>
          <li style={S.li}><strong>Finnhub:</strong> news and supplementary market data. Ticker-level requests only.</li>
          <li style={S.li}><strong>Resend:</strong> transactional email delivery (welcome, digests, alerts).</li>
          <li style={S.li}><strong>Vercel:</strong> frontend hosting and edge network. Standard web logs (IP, user agent, path, response code) are retained by Vercel.</li>
          <li style={S.li}><strong>Railway:</strong> backend hosting. Standard application logs are retained by Railway.</li>
          <li style={S.li}><strong>Sentry:</strong> client-side and server-side error tracking. Captures stack traces, request paths, and the browser environment, never your portfolio contents.</li>
          <li style={S.li}><strong>PostHog:</strong> product analytics. Captures aggregate page-visit and feature-usage events. Configurable; opt out by setting "Do Not Track" in your browser.</li>
          <li style={S.li}><strong>Web Push (VAPID):</strong> if you grant notification permission, your browser-issued push subscription token is stored so we can deliver price alerts.</li>
        </ul>

        <h2 style={S.h2}>4. Data Retention</h2>
        <p style={S.p}>
          We retain your account data for as long as your account is active. Saved portfolios, chat history, snapshots, and preferences are stored until you delete them or close your account. Closing your account removes your row-level data from our Supabase database within 30 days. You can request deletion at any time from Settings or by emailing privacy@corvo.capital.
        </p>

        <h2 style={S.h2}>5. Security</h2>
        <p style={S.p}>
          We use industry-standard safeguards: HTTPS for every connection, bcrypt-hashed passwords managed by Supabase Auth, row-level security policies enforced at the database, JWT-verified API routes for any operation that touches user-scoped data, IP-based rate limits, and signed unsubscribe tokens on email links. No internet transmission is 100% secure and we cannot guarantee absolute security, but we follow the principle of least privilege and document our practices in the open-source repository.
        </p>

        <h2 style={S.h2}>6. Not Financial Advice</h2>
        <p style={S.p}>
          Corvo is an analytics and educational tool. Nothing on the platform is financial, investment, tax, or legal advice. Portfolio metrics, health scores, AI chat responses, simulations, and reports are for informational purposes only. Markets are unpredictable and past performance never guarantees future results. Consult a qualified financial professional before making investment decisions.
        </p>

        <h2 style={S.h2}>7. Children</h2>
        <p style={S.p}>
          Corvo is not directed to anyone under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, contact privacy@corvo.capital and we will delete the account.
        </p>

        <h2 style={S.h2}>8. Your Rights</h2>
        <p style={S.p}>Depending on your jurisdiction (including GDPR and CCPA where applicable), you may have the right to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Access the personal data we hold about you.</li>
          <li style={S.li}>Correct inaccurate or outdated data.</li>
          <li style={S.li}>Request deletion of your data ("right to be forgotten").</li>
          <li style={S.li}>Export your data in a machine-readable format.</li>
          <li style={S.li}>Opt out of marketing emails at any time via Settings or the unsubscribe link in every email.</li>
          <li style={S.li}>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p style={S.p}>To exercise these rights, use the Settings page or contact privacy@corvo.capital. We respond within 30 days.</p>

        <h2 style={S.h2}>9. Cookies and Local Storage</h2>
        <p style={S.p}>
          We use essential cookies for Supabase authentication and browser localStorage to remember your preferences (theme, currency, default time period, dismissed banners, last-active tab). We do not use cross-site tracking cookies or advertising cookies.
        </p>

        <h2 style={S.h2}>10. International Transfers</h2>
        <p style={S.p}>
          Corvo is operated from the United States. If you access it from outside the US, your data may be transferred to and processed in the US and other jurisdictions where our processors operate. By using Corvo you consent to those transfers.
        </p>

        <h2 style={S.h2}>11. Disclosure for Legal Reasons</h2>
        <p style={S.p}>
          We may disclose your information if required by law, valid legal process, or to protect Corvo's rights, property, or the safety of users.
        </p>

        <h2 style={S.h2}>12. Changes to This Policy</h2>
        <p style={S.p}>
          We may update this Privacy Policy from time to time. We will notify registered users of material changes by email and post the updated effective date here. Continued use of Corvo after changes constitutes acceptance of the updated policy.
        </p>

        <h2 style={S.h2}>13. Contact</h2>
        <p style={S.p}>
          For privacy questions or to exercise any right above, email <a href="mailto:privacy@corvo.capital" style={{ color: "var(--accent)" }}>privacy@corvo.capital</a>.
        </p>

        <div style={S.divider} />
        <p style={{ ...S.p, fontSize: 12, color: "var(--text3)" }}>© 2026 Corvo. All rights reserved.</p>
      </div>
      <PublicFooter />
    </div>
  );
}

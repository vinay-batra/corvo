import Link from "next/link";

const LAST_UPDATED = "April 7, 2026";

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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 12, transition: "color 0.15s" }}>
          ← Back
        </Link>
        <div style={{ width: "0.5px", height: 16, background: "var(--border)" }} />
        <img src="/corvo-logo.svg" width={22} height={22} alt="Corvo" />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Privacy Policy</span>
      </header>

      <div style={S.body}>
        <span style={S.label}>Legal</span>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={{ ...S.p, color: "var(--text3)", marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={S.p}>
          Corvo ("we", "our", or "us") operates the portfolio analytics platform at corvo.capital. This Privacy Policy explains how we collect, use, and protect your information when you use our service.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}>We collect information you provide directly to us:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Account information:</strong> email address and password when you create an account.</li>
          <li style={S.li}><strong>Portfolio data:</strong> ticker symbols and portfolio weights you enter for analysis. We do not collect your brokerage credentials or account numbers.</li>
          <li style={S.li}><strong>Profile information:</strong> optional display name and avatar you upload.</li>
          <li style={S.li}><strong>Usage data:</strong> how you interact with the app (pages visited, features used), collected via standard web analytics.</li>
          <li style={S.li}><strong>Device information:</strong> browser type, operating system, IP address for rate limiting and security purposes.</li>
        </ul>

        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <p style={S.p}>We use the information we collect to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Provide, maintain, and improve our portfolio analytics service.</li>
          <li style={S.li}>Send you weekly portfolio digest emails (if opted in).</li>
          <li style={S.li}>Send price alerts for assets in your watchlist (if opted in).</li>
          <li style={S.li}>Detect and prevent fraudulent or abusive activity.</li>
          <li style={S.li}>Respond to your questions and support requests.</li>
          <li style={S.li}>Analyze aggregate usage patterns to improve the product.</li>
        </ul>
        <p style={S.p}>We do not sell your personal information to third parties. We do not use your portfolio data for advertising purposes.</p>

        <h2 style={S.h2}>3. Third-Party Services</h2>
        <p style={S.p}>We use the following third-party services to operate Corvo:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Supabase</strong> — database, authentication, and file storage. Your data is stored in Supabase-managed infrastructure.</li>
          <li style={S.li}><strong>Yahoo Finance (via yfinance)</strong> — market price data. Only ticker symbols you enter are sent to this service.</li>
          <li style={S.li}><strong>Anthropic Claude</strong> — AI chat and report generation. Portfolio context is sent to generate responses. Anthropic's data retention policies apply.</li>
          <li style={S.li}><strong>Resend</strong> — email delivery for digest and alert emails.</li>
        </ul>

        <h2 style={S.h2}>4. Data Retention</h2>
        <p style={S.p}>
          We retain your account data for as long as your account is active. Saved portfolios and preferences are stored until you delete them or delete your account. You may request deletion of your data at any time by deleting your account in Settings or contacting us.
        </p>

        <h2 style={S.h2}>5. Security</h2>
        <p style={S.p}>
          We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords via Supabase Auth, and row-level security policies so users can only access their own data. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 style={S.h2}>6. Not Financial Advice</h2>
        <p style={S.p}>
          Corvo is an analytics and educational tool. Nothing on this platform constitutes financial, investment, legal, or tax advice. Portfolio metrics, health scores, AI chat responses, and reports are for informational purposes only. Always consult a qualified financial professional before making investment decisions.
        </p>

        <h2 style={S.h2}>7. Your Rights</h2>
        <p style={S.p}>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Access the personal data we hold about you.</li>
          <li style={S.li}>Correct inaccurate data.</li>
          <li style={S.li}>Request deletion of your data.</li>
          <li style={S.li}>Opt out of marketing communications at any time via email preferences.</li>
        </ul>
        <p style={S.p}>To exercise these rights, use the Settings page in the app or contact us at privacy@corvo.capital.</p>

        <h2 style={S.h2}>8. Cookies</h2>
        <p style={S.p}>
          We use essential cookies for authentication (managed by Supabase) and localStorage to store your preferences (theme, currency, default period). We do not use tracking or advertising cookies.
        </p>

        <h2 style={S.h2}>9. Changes to This Policy</h2>
        <p style={S.p}>
          We may update this Privacy Policy from time to time. We will notify registered users of significant changes by email. Continued use of Corvo after changes constitutes acceptance of the updated policy.
        </p>

        <h2 style={S.h2}>10. Contact</h2>
        <p style={S.p}>
          For privacy-related questions, contact us at <a href="mailto:privacy@corvo.capital" style={{ color: "#c9a84c" }}>privacy@corvo.capital</a>.
        </p>

        <div style={S.divider} />
        <p style={{ ...S.p, fontSize: 12, color: "var(--text3)" }}>© 2026 Corvo. All rights reserved.</p>
      </div>
    </div>
  );
}

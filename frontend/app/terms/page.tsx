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

export default function TermsPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 12, transition: "color 0.15s" }}>
          ← Back
        </Link>
        <div style={{ width: "0.5px", height: 16, background: "var(--border)" }} />
        <img src="/corvo-logo.svg" width={22} height={22} alt="Corvo" />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Terms of Service</span>
      </header>

      <div style={S.body}>
        <span style={S.label}>Legal</span>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={{ ...S.p, color: "var(--text3)", marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={S.p}>
          Please read these Terms of Service ("Terms") carefully before using Corvo at corvo.capital. By accessing or using our service, you agree to be bound by these Terms. If you do not agree, do not use Corvo.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>1. Description of Service</h2>
        <p style={S.p}>
          Corvo is a portfolio analytics and educational platform. It provides tools including portfolio performance metrics, risk analysis, Monte Carlo simulation, AI-powered insights, watchlist tracking, and historical comparison. The service is provided for informational and educational purposes only.
        </p>

        <h2 style={S.h2}>2. Not Financial Advice</h2>
        <p style={S.p}>
          <strong>IMPORTANT DISCLAIMER:</strong> Corvo is not a licensed financial advisor, broker, or investment adviser. Nothing on this platform (including portfolio metrics, health scores, AI chat responses, generated reports, or any other content) constitutes financial, investment, legal, or tax advice.
        </p>
        <p style={S.p}>
          All analysis is based on historical data and mathematical models. Past performance does not guarantee future results. Market data may be delayed or inaccurate. Always consult a qualified, licensed financial professional before making any investment decisions.
        </p>

        <h2 style={S.h2}>3. Eligibility</h2>
        <p style={S.p}>
          You must be at least 18 years of age to use Corvo. By using the service, you represent that you meet this requirement and have the legal capacity to enter into these Terms.
        </p>

        <h2 style={S.h2}>4. Account Responsibilities</h2>
        <ul style={S.ul}>
          <li style={S.li}>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li style={S.li}>You are responsible for all activity that occurs under your account.</li>
          <li style={S.li}>You must provide accurate information when creating your account.</li>
          <li style={S.li}>You must notify us immediately of any unauthorized use of your account.</li>
          <li style={S.li}>You may not share your account with others or create accounts for the purpose of abuse.</li>
        </ul>

        <h2 style={S.h2}>5. Acceptable Use</h2>
        <p style={S.p}>You agree not to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Use Corvo for any unlawful purpose or in violation of any applicable laws.</li>
          <li style={S.li}>Attempt to reverse engineer, scrape, or extract data from the service at scale.</li>
          <li style={S.li}>Bypass rate limits, authentication, or security measures.</li>
          <li style={S.li}>Use the AI chat feature to generate misleading financial content for distribution to others.</li>
          <li style={S.li}>Interfere with or disrupt the service or servers.</li>
          <li style={S.li}>Impersonate any person or entity.</li>
        </ul>

        <h2 style={S.h2}>6. Market Data</h2>
        <p style={S.p}>
          Market data displayed in Corvo is sourced from Yahoo Finance and other public APIs. Data may be delayed, incomplete, or contain errors. We do not guarantee the accuracy, completeness, or timeliness of any market data. You should not make investment decisions based solely on data displayed in Corvo.
        </p>

        <h2 style={S.h2}>7. AI-Generated Content</h2>
        <p style={S.p}>
          Corvo uses large language models (Claude by Anthropic) to generate portfolio insights and chat responses. AI-generated content is based on the information you provide and general training data. It may be incorrect, outdated, or inappropriate for your specific situation. AI responses are not reviewed by human advisors and should not be relied upon as professional advice.
        </p>

        <h2 style={S.h2}>8. Intellectual Property</h2>
        <p style={S.p}>
          The Corvo platform, including its design, code, logo, and proprietary algorithms, is owned by Corvo and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission. Portfolio data you enter remains yours.
        </p>

        <h2 style={S.h2}>9. Limitation of Liability</h2>
        <p style={S.p}>
          To the maximum extent permitted by law, Corvo shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or investment returns, arising from your use of or inability to use the service.
        </p>
        <p style={S.p}>
          Our total liability to you for any claim arising from these Terms or the service shall not exceed the amount you paid to us in the 12 months preceding the claim (or $50 if you have not paid us).
        </p>

        <h2 style={S.h2}>10. Disclaimer of Warranties</h2>
        <p style={S.p}>
          The service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses. We do not warrant the accuracy of any financial calculations or projections.
        </p>

        <h2 style={S.h2}>11. Termination</h2>
        <p style={S.p}>
          We may suspend or terminate your account at any time for violations of these Terms or for any other reason with reasonable notice. You may delete your account at any time in Settings. Upon termination, your right to use the service ceases immediately.
        </p>

        <h2 style={S.h2}>12. Changes to Terms</h2>
        <p style={S.p}>
          We may modify these Terms at any time. We will provide notice of significant changes by email or by displaying a notice in the app. Your continued use of Corvo after changes take effect constitutes acceptance of the revised Terms.
        </p>

        <h2 style={S.h2}>13. Governing Law</h2>
        <p style={S.p}>
          These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of San Francisco County, California.
        </p>

        <h2 style={S.h2}>14. Contact</h2>
        <p style={S.p}>
          For questions about these Terms, contact us at <a href="mailto:legal@corvo.capital" style={{ color: "#c9a84c" }}>legal@corvo.capital</a>.
        </p>

        <div style={S.divider} />
        <p style={{ ...S.p, fontSize: 12, color: "var(--text3)" }}>© 2026 Corvo. All rights reserved.</p>
      </div>
    </div>
  );
}

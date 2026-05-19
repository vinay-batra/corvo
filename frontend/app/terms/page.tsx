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

export default function TermsPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <img src="/corvo-logo.png?v=2" width={22} height={22} alt="Corvo" />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Terms of Service</span>
      </header>

      <div style={S.body}>
        <span style={S.label}>Legal</span>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={{ ...S.p, color: "var(--text3)", marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <p style={S.p}>
          Read these Terms of Service ("Terms") carefully before using Corvo at corvo.capital. By accessing or using the service you agree to be bound by these Terms. If you do not agree, do not use Corvo.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>1. Description of Service</h2>
        <p style={S.p}>
          Corvo is a portfolio analytics and educational platform. The service provides risk and performance metrics, Monte Carlo simulation, AI-generated insights and chat, watchlist tracking, day-over-day snapshots, tax-loss-harvesting signals, PDF reports, and other portfolio analysis tools. The service is provided for informational and educational purposes only.
        </p>

        <h2 style={S.h2}>2. Not Financial Advice</h2>
        <p style={S.p}>
          <strong>IMPORTANT DISCLAIMER:</strong> Corvo is not a registered investment adviser, broker-dealer, or financial planner. Nothing on the platform (portfolio metrics, health scores, AI chat responses, daily signals, generated reports, simulations, tax-loss suggestions, or any other content) is financial, investment, tax, accounting, or legal advice.
        </p>
        <p style={S.p}>
          All analysis is based on historical data and mathematical models. Past performance does not guarantee future results. Market data may be delayed or inaccurate. Always consult a licensed financial professional before making investment decisions. You are solely responsible for any decision you make.
        </p>

        <h2 style={S.h2}>3. Eligibility</h2>
        <p style={S.p}>
          You must be at least 18 years of age to use Corvo. By using the service you represent that you meet this requirement and have the legal capacity to enter into these Terms. Users in jurisdictions with a higher age of majority must meet the local requirement.
        </p>

        <h2 style={S.h2}>4. Account Responsibilities</h2>
        <ul style={S.ul}>
          <li style={S.li}>You are responsible for the confidentiality of your account credentials.</li>
          <li style={S.li}>You are responsible for all activity under your account.</li>
          <li style={S.li}>You must provide accurate information when creating an account.</li>
          <li style={S.li}>You must notify us immediately of any unauthorized use of your account at <a href="mailto:security@corvo.capital" style={{ color: "var(--accent)" }}>security@corvo.capital</a>.</li>
          <li style={S.li}>You may not share your account or create accounts for the purpose of abusing rate limits or feature caps.</li>
        </ul>

        <h2 style={S.h2}>5. Pricing and Future Paid Tiers</h2>
        <p style={S.p}>
          Corvo's full feature set is currently free. We may introduce paid tiers in the future (publicly previewed on the Pricing page as Lite, Pro, and Max). The free tier ("Lite") will remain available. We will not retroactively move features users currently rely on into a paid tier without reasonable notice. Joining the waitlist for a paid tier is not a purchase, does not create a contractual obligation, and does not lock in pricing until the tier officially launches and you complete checkout. Refund and cancellation terms will be published before any paid tier launches.
        </p>

        <h2 style={S.h2}>6. Acceptable Use</h2>
        <p style={S.p}>You agree not to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Use Corvo for any unlawful purpose or in violation of applicable laws or exchange regulations.</li>
          <li style={S.li}>Reverse engineer, scrape, mirror, or extract data from the service at scale.</li>
          <li style={S.li}>Bypass rate limits, authentication, captcha, or other security measures.</li>
          <li style={S.li}>Use the AI chat to generate misleading financial content for distribution to others or to evade securities regulations.</li>
          <li style={S.li}>Interfere with or disrupt the service, its servers, or its underlying infrastructure.</li>
          <li style={S.li}>Impersonate another person, entity, or Corvo itself.</li>
          <li style={S.li}>Probe for, exploit, or publicly disclose security vulnerabilities without coordinated disclosure to <a href="mailto:security@corvo.capital" style={{ color: "var(--accent)" }}>security@corvo.capital</a>.</li>
        </ul>

        <h2 style={S.h2}>7. Market Data</h2>
        <p style={S.p}>
          Market data displayed in Corvo is sourced from Yahoo Finance, Finnhub, and other public APIs. Data may be delayed, incomplete, or contain errors. We do not guarantee accuracy, completeness, or timeliness. You should not make investment decisions based solely on data displayed in Corvo.
        </p>

        <h2 style={S.h2}>8. AI-Generated Content</h2>
        <p style={S.p}>
          Corvo uses large language models (currently Claude by Anthropic) for chat, health scores, daily signals, and report generation. AI output is generated from the portfolio context you provide plus the model's training data. It can be incorrect, outdated, contradictory, or inappropriate for your situation. No AI response is reviewed by a human advisor before delivery. Treat AI output as a starting point for further research, never as a recommendation to buy, sell, or hold any security.
        </p>
        <p style={S.p}>
          Conversations with the Corvo AI advisor are stored against your account so you can review them later. You can delete individual conversations at any time from the chat history panel.
        </p>

        <h2 style={S.h2}>9. Intellectual Property</h2>
        <p style={S.p}>
          The Corvo platform, including its design, code, logo, copy, and proprietary algorithms, is owned by Corvo and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission. The portfolio data you enter remains yours; you grant Corvo a limited license to process it so we can deliver the analytics you requested.
        </p>

        <h2 style={S.h2}>10. Limitation of Liability</h2>
        <p style={S.p}>
          To the maximum extent permitted by law, Corvo and its operators are not liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including loss of profits, data, goodwill, or investment returns, arising from your use of or inability to use the service.
        </p>
        <p style={S.p}>
          Our total cumulative liability for any claim arising from these Terms or the service shall not exceed the greater of (a) the amount you paid to Corvo in the 12 months preceding the claim or (b) USD $50.
        </p>

        <h2 style={S.h2}>11. Disclaimer of Warranties</h2>
        <p style={S.p}>
          The service is provided "as is" and "as available" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, or uninterrupted operation. We do not warrant that the service will be uninterrupted, error-free, secure, or free of viruses.
        </p>

        <h2 style={S.h2}>12. Indemnification</h2>
        <p style={S.p}>
          You agree to indemnify and hold harmless Corvo and its operators from any claims, damages, or expenses (including reasonable attorneys' fees) arising from your use of the service, your violation of these Terms, or your violation of any third-party right.
        </p>

        <h2 style={S.h2}>13. Termination</h2>
        <p style={S.p}>
          We may suspend or terminate your account at any time for violations of these Terms or for any other reason with reasonable notice. You may delete your account at any time from Settings. Upon termination your right to use the service ceases immediately; sections of these Terms that by their nature should survive termination (Limitation of Liability, Indemnification, Intellectual Property, Governing Law) survive.
        </p>

        <h2 style={S.h2}>14. Changes to Terms</h2>
        <p style={S.p}>
          We may modify these Terms at any time. We will provide notice of material changes by email and post the updated effective date here. Your continued use of Corvo after changes take effect constitutes acceptance of the revised Terms.
        </p>

        <h2 style={S.h2}>15. Governing Law</h2>
        <p style={S.p}>
          These Terms are governed by the laws of the Commonwealth of Pennsylvania, United States, without regard to conflict of law principles. You and Corvo agree that any dispute arising from these Terms or the service shall be brought in the state or federal courts located in Bucks County, Pennsylvania, and you consent to the personal jurisdiction of those courts.
        </p>

        <h2 style={S.h2}>16. Severability and Entire Agreement</h2>
        <p style={S.p}>
          If any provision of these Terms is held invalid or unenforceable, the remaining provisions will continue in full force and effect. These Terms, together with the Privacy Policy, constitute the entire agreement between you and Corvo regarding the service and supersede any prior agreements.
        </p>

        <h2 style={S.h2}>17. Contact</h2>
        <p style={S.p}>
          For questions about these Terms, contact us at <a href="mailto:legal@corvo.capital" style={{ color: "var(--accent)" }}>legal@corvo.capital</a>.
        </p>

        <div style={S.divider} />
        <p style={{ ...S.p, fontSize: 12, color: "var(--text3)" }}>© 2026 Corvo. All rights reserved.</p>
      </div>
      <PublicFooter />
    </div>
  );
}

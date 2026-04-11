import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Corvo",
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e14",
      color: "#e8e0cc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <img
          src="/corvo-logo.svg"
          alt="Corvo"
          width={52}
          height={42}
          style={{ opacity: 0.6, marginBottom: 32, animation: "float 3s ease-in-out infinite" }}
        />

        <p style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "clamp(64px,12vw,96px)",
          fontWeight: 700,
          letterSpacing: -4,
          color: "#c9a84c",
          lineHeight: 1,
          marginBottom: 16,
        }}>
          404
        </p>

        <h1 style={{
          fontSize: "clamp(18px,3vw,24px)",
          fontWeight: 600,
          color: "#e8e0cc",
          marginBottom: 12,
          letterSpacing: "-0.3px",
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: 14,
          color: "rgba(232,224,204,0.4)",
          lineHeight: 1.7,
          marginBottom: 36,
          maxWidth: 340,
          margin: "0 auto 36px",
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to your portfolio.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            padding: "12px 28px",
            background: "#c9a84c",
            borderRadius: 10,
            color: "#0a0e14",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: 0.3,
            display: "inline-block",
          }}>
            Go Home
          </Link>
          <Link href="/app" style={{
            padding: "12px 28px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            color: "rgba(232,224,204,0.7)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            letterSpacing: 0.3,
            display: "inline-block",
          }}>
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}

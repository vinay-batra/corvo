import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        @keyframes nf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes nf-orb-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.22), 0 0 40px rgba(201,168,76,0.18); } 50% { box-shadow: 0 0 0 16px rgba(201,168,76,0), 0 0 60px rgba(201,168,76,0.28); } }
        @keyframes nf-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nf-orb-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Ambient background gradient */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 50% 40% at 50% 38%, rgba(201,168,76,0.07) 0%, transparent 70%)",
      }} />

      <div style={{ textAlign: "center", maxWidth: 480, position: "relative", animation: "nf-fade-in 0.5s ease" }}>
        {/* Orb with logo */}
        <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "0.5px solid rgba(201,168,76,0.22)", animation: "nf-orb-rotate 12s linear infinite" }} />
          <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "0.5px solid rgba(201,168,76,0.35)", animation: "nf-orb-rotate 18s linear infinite reverse" }} />
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, rgba(201,168,76,0.28), rgba(201,168,76,0.08) 60%, rgba(201,168,76,0.04) 100%)",
            border: "0.5px solid rgba(201,168,76,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "nf-orb-pulse 3s ease-in-out infinite",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/corvo-logo.svg" alt="Corvo" width={30} height={30} style={{ opacity: 0.95, filter: "drop-shadow(0 0 6px rgba(201,168,76,0.4))" }} />
          </div>
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--accent)",
          textTransform: "uppercase",
          fontFamily: "Space Mono, monospace",
          fontWeight: 700,
          marginBottom: 12,
        }}>
          Error 404
        </p>

        {/* 404 mark */}
        <p style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "clamp(72px,14vw,112px)",
          fontWeight: 700,
          letterSpacing: -5,
          background: "linear-gradient(180deg, var(--accent) 0%, rgba(201,168,76,0.55) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
          marginBottom: 14,
        }}>
          404
        </p>

        <h1 style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "clamp(20px,3vw,26px)",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: 14,
          letterSpacing: "-0.6px",
          lineHeight: 1.2,
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: 14,
          color: "var(--text3)",
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 340,
          margin: "0 auto 40px",
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to your portfolio.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            padding: "12px 28px",
            background: "var(--accent)",
            borderRadius: 10,
            color: "var(--bg)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: 0.3,
            display: "inline-block",
            boxShadow: "0 4px 20px rgba(201,168,76,0.3), 0 0 0 0 rgba(201,168,76,0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}>
            Go Home
          </Link>
          <Link href="/app" style={{
            padding: "12px 28px",
            background: "var(--bg3)",
            border: "0.5px solid var(--border2)",
            borderRadius: 10,
            color: "var(--text2)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: 0.3,
            display: "inline-block",
            transition: "all 0.15s",
          }}>
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}

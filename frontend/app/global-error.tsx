"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html>
      <body style={{
        margin: 0,
        background: "var(--bg, #0a0a0a)",
        color: "var(--text, #e5e5e5)",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
          @keyframes ge-orb-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(224,92,92,0.25), 0 0 40px rgba(224,92,92,0.15); } 50% { box-shadow: 0 0 0 14px rgba(224,92,92,0), 0 0 60px rgba(224,92,92,0.22); } }
          @keyframes ge-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes ge-orb-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 50% 40% at 50% 38%, rgba(224,92,92,0.05) 0%, transparent 70%)",
        }} />

        <div style={{ textAlign: "center", maxWidth: 460, position: "relative", animation: "ge-fade-in 0.5s ease" }}>
          {/* Warning orb */}
          <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "0.5px solid rgba(224,92,92,0.25)", animation: "ge-orb-rotate 14s linear infinite" }} />
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, rgba(224,92,92,0.28), rgba(224,92,92,0.08) 60%, rgba(224,92,92,0.04) 100%)",
              border: "0.5px solid rgba(224,92,92,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ge-orb-pulse 3s ease-in-out infinite",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e05c5c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(224,92,92,0.45))" }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>

          <p style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "#e05c5c",
            textTransform: "uppercase",
            fontFamily: "Space Mono, monospace",
            fontWeight: 700,
            marginBottom: 12,
          }}>
            Unexpected Error
          </p>

          <h1 style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "clamp(22px,3vw,28px)",
            fontWeight: 700,
            color: "var(--text, #e5e5e5)",
            marginBottom: 14,
            letterSpacing: "-0.6px",
            lineHeight: 1.2,
            marginTop: 0,
          }}>
            Something went wrong
          </h1>

          <p style={{
            fontSize: 14,
            color: "var(--text3, #888)",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 360,
            margin: "0 auto 36px",
          }}>
            Corvo hit an unexpected error and couldn&apos;t recover. The issue has been reported. Reload to try again.
          </p>

          <button
            onClick={() => { reset(); window.location.reload(); }}
            style={{
              padding: "12px 28px",
              background: "var(--accent, #c9a84c)",
              color: "var(--bg, #0a0a0a)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.3,
              boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}

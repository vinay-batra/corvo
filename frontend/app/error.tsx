"use client";

import { useEffect } from "react";

// Segment-level error boundary. Next.js renders this instead of the full
// page tree when something throws below `app/`. global-error.tsx still exists
// for ROOT-level errors (it owns its own <html>/<body>).

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Sentry. We avoid noisy console.error in production builds.
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.error("[app/error]", error);
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body, Inter, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "32px 28px",
          borderRadius: 14,
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md, 0 8px 32px rgba(0,0,0,0.18))",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(224,92,92,0.10)",
            border: "1px solid rgba(224,92,92,0.25)",
            margin: "0 auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e05c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--accent)",
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Something broke
        </p>
        <h1
          style={{
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 10px",
            letterSpacing: -0.3,
          }}
        >
          Corvo hit an unexpected error
        </h1>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, margin: "0 0 22px" }}>
          The issue was reported. Try again or head back to the dashboard.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(201,168,76,0.28)",
            }}
          >
            Try again
          </button>
          <a
            href="/app"
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text2)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

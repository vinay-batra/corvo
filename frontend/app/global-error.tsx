"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html>
      <body style={{ margin: 0, background: "var(--bg, #0a0a0a)", color: "var(--text, #e5e5e5)", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.125rem", marginBottom: "1.5rem" }}>Something went wrong. Please try reloading the page.</p>
          <button
            onClick={() => { reset(); window.location.reload(); }}
            style={{ padding: "0.625rem 1.5rem", background: "var(--accent, #c9a84c)", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VALID_TYPES = new Set(["morning_briefing", "week_in_review", "monthly_summary", "price_alerts", "market_close_summary"]);

function UnsubscribeContent() {
  const params = useSearchParams();
  const userId = params.get("user_id") || "";
  const type = params.get("type") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      return;
    }

    const body: Record<string, string> = { user_id: userId };
    if (type && VALID_TYPES.has(type)) {
      body.type = type;
    }

    fetch(`${API_URL}/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => setStatus(data.ok ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [userId, type]);

  const circleBg =
    status === "success"
      ? "rgba(45,122,79,0.12)"
      : status === "error"
      ? "rgba(192,57,43,0.12)"
      : "rgba(201,168,76,0.12)";

  return (
    <>
      <PublicNav />
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}>
        <div style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "40px 32px",
          textAlign: "center",
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: circleBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            {status === "loading" && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                </path>
              </svg>
            )}
            {status === "success" && (
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="26 8 12 22 6 16" />
              </svg>
            )}
            {status === "error" && (
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="24" y1="8" x2="8" y2="24" />
                <line x1="8" y1="8" x2="24" y2="24" />
              </svg>
            )}
          </div>

          <h1 style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 12px",
            letterSpacing: -0.3,
          }}>
            {status === "loading" && "Unsubscribing..."}
            {status === "success" && "You've been unsubscribed"}
            {status === "error" && "Something went wrong"}
          </h1>

          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            color: "var(--text2)",
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}>
            {status === "loading" && "Updating your preferences..."}
            {status === "success" && "You won't receive these emails from Corvo going forward."}
            {status === "error" && "To unsubscribe, go to Settings and turn off email notifications."}
          </p>

          {status === "success" && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/settings"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "var(--bg2)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontFamily: "Arial, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: "0.3px",
                }}
              >
                Go to Settings
              </Link>
              <Link
                href="/app"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  borderRadius: 6,
                  fontFamily: "Arial, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.3px",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === "error" && (
            <Link
              href="/settings"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "var(--accent)",
                color: "var(--bg)",
                borderRadius: 6,
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.3px",
              }}
            >
              Go to Settings
            </Link>
          )}

          {status === "success" && (
            <p style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 20,
            }}>
              You can re-enable notifications anytime in{" "}
              <Link href="/settings" style={{ color: "var(--accent)", textDecoration: "none" }}>
                Settings
              </Link>.
            </p>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>Loading...</p>
      </main>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

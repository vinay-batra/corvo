"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function UnsubscribeContent() {
  const params = useSearchParams();
  const userId = params.get("user_id") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      return;
    }
    fetch(`${API_URL}/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => r.json())
      .then((data) => setStatus(data.ok ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [userId]);

  return (
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
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: status === "success" ? "rgba(92,184,138,0.15)" : status === "error" ? "rgba(224,92,92,0.15)" : "rgba(201,168,76,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          {status === "loading" && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
          )}
          {status === "success" && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5cb88a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {status === "error" && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e05c5c" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        <h1 style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text)",
          margin: "0 0 12px",
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
          {status === "success" && "You won't receive weekly digests or price alert emails from Corvo going forward."}
          {status === "error" && "We couldn't update your preferences. Please visit your account settings to manage email notifications."}
        </p>

        <Link
          href="/app"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--accent)",
            color: "#000",
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

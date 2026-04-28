"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "corvo_install_dismissed";

function getPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const PLATFORM_INSTRUCTIONS: Record<"ios" | "android" | "desktop", string[]> = {
  ios: [
    "Tap the Share button at the bottom of Safari",
    'Tap "Add to Home Screen"',
    'Tap "Add" to confirm',
  ],
  android: [
    "Tap the three-dot menu in Chrome",
    'Tap "Add to Home Screen"',
    'Tap "Add" to confirm',
  ],
  desktop: [
    "Click the install icon in your browser's address bar",
    'Click "Install"',
    "Corvo opens as a standalone app",
  ],
};

const PLATFORM_LABELS: Record<"ios" | "android" | "desktop", string> = {
  ios: "iPhone / iPad (Safari)",
  android: "Android (Chrome)",
  desktop: "Desktop (Chrome or Edge)",
};

function InstallModal({ onClose }: { onClose: () => void }) {
  const platform = getPlatform();
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        background: "rgba(0,0,0,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>
              Install Corvo
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{PLATFORM_LABELS[platform]}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "2px 4px", lineHeight: 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PLATFORM_INSTRUCTIONS[platform].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700,
                color: "var(--accent)", background: "rgba(201,168,76,0.1)",
                borderRadius: 4, padding: "2px 7px", flexShrink: 0, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55 }}>{step}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 24,
            background: "var(--accent)", color: "var(--bg)",
            border: "none", borderRadius: 10, padding: "11px 0",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (isStandalone) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {modalOpen && <InstallModal onClose={() => setModalOpen(false)} />}
      <div
        style={{
          position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 10000,
          maxWidth: 560, margin: "0 auto",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, lineHeight: 1.45 }}>
            Add Corvo to your home screen for push notifications and instant access
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 7, padding: "6px 12px", fontSize: 12,
            fontWeight: 600, color: "var(--accent)", cursor: "pointer",
            flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          How?
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", padding: "4px", lineHeight: 1, flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/>
            <line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      </div>
    </>
  );
}

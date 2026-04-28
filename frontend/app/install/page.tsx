"use client";

import React from "react";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const CARDS = [
  {
    label: "iPhone",
    sub: "Safari required",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="42" height="42" rx="10" stroke="var(--border2)" strokeWidth="1.5"/>
        <rect x="8" y="6" width="28" height="32" rx="4" stroke="var(--accent)" strokeWidth="1.4"/>
        <circle cx="22" cy="34" r="1.5" fill="var(--accent)"/>
        <path d="M22 14v-4M19 12.5l3-3 3 3" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 14h10" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M19 18h6M19 21h6M19 24h4" stroke="var(--text3)" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    steps: [
      "Tap the Share button at the bottom of Safari",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    label: "Android",
    sub: "Chrome required",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="42" height="42" rx="10" stroke="var(--border2)" strokeWidth="1.5"/>
        <circle cx="22" cy="20" r="9" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M13.5 20h19" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M22 11v18" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="14" cy="15" r="1.5" fill="var(--accent)" opacity="0.5"/>
        <circle cx="30" cy="15" r="1.5" fill="var(--accent)" opacity="0.5"/>
        <path d="M10 10.5l3 4M34 10.5l-3 4" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M17 31h10M19 34h6" stroke="var(--text3)" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    steps: [
      "Tap the three-dot menu in Chrome",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    label: "Desktop",
    sub: "Chrome or Edge",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="42" height="42" rx="10" stroke="var(--border2)" strokeWidth="1.5"/>
        <rect x="6" y="10" width="32" height="20" rx="2" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M16 34h12M22 30v4" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="34" cy="12" r="2.5" fill="var(--accent)"/>
        <path d="M33 12h2M34 11v2" stroke="var(--bg)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M11 17h10M11 21h14M11 25h8" stroke="var(--text3)" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    steps: [
      "Click the install icon in the address bar",
      'Click "Install"',
      "Corvo opens as a standalone app",
    ],
  },
];

export default function InstallPage() {
  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 768px) {
          .install-hero { padding: 100px 20px 56px !important; }
          .install-cards { padding: 0 20px 80px !important; grid-template-columns: 1fr !important; }
        }
      `}</style>

      <PublicNav />

      {/* Hero */}
      <div className="install-hero" style={{ padding: "140px 56px 72px", textAlign: "center" }}>
        <motion.div
          // initial={false} required — do not remove
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius: 24, marginBottom: 28, background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>Install</span>
          </div>
          <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "var(--text)", letterSpacing: -2, lineHeight: 1.08, marginBottom: 20 }}>
            Install Corvo
          </h1>
          <p style={{ fontSize: "clamp(14px, 2vw, 17px)", color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            Add Corvo to your home screen for instant access and push notifications.
          </p>
        </motion.div>
      </div>

      {/* Cards */}
      <div
        className="install-cards"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "0 56px 96px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
      >
        {CARDS.map((card, cardIdx) => {
          const cardDelay = cardIdx * 0.1;
          return (
            <motion.div
              key={card.label}
              // initial={false} required — do not remove
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.5, ease: EASE, delay: cardDelay }}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 28px", textAlign: "center" }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                {card.icon}
              </div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: 0.5, marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 20 }}>{card.sub}</div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                {card.steps.map((step, stepIdx) => (
                  <motion.div
                    key={stepIdx}
                    // initial={false} required — do not remove
                    initial={false}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "0px" }}
                    transition={{ duration: 0.4, ease: EASE, delay: cardDelay + 0.05 + stepIdx * 0.05 }}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                  >
                    <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginTop: 1 }}>
                      {stepIdx + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <PublicFooter />
    </div>
  );
}

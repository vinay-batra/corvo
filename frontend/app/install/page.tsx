"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const EASE = [0.25, 0.1, 0.25, 1] as const;

// ── SVG Illustrations ────────────────────────────────────────────────────────

function IPhoneIllustration() {
  return (
    <svg viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 130, height: "auto" }}>
      {/* Phone body */}
      <rect x="12" y="0" width="136" height="300" rx="26" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      {/* Volume buttons */}
      <rect x="9.5" y="76" width="3" height="20" rx="1.5" fill="var(--border2)"/>
      <rect x="9.5" y="102" width="3" height="20" rx="1.5" fill="var(--border2)"/>
      {/* Power button */}
      <rect x="147.5" y="88" width="3" height="30" rx="1.5" fill="var(--border2)"/>
      {/* Screen */}
      <rect x="20" y="12" width="120" height="276" rx="20" fill="var(--bg)"/>
      {/* Dynamic island */}
      <rect x="52" y="18" width="56" height="18" rx="9" fill="var(--bg2)"/>
      {/* Status bar stubs */}
      <rect x="28" y="21" width="16" height="4" rx="2" fill="var(--text3)" opacity="0.3"/>
      <rect x="116" y="21" width="16" height="4" rx="2" fill="var(--text3)" opacity="0.3"/>
      {/* Safari URL bar */}
      <rect x="26" y="48" width="108" height="22" rx="8" fill="var(--bg3)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="48" y="56" width="52" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      {/* Content: mini chart */}
      <rect x="26" y="82" width="108" height="64" rx="8" fill="var(--bg2)"/>
      <polyline points="34,136 50,120 64,124 78,108 94,114 110,100 126,106"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="34,136 50,120 64,124 78,108 94,114 110,100 126,106 126,142 34,142"
        fill="var(--accent)" opacity="0.08"/>
      {/* Content placeholder lines */}
      <rect x="26" y="156" width="72" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      <rect x="26" y="166" width="56" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      <rect x="26" y="175" width="64" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      {/* Share sheet */}
      <rect x="20" y="192" width="120" height="96" rx="14" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      {/* Handle */}
      <rect x="64" y="199" width="32" height="3" rx="1.5" fill="var(--border2)"/>
      {/* Share icon (highlighted) */}
      <rect x="26" y="209" width="32" height="32" rx="10"
        fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" strokeWidth="1.2"/>
      <rect x="32" y="222" width="20" height="13" rx="3" fill="none" stroke="var(--accent)" strokeWidth="1.3"/>
      <path d="M42 222v-8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M39 217l3-3 3 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* "Add to Home Screen" label */}
      <rect x="64" y="214" width="68" height="5" rx="2" fill="var(--text)" opacity="0.5"/>
      <rect x="64" y="223" width="48" height="3.5" rx="1.5" fill="var(--text3)" opacity="0.28"/>
      {/* Divider */}
      <line x1="26" y1="248" x2="134" y2="248" stroke="var(--border)" strokeWidth="0.5"/>
      {/* Cancel button */}
      <rect x="26" y="254" width="108" height="24" rx="8" fill="var(--bg2)"/>
      <rect x="52" y="262" width="56" height="4" rx="2" fill="var(--text3)" opacity="0.25"/>
      {/* Home indicator */}
      <rect x="56" y="282" width="48" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
    </svg>
  );
}

function AndroidIllustration() {
  return (
    <svg viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 130, height: "auto" }}>
      {/* Phone body */}
      <rect x="10" y="4" width="140" height="292" rx="20" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      <rect x="7.5" y="80" width="3" height="22" rx="1.5" fill="var(--border2)"/>
      <rect x="7.5" y="108" width="3" height="22" rx="1.5" fill="var(--border2)"/>
      <rect x="149.5" y="95" width="3" height="30" rx="1.5" fill="var(--border2)"/>
      {/* Screen */}
      <rect x="18" y="18" width="124" height="264" rx="14" fill="var(--bg)"/>
      {/* Punch-hole camera */}
      <circle cx="80" cy="28" r="5" fill="var(--bg2)"/>
      <circle cx="80" cy="28" r="3" fill="var(--bg3)"/>
      {/* Chrome top bar */}
      <rect x="18" y="18" width="124" height="38" rx="14" fill="var(--bg2)"/>
      <rect x="18" y="38" width="124" height="18" fill="var(--bg2)"/>
      {/* URL bar */}
      <rect x="26" y="28" width="86" height="20" rx="10" fill="var(--bg3)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="36" y="35" width="52" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      {/* Three-dot menu (highlighted) */}
      <circle cx="126" cy="31" r="2.4" fill="var(--accent)"/>
      <circle cx="126" cy="38" r="2.4" fill="var(--accent)"/>
      <circle cx="126" cy="45" r="2.4" fill="var(--accent)"/>
      {/* Dropdown menu */}
      <rect x="82" y="54" width="56" height="100" rx="8" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      {/* Highlighted row */}
      <rect x="84" y="56" width="52" height="24" rx="4" fill="color-mix(in srgb, var(--accent) 10%, transparent)"/>
      <rect x="90" y="62" width="40" height="4" rx="2" fill="var(--accent)" opacity="0.65"/>
      <rect x="90" y="70" width="28" height="3" rx="1.5" fill="var(--accent)" opacity="0.35"/>
      {/* Divider */}
      <line x1="84" y1="82" x2="136" y2="82" stroke="var(--border)" strokeWidth="0.5"/>
      {/* Other rows */}
      <rect x="90" y="89" width="36" height="4" rx="2" fill="var(--text3)" opacity="0.22"/>
      <rect x="90" y="105" width="32" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="90" y="121" width="38" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="90" y="137" width="28" height="4" rx="2" fill="var(--text3)" opacity="0.15"/>
      {/* Content: chart */}
      <rect x="26" y="164" width="108" height="62" rx="8" fill="var(--bg2)"/>
      <polyline points="34,216 50,200 64,204 78,188 94,194 110,180 126,186"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="34,216 50,200 64,204 78,188 94,194 110,180 126,186 126,222 34,222"
        fill="var(--accent)" opacity="0.08"/>
      {/* Placeholder lines */}
      <rect x="26" y="234" width="70" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      <rect x="26" y="244" width="54" height="4" rx="2" fill="var(--text3)" opacity="0.13"/>
      {/* Android nav bar */}
      <rect x="18" y="266" width="124" height="16" rx="14" fill="var(--bg2)"/>
      <path d="M52 274 l-5 0 2-2 m-2 2 2 2" stroke="var(--border2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="80" cy="274" r="4" fill="none" stroke="var(--border2)" strokeWidth="1.2"/>
      <rect x="104" y="270" width="7" height="7" rx="1.5" fill="none" stroke="var(--border2)" strokeWidth="1.2"/>
    </svg>
  );
}

function DesktopIllustration() {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 240, height: "auto" }}>
      {/* Browser window */}
      <rect x="4" y="4" width="252" height="192" rx="10" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5"/>
      {/* Title bar */}
      <rect x="4" y="4" width="252" height="32" rx="10" fill="var(--bg3)"/>
      <rect x="4" y="24" width="252" height="12" fill="var(--bg3)"/>
      {/* Window controls */}
      <circle cx="22" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      <circle cx="36" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      <circle cx="50" cy="20" r="4.5" fill="var(--border2)" opacity="0.55"/>
      {/* Tab */}
      <rect x="70" y="8" width="100" height="22" rx="6" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.5"/>
      <rect x="80" y="15" width="56" height="5" rx="2.5" fill="var(--text3)" opacity="0.28"/>
      {/* Address bar */}
      <rect x="14" y="40" width="232" height="26" rx="8" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.7"/>
      {/* Lock icon */}
      <path d="M25 51v-2.5a3 3 0 016 0V51" stroke="var(--text3)" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      <rect x="23" y="51" width="10" height="8" rx="2" fill="none" stroke="var(--text3)" strokeWidth="1" opacity="0.4"/>
      {/* URL text */}
      <rect x="40" y="51" width="118" height="5" rx="2" fill="var(--text3)" opacity="0.2"/>
      {/* Separator */}
      <line x1="178" y1="44" x2="178" y2="62" stroke="var(--border)" strokeWidth="0.5"/>
      {/* Install icon (highlighted) */}
      <circle cx="218" cy="53" r="10" fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" strokeWidth="1.3"/>
      <path d="M218 47v8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M214.5 52l3.5 3.5 3.5-3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="213" y1="57" x2="223" y2="57" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Install popup */}
      <rect x="176" y="70" width="80" height="36" rx="8" fill="var(--card-bg)" stroke="var(--border)" strokeWidth="0.7"/>
      <path d="M218 70 l-5 -5 h10 z" fill="var(--card-bg)"/>
      <line x1="213" y1="70" x2="223" y2="70" stroke="var(--card-bg)" strokeWidth="1.5"/>
      <rect x="184" y="78" width="64" height="4.5" rx="2" fill="var(--text2)" opacity="0.5"/>
      <rect x="190" y="87" width="52" height="3.5" rx="1.5" fill="var(--text3)" opacity="0.28"/>
      <rect x="194" y="94" width="44" height="3" rx="1.5" fill="var(--text3)" opacity="0.18"/>
      {/* Content: sidebar */}
      <rect x="14" y="112" width="52" height="72" rx="0" fill="var(--bg2)"/>
      <rect x="14" y="168" width="52" height="16" rx="0" fill="var(--bg2)" style={{ borderRadius: "0 0 0 8px" }}/>
      <rect x="22" y="120" width="36" height="4" rx="2" fill="var(--text3)" opacity="0.18"/>
      <rect x="22" y="130" width="30" height="4" rx="2" fill="var(--accent)" opacity="0.35"/>
      <rect x="22" y="140" width="34" height="4" rx="2" fill="var(--text3)" opacity="0.14"/>
      <rect x="22" y="150" width="28" height="4" rx="2" fill="var(--text3)" opacity="0.14"/>
      <rect x="22" y="160" width="32" height="4" rx="2" fill="var(--text3)" opacity="0.11"/>
      {/* Content: chart */}
      <rect x="74" y="112" width="172" height="72" rx="0" fill="var(--bg)"/>
      <polyline points="84,172 104,154 122,160 144,140 164,146 184,130 206,136 228,122 238,128"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <polygon points="84,172 104,154 122,160 144,140 164,146 184,130 206,136 228,122 238,128 238,180 84,180"
        fill="var(--accent)" opacity="0.07"/>
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    key: "iphone",
    label: "iPhone",
    sub: "Safari required",
    Illustration: IPhoneIllustration,
    steps: [
      "Tap the Share button at the bottom of Safari",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    key: "android",
    label: "Android",
    sub: "Chrome required",
    Illustration: AndroidIllustration,
    steps: [
      "Tap the three-dot menu in Chrome",
      'Tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    key: "desktop",
    label: "Desktop",
    sub: "Chrome or Edge",
    Illustration: DesktopIllustration,
    steps: [
      "Click the install icon in the address bar",
      'Click "Install"',
      "Corvo opens as a standalone app",
    ],
  },
];

const ORBS = [
  { size: 600, top: "-8%", left: "-14%", duration: 12 },
  { size: 450, top: "28%", right: "-10%", duration: 15 },
  { size: 380, top: "62%", left: "8%", duration: 18 },
  { size: 320, top: "14%", right: "18%", duration: 10 },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InstallPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--bg)", color: "var(--text)", overflowX: "hidden" }}>
      <style>{`
        .install-hero { padding: 140px 56px 64px; }
        .install-cards { max-width: 1100px; margin: 0 auto; padding: 0 56px 96px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .install-card { border-color: var(--border); transition: border-color 0.25s ease; }
        .install-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important; }
        @media (max-width: 768px) {
          .install-hero { padding: 100px 24px 56px !important; }
          .install-cards { padding: 0 20px 80px !important; grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            // initial={false} required — do not remove
            initial={false}
            animate={{ y: [0, 28, 0] }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut", delay: i * -3 }}
            style={{
              position: "absolute",
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)",
              opacity: 0.052,
              top: orb.top,
              left: "left" in orb ? (orb as { left: string }).left : undefined,
              right: "right" in orb ? (orb as { right: string }).right : undefined,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <PublicNav />

        {/* ── Hero ── */}
        <div className="install-hero" style={{ textAlign: "center" }}>

          {/* Badge */}
          <motion.div
            // initial={false} required — do not remove
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ opacity: 0, y: 10, display: "inline-block", marginBottom: 32 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius: 24, background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              <span style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>Free PWA</span>
            </div>
          </motion.div>

          {/* Headline - each word animates in separately */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 18px", marginBottom: 14 }}>
            {["Install", "Corvo"].map((word, i) => (
              <motion.span
                key={word}
                // initial={false} required — do not remove
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{
                  opacity: 0,
                  y: 28,
                  display: "inline-block",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "clamp(36px, 6vw, 64px)",
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: -2,
                  lineHeight: 1.08,
                }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.15, ease: EASE }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Accent line draws left to right */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <motion.div
              // initial={false} required — do not remove
              initial={false}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              style={{
                scaleX: 0,
                opacity: 0,
                height: 2,
                width: 200,
                background: "linear-gradient(90deg, transparent, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent))",
                transformOrigin: "left center",
              }}
              transition={{ duration: 0.75, delay: 0.45, ease: EASE }}
            />
          </div>

          {/* Subtitle */}
          <motion.p
            // initial={false} required — do not remove
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ opacity: 0, y: 10, fontSize: "clamp(14px, 2vw, 17px)", color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}
            transition={{ duration: 0.5, delay: 0.48, ease: EASE }}
          >
            Add Corvo to your home screen for instant access and push notifications.
          </motion.p>
        </div>

        {/* ── Device Cards ── */}
        <div className="install-cards">
          {CARDS.map((card, cardIdx) => (
            <motion.div
              key={card.key}
              // initial={false} required — do not remove
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                opacity: 0,
                y: 20,
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "32px 24px",
                textAlign: "center",
              }}
              whileHover={{ y: -6, transition: { duration: 0.22, ease: EASE } }}
              transition={{ duration: 0.55, delay: cardIdx * 0.15, ease: EASE }}
              className="install-card"
            >
              {/* Device illustration */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, minHeight: 120 }}>
                <card.Illustration />
              </div>

              {/* Label */}
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: 0.5, marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", letterSpacing: 0.3, marginBottom: 26 }}>
                {card.sub}
              </div>

              {/* Steps */}
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
                {card.steps.map((step, stepIdx) => (
                  <motion.div
                    key={stepIdx}
                    // initial={false} required — do not remove
                    initial={false}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    style={{ opacity: 0, x: -8, display: "flex", gap: 10, alignItems: "flex-start" }}
                    transition={{ duration: 0.4, delay: cardIdx * 0.15 + 0.3 + stepIdx * 0.06, ease: EASE }}
                  >
                    <span style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--accent)",
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {stepIdx + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <motion.div
          // initial={false} required — do not remove
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ opacity: 0, y: 10, textAlign: "center", padding: "0 24px 88px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        >
          <span style={{ fontSize: 14, color: "var(--text3)" }}>Already installed?{" "}</span>
          <Link
            href="/app"
            style={{
              fontSize: 14,
              color: "var(--accent)",
              textDecoration: "none",
              borderBottom: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              paddingBottom: 1,
            }}
          >
            Open the app
          </Link>
        </motion.div>

        <PublicFooter />
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import FeedbackButton from "../../components/FeedbackButton";

const ANIM_EASE = [0.25, 0.1, 0.25, 1] as const;

function FadeUp({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      // initial={false} required — do not remove
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: ANIM_EASE, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media(max-width: 768px) {
          .ab-hero { padding: 100px 20px 56px !important; }
          .ab-body { padding: 48px 20px 64px !important; }
          .ab-founder { padding: 0 20px 80px !important; }
        }
      `}</style>

      <PublicNav />

      {/* Hero */}
      <div className="ab-hero" style={{ padding: "140px 56px 32px", textAlign: "center" }}>
        <FadeUp>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius: 24, marginBottom: 32, background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--accent)", textTransform: "uppercase" }}>About</span>
          </div>
          <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 700, color: "var(--text)", letterSpacing: -1.5, lineHeight: 1.1, maxWidth: 1040, margin: "0 auto 16px" }}>
            Most apps show you what happened. Corvo tells you what to do about it.
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text2)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            Every tool was expensive, outdated, or ugly. So I built a better one.
          </p>
        </FadeUp>
      </div>

      {/* Story */}
      <div className="ab-body" style={{ maxWidth: 640, margin: "0 auto", padding: "24px 56px 80px", textAlign: "center" }}>
        <FadeUp delay={0.05}>
          <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.9, fontWeight: 300, marginBottom: 28 }}>
            I have always been obsessed with finance and investing. Tracking positions, running analysis, trying to actually understand what my portfolio was doing. But every tool I tried felt like it was built for someone else. The good ones cost money. The free ones were stuck in 2012. None of them felt like they were built by someone who actually cared.
          </p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.9, fontWeight: 300, marginBottom: 28 }}>
            So I built Corvo. It started as a personal project, a way to see my portfolio the way I actually wanted to see it. Real metrics. AI that gives useful context. An interface that does not make you feel like you are filing taxes.
          </p>
        </FadeUp>
        <FadeUp delay={0.15}>
          <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.9, fontWeight: 300 }}>
            It is still a project. I work on it constantly. Every week there is something new, something better. Built by one person who uses it every day.
          </p>
        </FadeUp>
      </div>

      {/* Founder */}
      <div className="ab-founder" style={{ maxWidth: 640, margin: "0 auto", padding: "0 56px 96px" }}>
        <FadeUp>
          <div style={{ borderRadius: 14, background: "var(--card-bg)", border: "0.5px solid var(--border)", borderLeft: "3px solid var(--accent)", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 0 }}>Founder</p>
            <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, lineHeight: 1.2, margin: 0 }}>
              Vinay Batra
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
              Sophomore in high school. Built Corvo because every portfolio tool was either expensive, outdated, or ugly.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 300 }}>United States</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="9" height="9" rx="2" fill="var(--text-muted)" opacity="0.7"/>
                  <rect x="13" y="2" width="9" height="9" rx="2" fill="var(--text-muted)" opacity="0.4"/>
                  <rect x="2" y="13" width="9" height="9" rx="2" fill="var(--text-muted)" opacity="0.4"/>
                  <rect x="13" y="13" width="9" height="9" rx="2" fill="var(--text-muted)" opacity="0.7"/>
                </svg>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 300 }}>Building Sense</span>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 300 }}>March 2026</span>
              </div>
            </div>
            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
              <a
                href="https://www.linkedin.com/in/vinay-batra/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 13, fontWeight: 400, textDecoration: "none", background: "transparent", transition: "border-color 0.2s, color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text2)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            </div>
          </div>
        </FadeUp>
      </div>

      <PublicFooter />
      <FeedbackButton />
    </div>
  );
}

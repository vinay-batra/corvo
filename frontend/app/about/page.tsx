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
      // initial={false} is required — do not remove
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
          .ab-divider { padding: 0 20px !important; }
        }
      `}</style>

      <PublicNav />

      {/* Hero */}
      <div className="ab-hero" style={{ padding: "140px 56px 72px", textAlign: "center" }}>
        <FadeUp>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.08)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>About</span>
          </div>
          <h1 style={{ fontFamily: "Space Mono, monospace", fontSize: "clamp(30px, 6vw, 58px)", fontWeight: 700, color: "var(--text)", letterSpacing: -2, lineHeight: 1.05, marginBottom: 22 }}>
            Built out of frustration.
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text2)", fontWeight: 300, maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            Every tool was expensive, outdated, or ugly. So I built a better one.
          </p>
        </FadeUp>
      </div>

      {/* Divider */}
      <div className="ab-divider" style={{ maxWidth: 640, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
      </div>

      {/* Story */}
      <div className="ab-body" style={{ maxWidth: 640, margin: "0 auto", padding: "64px 56px 80px" }}>
        <FadeUp delay={0.05}>
          <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.9, fontWeight: 300, marginBottom: 30 }}>
            I have always been obsessed with finance and investing. Tracking positions, running analysis, trying to actually understand what my portfolio was doing. But every tool I tried felt like it was built for someone else. The good ones cost money. The free ones were stuck in 2012. None of them felt like they were built by someone who actually cared.
          </p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.9, fontWeight: 300, marginBottom: 30 }}>
            So I built Corvo. It started as a personal project, a way to see my portfolio the way I actually wanted to see it. Real metrics. AI that gives useful context. An interface that does not make you feel like you are filing taxes.
          </p>
        </FadeUp>
        <FadeUp delay={0.15}>
          <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.9, fontWeight: 300 }}>
            It is still a project. I work on it constantly. Every week there is something new, something better. Built by one person who uses it every day.
          </p>
        </FadeUp>
      </div>

      {/* Founder */}
      <div className="ab-founder" style={{ maxWidth: 640, margin: "0 auto", padding: "0 56px 96px" }}>
        <FadeUp>
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 14, padding: "28px 32px", background: "var(--card-bg)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, var(--accent), transparent)" }} />
            <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 22 }}>Founder</p>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontFamily: "Space Mono, monospace", fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.2 }}>
                  Vinay Batra
                </h2>
                <p style={{ fontSize: 13, color: "var(--text3)", fontWeight: 300, lineHeight: 1.5 }}>
                  Builder, finance aficionado, perpetual work in progress.
                </p>
              </div>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", padding: "4px 12px", borderRadius: 20, flexShrink: 0, letterSpacing: 0.5, alignSelf: "flex-start" }}>
                v0.16
              </span>
            </div>
          </div>
        </FadeUp>
      </div>

      <PublicFooter />
      <FeedbackButton />
    </div>
  );
}

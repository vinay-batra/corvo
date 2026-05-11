"use client";

import React, { useRef, useState, useEffect } from "react";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function ScrollReveal({ children, delay = 0, from = "up", distance = 30, style = {} }: { children: React.ReactNode; delay?: number; from?: "up"|"left"|"right"; distance?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal(0.1);
  const transform = from === "left" ? `translateX(-${distance}px)` : from === "right" ? `translateX(${distance}px)` : `translateY(${distance}px)`;
  return (
    <div ref={ref} style={{ ...style, opacity: visible ? 1 : 0, transform: visible ? "none" : transform, transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function AnimatedHeading({ text, style = {} }: { text: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const words = text.split(" ");
  const offsets: number[] = [];
  let acc = 0;
  words.forEach(w => { offsets.push(acc); acc += w.length; });
  return (
    <h1 ref={ref} style={style}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", marginRight: "0.3em" }}>
          {word.split("").map((char, ci) => {
            const delay = (offsets[wi] + ci) * 0.03;
            return (
              <span key={ci} style={{
                display: "inline-block",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-40px)",
                transition: `opacity 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s, transform 0.6s cubic-bezier(0.215,0.61,0.355,1) ${delay}s`,
                willChange: "transform, opacity",
              }}>{char}</span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

export default function BlogHero() {
  return (
    <div className="blog-hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <ScrollReveal from="up" delay={0} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 24, marginBottom: 28, background: "rgba(201,168,76,0.08)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", display: "inline-block" }} />
        <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#c9a84c", textTransform: "uppercase" }}>Corvo Blog</span>
      </ScrollReveal>
      <AnimatedHeading
        text="Investing insights. Portfolio strategy."
        style={{ fontFamily: "Space Mono,monospace", fontSize: "clamp(28px,5vw,58px)", fontWeight: 700, color: "var(--text)", letterSpacing: -2, lineHeight: 1.08, marginBottom: 20 }}
      />
      <ScrollReveal from="up" delay={0.15}>
        <p style={{ fontSize: 17, color: "var(--text2)", fontWeight: 300, lineHeight: 1.75, maxWidth: 560 }}>
          Investing insights, product updates, and portfolio strategy from the Corvo team.
        </p>
      </ScrollReveal>
    </div>
  );
}

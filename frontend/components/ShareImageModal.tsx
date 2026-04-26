"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ShareImageModalProps {
  assets: { ticker: string; weight: number }[];
  data: {
    portfolio_return?: number;
    sharpe_ratio?: number;
    health_score?: number;
    max_drawdown?: number;
    portfolio_volatility?: number;
  };
  onClose: () => void;
}

export default function ShareImageModal({ assets, data, onClose }: ShareImageModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "done">("idle");

  const ret    = data.portfolio_return     != null ? +(data.portfolio_return * 100).toFixed(1)     : 0;
  const sharpe = data.sharpe_ratio         != null ? +data.sharpe_ratio.toFixed(2)                 : 0;
  const health = data.health_score         ?? 78;
  const dd     = data.max_drawdown         != null ? +(data.max_drawdown * 100).toFixed(1)         : 0;
  const vol    = data.portfolio_volatility != null ? +(data.portfolio_volatility * 100).toFixed(1) : 0;

  const buildImageUrl = useCallback(() => {
    const tickers  = assets.map(a => a.ticker).join(",");
    const weights  = assets.map(a => (a.weight * 100).toFixed(1)).join(",");
    const isLight  = typeof document !== "undefined" &&
                     document.documentElement.getAttribute("data-theme") === "light";
    const params = new URLSearchParams({
      tickers, weights,
      ret:      ret.toString(),
      sharpe:   sharpe.toString(),
      health:   health.toString(),
      drawdown: dd.toString(),
      vol:      vol.toString(),
      theme:    isLight ? "light" : "dark",
    });
    return `${API_URL}/portfolio/share-image?${params}`;
  }, [assets, ret, sharpe, health, dd, vol]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setImageUrl(null);
    const url = buildImageUrl();
    const img = new Image();
    img.onload  = () => { setImageUrl(url); setLoading(false); };
    img.onerror = () => { setError(true);   setLoading(false); };
    img.src = url;
  }, [buildImageUrl]);

  const retSign = ret >= 0 ? "+" : "";
  const tweetText = encodeURIComponent(
    `My portfolio is ${retSign}${ret}% with a Sharpe of ${sharpe}. Analyzed with @corvocapital. Try it free: corvo.capital`
  );
  const tweetUrl     = `https://twitter.com/intent/tweet?text=${tweetText}`;
  const linkedInUrl  = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://corvo.capital")}`;

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "corvo-portfolio-card.png";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  };

  const handleCopyImage = async () => {
    if (!imageUrl || copyState !== "idle") return;
    setCopyState("copying");
    try {
      const res  = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      await navigator.clipboard.writeText(imageUrl).catch(() => {});
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2200);
    }
  };

  return (
    <motion.div
      // initial={false} is required — do not remove
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
      <motion.div
        // initial={false} is required — do not remove
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 28,
          width: "100%",
          maxWidth: 600,
          position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.04)",
        }}>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "var(--bg3)", border: "1px solid var(--border)",
            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
            color: "var(--text3)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 9, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
            Share Portfolio Card
          </p>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", letterSpacing: -0.3 }}>
            {assets.slice(0, 4).map(a => a.ticker).join("  ·  ")}
            {assets.length > 4 ? `  +${assets.length - 4}` : ""}
          </h2>
        </div>

        {/* Image preview */}
        <div style={{
          width: "100%", aspectRatio: "1200/630",
          borderRadius: 12, overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--bg2)",
          marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                <circle cx="14" cy="14" r="11" stroke="rgba(184,134,11,0.18)" strokeWidth="2.5"/>
                <path d="M14 3 A11 11 0 0 1 25 14" stroke="#b8860b" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize: 11, color: "var(--text3)" }}>Generating image…</p>
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <p style={{ fontSize: 13, color: "rgba(224,92,92,0.8)", marginBottom: 8 }}>Image generation failed</p>
              <p style={{ fontSize: 11, color: "var(--text3)" }}>Check backend logs</p>
            </div>
          )}
          {imageUrl && !loading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Portfolio card" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Share on X */}
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 9,
              background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: 12, fontWeight: 500,
              textDecoration: "none", justifyContent: "center",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <svg width="13" height="13" viewBox="0 0 300 300" fill="currentColor">
              <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"/>
            </svg>
            Share on X
          </a>

          {/* LinkedIn */}
          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 9,
              background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: 12, fontWeight: 500,
              textDecoration: "none", justifyContent: "center",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>

          {/* Copy image */}
          <button onClick={handleCopyImage} disabled={!imageUrl || loading}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              flex: 1, minWidth: 110, padding: "10px 14px", borderRadius: 9,
              background: copyState === "done" ? "rgba(92,184,138,0.1)" : "var(--bg3)",
              border: `1px solid ${copyState === "done" ? "rgba(92,184,138,0.35)" : "var(--border)"}`,
              color: copyState === "done" ? "#5cb88a" : "var(--text)",
              fontSize: 12, fontWeight: 500,
              cursor: !imageUrl || loading ? "not-allowed" : "pointer",
              justifyContent: "center", transition: "all 0.2s",
              opacity: !imageUrl || loading ? 0.45 : 1,
            }}>
            {copyState === "done" ? <>Copied!</> : copyState === "copying" ? <>Copying...</> : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy Image
              </>
            )}
          </button>

          {/* Download */}
          <button onClick={handleDownload} disabled={!imageUrl || loading}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              flex: 1, minWidth: 110, padding: "10px 14px", borderRadius: 9,
              background: "var(--accent)", border: "none", color: "#0a0e14",
              fontSize: 12, fontWeight: 700,
              cursor: !imageUrl || loading ? "not-allowed" : "pointer",
              justifyContent: "center", transition: "opacity 0.15s",
              opacity: !imageUrl || loading ? 0.45 : 1,
            }}
            onMouseEnter={e => { if (imageUrl && !loading) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = !imageUrl || loading ? "0.45" : "1"; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 3v13M7 12l5 5 5-5"/><path d="M5 20h14"/>
            </svg>
            Download
          </button>
        </div>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </motion.div>
  );
}

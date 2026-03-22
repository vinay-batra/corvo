"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

function CorvoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <motion.polygon points="20,2 35,11 35,29 20,38 5,29 5,11"
        stroke="#00ffb3" strokeWidth="1.5" fill="none"
        strokeDasharray="120"
        initial={{ strokeDashoffset: 120 }} animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 6px rgba(0,255,179,0.5))" }} />
      <motion.path d="M26 14 A8 8 0 1 0 26 26"
        stroke="#00ffb3" strokeWidth="2.5" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        style={{ filter: "drop-shadow(0 0 4px rgba(0,255,179,0.7))" }} />
      <motion.circle cx="20" cy="20" r="2" fill="#00ffb3"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 1.4, type: "spring" }}
        style={{ filter: "drop-shadow(0 0 4px #00ffb3)" }} />
    </svg>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? "Google sign-in failed — please try again." : null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true); setError(null); setSuccess(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = nextPath;
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Check your email to confirm your account, then log in.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#01020a", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, position: "relative", overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
      `}</style>

      {/* Grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,255,179,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,179,0.01) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Glow orbs */}
      <div style={{ position: "fixed", top: "20%", left: "30%", width: 400, height: 400, background: "radial-gradient(circle, rgba(0,255,179,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "25%", width: 300, height: 300, background: "radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Back to home */}
      <motion.a href="/" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
        style={{ position: "fixed", top: 24, left: 28, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(224,232,255,0.4)", textDecoration: "none", transition: "color 0.2s", letterSpacing: 0.5 }}
        onMouseEnter={e => e.currentTarget.style.color = "rgba(224,232,255,0.8)"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(224,232,255,0.4)"}
      >
        <span style={{ fontSize: 14 }}>←</span> Corvo
      </motion.a>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: 400, background: "rgba(4,8,24,0.96)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "40px 36px", position: "relative", overflow: "hidden", zIndex: 1, backdropFilter: "blur(20px)" }}
      >
        {/* Top accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,255,179,0.6), transparent)", transformOrigin: "left" }} />

        {/* Corner glow */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(0,255,179,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <CorvoMark size={40} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: 5, color: "#00ffb3", textShadow: "0 0 20px rgba(0,255,179,0.3)" }}>CORVO</span>
          </a>
          <p style={{ fontSize: 11, color: "rgba(224,232,255,0.3)", marginTop: 6, letterSpacing: 2, fontFamily: "'Space Mono', monospace" }}>Portfolio Intelligence</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 3, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, letterSpacing: 1,
              background: mode === m ? "rgba(0,255,179,0.1)" : "transparent",
              border: mode === m ? "1px solid rgba(0,255,179,0.25)" : "1px solid transparent",
              color: mode === m ? "#00ffb3" : "rgba(224,232,255,0.35)",
              fontFamily: "'Inter', sans-serif", cursor: "pointer", transition: "all 0.2s", fontWeight: 600,
              textTransform: "uppercase",
            }}>{m === "login" ? "Log In" : "Sign Up"}</button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{ width: "100%", padding: "12px", marginBottom: 20, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(224,232,255,0.7)", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: 10, color: "rgba(224,232,255,0.2)", letterSpacing: 2, fontFamily: "'Space Mono', monospace" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            { type: "email", placeholder: "Email address", value: email, onChange: setEmail, field: "email" },
            { type: "password", placeholder: "Password", value: password, onChange: setPassword, field: "password" },
          ].map(({ type, placeholder, value, onChange, field }) => (
            <div key={field} style={{ position: "relative" }}>
              <input
                type={type} placeholder={placeholder} value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()}
                onFocus={() => setFocusedField(field)}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: "100%", padding: "12px 16px",
                  background: focusedField === field ? "rgba(0,255,179,0.03)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${focusedField === field ? "rgba(0,255,179,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 12, color: "#f0f4ff", fontSize: 14, fontFamily: "'Inter', sans-serif",
                  outline: "none", transition: "all 0.2s", letterSpacing: 0.3,
                }}
              />
            </div>
          ))}
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 12, color: "#f87171", marginBottom: 14, lineHeight: 1.5 }}>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 14px", background: "rgba(0,255,179,0.06)", border: "1px solid rgba(0,255,179,0.2)", borderRadius: 10, fontSize: 12, color: "#00ffb3", marginBottom: 14, lineHeight: 1.5 }}>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          onClick={handle} disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.99 }}
          style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 12, letterSpacing: 2, background: loading ? "rgba(0,255,179,0.04)" : "rgba(0,255,179,0.1)", border: "1px solid rgba(0,255,179,0.35)", color: "#00ffb3", fontFamily: "'Inter', sans-serif", cursor: loading ? "default" : "pointer", transition: "all 0.2s", fontWeight: 700, textTransform: "uppercase", boxShadow: loading ? "none" : "0 0 20px rgba(0,255,179,0.08)" }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, border: "1.5px solid rgba(0,255,179,0.2)", borderTopColor: "#00ffb3", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </span>
          ) : mode === "login" ? "Log In" : "Create Account"}
        </motion.button>

        {mode === "signup" && (
          <p style={{ marginTop: 16, fontSize: 11, color: "rgba(224,232,255,0.2)", textAlign: "center", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
            By signing up you agree to our terms of service.
          </p>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#01020a" }} />}>
      <AuthForm />
    </Suspense>
  );
}

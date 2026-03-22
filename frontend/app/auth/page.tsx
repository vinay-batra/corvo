"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app";
  const callbackError = searchParams.get("error");

  const [mode, setMode]       = useState<"login" | "signup">("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(callbackError ? "Google sign-in failed — please try again." : null);
  const [success, setSuccess] = useState<string | null>(null);

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
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`,
      },
    });
  };

  const inputStyle = {
    padding: "12px 16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020408", position: "relative", margin: 0, padding: 0 }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,200,150,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: 400, padding: "40px", background: "rgba(2,8,18,0.9)", border: "1px solid rgba(0,255,160,0.15)", borderRadius: 16, position: "relative", overflow: "hidden", zIndex: 1 }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #00ffa0, transparent)", opacity: 0.6 }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="20,2 35,11 35,29 20,38 5,29 5,11" stroke="#00ffa0" strokeWidth="1.5" fill="none" style={{filter:"drop-shadow(0 0 6px rgba(0,255,160,0.6))"}}/>
              <path d="M26 14 A8 8 0 1 0 26 26" stroke="#00ffa0" strokeWidth="2.5" strokeLinecap="round" fill="none" style={{filter:"drop-shadow(0 0 4px rgba(0,255,160,0.8))"}}/>
              <circle cx="20" cy="20" r="2" fill="#00ffa0" style={{filter:"drop-shadow(0 0 4px rgba(0,255,160,1))"}}/>
            </svg>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, letterSpacing: 5, color: "#00ffa0", textShadow: "0 0 24px rgba(0,255,160,0.4)" }}>
              CORVO
            </div>
          </a>
          <p style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", marginTop: 4, textTransform: "uppercase" }}>Portfolio Intelligence</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3, marginBottom: 24 }}>
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }} style={{
              flex: 1, padding: "8px", borderRadius: 6, fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
              background: mode === m ? "rgba(0,255,160,0.1)" : "transparent",
              border: mode === m ? "1px solid rgba(0,255,160,0.3)" : "1px solid transparent",
              color: mode === m ? "#00ffa0" : "rgba(226,232,240,0.3)",
              fontFamily: "'Orbitron', monospace", cursor: "pointer", transition: "all 0.2s",
            }}>{m === "login" ? "Log In" : "Sign Up"}</button>
          ))}
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} style={{
          width: "100%", padding: "12px", marginBottom: 16, borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(226,232,240,0.7)", fontSize: 13, cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: 11, color: "rgba(226,232,240,0.25)", letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "rgba(0,255,160,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handle()}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "rgba(0,255,160,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: "#ff4d6d", marginBottom: 12, textAlign: "center", lineHeight: 1.5 }}>
            {error}
          </motion.p>
        )}
        {success && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: "#00ffa0", marginBottom: 12, textAlign: "center", lineHeight: 1.5 }}>
            {success}
          </motion.p>
        )}

        <button onClick={handle} disabled={loading} style={{
          width: "100%", padding: "13px", borderRadius: 10, fontSize: 11, letterSpacing: 3,
          background: loading ? "transparent" : "rgba(0,255,160,0.1)",
          border: "1px solid rgba(0,255,160,0.4)",
          color: "#00ffa0", fontFamily: "'Orbitron', monospace",
          cursor: loading ? "default" : "pointer", transition: "all 0.2s",
        }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(0,255,160,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = loading ? "transparent" : "rgba(0,255,160,0.1)"; }}
        >
          {loading ? "..." : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
        </button>

        {mode === "signup" && (
          <p style={{ marginTop: 16, fontSize: 11, color: "rgba(226,232,240,0.25)", textAlign: "center", lineHeight: 1.6 }}>
            By signing up you agree to our terms of service.
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020408" }} />}>
      <AuthForm />
    </Suspense>
  );
}

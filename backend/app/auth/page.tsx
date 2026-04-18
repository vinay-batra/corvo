"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? "Google sign-in failed." : null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true); setError(null); setSuccess(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = nextPath;
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      });
      if (error) setError(error.message);
      else setSuccess("Password reset email sent , check your inbox.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    });
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%", padding: "11px 14px",
    background: "#fff",
    border: `0.5px solid ${focused === field ? "#111" : "rgba(0,0,0,0.12)"}`,
    borderRadius: 10, color: "#111", fontSize: 14,
    fontFamily: "'Inter', sans-serif", outline: "none", transition: "border-color 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back link */}
      <a href="/" style={{ position: "fixed", top: 24, left: 28, fontSize: 12, color: "#9b9b98", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.color = "#111"}
        onMouseLeave={e => e.currentTarget.style.color = "#9b9b98"}>
        ← Corvo
      </a>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: 400, background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 16, padding: "36px 32px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="1" y="1" width="38" height="38" rx="8" stroke="#111" strokeWidth="1.5"/>
              <path d="M14 28 A8 8 0 1 1 26 28" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="20" cy="20" r="2.5" fill="#111"/>
            </svg>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, letterSpacing: 4, color: "#111" }}>CORVO</span>
          </a>
          <p style={{ fontSize: 11, color: "#9b9b98", marginTop: 4, letterSpacing: 1 }}>Portfolio Intelligence</p>
        </div>

        {/* Mode tabs */}
        {mode !== "reset" && (
          <div style={{ display: "flex", background: "#f8f8f7", borderRadius: 10, padding: 3, marginBottom: 20, border: "0.5px solid rgba(0,0,0,0.08)" }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: m === mode ? 500 : 400, background: m === mode ? "#fff" : "transparent", border: m === mode ? "0.5px solid rgba(0,0,0,0.1)" : "0.5px solid transparent", color: m === mode ? "#111" : "#9b9b98", cursor: "pointer", letterSpacing: 0.3, transition: "all 0.15s" }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* Google */}
        {mode !== "reset" && (
          <button onClick={handleGoogle} style={{ width: "100%", padding: "11px", marginBottom: 16, borderRadius: 10, background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", color: "#111", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8f8f7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}

        {/* Divider */}
        {mode !== "reset" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.08)" }} />
            <span style={{ fontSize: 10, color: "#9b9b98", letterSpacing: 1 }}>OR</span>
            <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.08)" }} />
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {mode === "reset" && <p style={{ fontSize: 14, color: "#111", marginBottom: 4 }}>Enter your email to reset your password.</p>}
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
            style={inputStyle("email")} />
          {mode !== "reset" && (
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handle()}
              onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
              style={inputStyle("password")} />
          )}
        </div>

        {/* Forgot password link */}
        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}
              style={{ background: "none", border: "none", fontSize: 12, color: "#9b9b98", cursor: "pointer", textDecoration: "underline" }}>
              Forgot password?
            </button>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 12px", background: "#fef2f2", border: "0.5px solid rgba(192,57,43,0.2)", borderRadius: 8, fontSize: 12, color: "#c0392b", marginBottom: 12 }}>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 12px", background: "#f0fdf4", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, color: "#111", marginBottom: 12 }}>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button onClick={handle} disabled={loading}
          style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: loading ? "#f0efed" : "#111", border: "none", color: loading ? "#9b9b98" : "#fff", cursor: loading ? "default" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? (
            <><div style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Processing...</>
          ) : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
        </button>

        {mode === "reset" && (
          <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            style={{ width: "100%", marginTop: 10, padding: "10px", background: "transparent", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 10, fontSize: 13, color: "#6b6b68", cursor: "pointer" }}>
            Back to Log In
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8f8f7" }} />}>
      <AuthForm />
    </Suspense>
  );
}

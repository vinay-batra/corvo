"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

const C = {
  navy: "#0a0e14", navy2: "#0d1117", navy3: "#111620",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.12)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app";
  const [mode, setMode] = useState<"login"|"signup"|"reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [focused, setFocused] = useState<string|null>(null);

  const handle = async () => {
    setLoading(true); setError(null); setSuccess(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = nextPath;
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        setSuccess("Check your email to confirm your account.");
        // Best-effort welcome email (fire and forget)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        fetch(`${apiUrl}/send-welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {});
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      });
      if (error) setError(error.message);
      else setSuccess("Password reset email sent.");
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
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${focused === field ? C.amber : C.border}`,
    borderRadius: 10, color: C.cream, fontSize: 14,
    outline: "none", transition: "border-color 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.navy2, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      {/* Amber glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <a href="/" style={{ position: "fixed", top: 24, left: 28, fontSize: 11, color: C.cream3, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, letterSpacing: 1, transition: "color 0.2s", zIndex: 10 }}
        onMouseEnter={e => e.currentTarget.style.color = C.amber}
        onMouseLeave={e => e.currentTarget.style.color = C.cream3}>
        ← Corvo
      </a>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: 420, background: C.navy3, border: `1px solid ${C.border}`, borderRadius: 16, padding: "36px 32px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a1a,#0d0d0d)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <path d="M10 26 Q8 30 6 31 Q9 28 10 26Z" fill="#fff" opacity="0.55"/>
                <path d="M12 26 Q11 30 9 32 Q12 29 12 26Z" fill="#fff" opacity="0.45"/>
                <path d="M10 22 Q8 18 10 14 Q13 10 17 10 Q20 10 22 12 Q25 15 24 19 Q23 23 19 25 Q14 27 10 22Z" fill="#fff" opacity="0.92"/>
                <path d="M12 18 Q7 15 4 10 Q6 9 9 12 Q11 15 12 18Z" fill="#fff" opacity="0.7"/>
                <path d="M12 20 Q6 19 3 15 Q5 14 8 17 Q10 19 12 20Z" fill="#fff" opacity="0.5"/>
                <ellipse cx="20" cy="9" rx="4" ry="3.5" fill="#fff" opacity="0.95"/>
                <path d="M23.5 8 Q26 8.5 26.5 10 Q25 9.5 24 10.5 Q23.5 9 23.5 8Z" fill="#fff" opacity="0.85"/>
                <circle cx="21.2" cy="8.2" r="1.1" fill="#0d0d0d"/>
                <circle cx="21.5" cy="7.9" r="0.35" fill="rgba(255,255,255,0.7)"/>
                <path d="M16 13 Q19 12 21 15 Q19.5 13.5 16 13Z" fill="#c9a84c" opacity="0.3"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 4, color: C.cream }}>CORVO</span>
          </a>
          <p style={{ fontSize: 11, color: C.cream3, marginTop: 4, letterSpacing: 1 }}>Portfolio Intelligence</p>
        </div>

        {/* Mode tabs */}
        {mode !== "reset" && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3, marginBottom: 22, border: `1px solid ${C.border}` }}>
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: m===mode?500:400, background: m===mode ? "rgba(201,168,76,0.12)" : "transparent", border: m===mode ? `1px solid rgba(201,168,76,0.3)` : "1px solid transparent", color: m===mode ? C.amber : C.cream3, cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.3 }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* Google */}
        {mode !== "reset" && (
          <button onClick={handleGoogle}
            style={{ width: "100%", padding: "11px", marginBottom: 18, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.cream, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <span style={{ fontSize: 10, color: C.cream3, letterSpacing: 1 }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {mode === "reset" && <p style={{ fontSize: 13, color: C.cream2, marginBottom: 6 }}>Enter your email to reset your password.</p>}
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

        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}
              style={{ background: "none", border: "none", fontSize: 11, color: C.cream3, cursor: "pointer", letterSpacing: 0.3 }}>
              Forgot password?
            </button>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 12px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.25)", borderRadius: 8, fontSize: 12, color: "#e05c5c", marginBottom: 12 }}>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "10px 12px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8, fontSize: 12, color: C.amber, marginBottom: 12 }}>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handle} disabled={loading}
          style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: loading ? "rgba(201,168,76,0.3)" : C.amber, border: "none", color: loading ? C.cream3 : C.navy, cursor: loading ? "default" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3 }}>
          {loading ? (
            <><div style={{ width: 12, height: 12, border: `1.5px solid rgba(10,14,20,0.3)`, borderTopColor: C.navy, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Processing...</>
          ) : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
        </button>

        {mode === "reset" && (
          <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            style={{ width: "100%", marginTop: 10, padding: "11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.cream3, cursor: "pointer" }}>
            Back to Log In
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0d1117" }} />}>
      <AuthForm />
    </Suspense>
  );
}

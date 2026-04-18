"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { posthog } from "../../lib/posthog";

const C = {
  navy: "#0a0e14", navy2: "#0d1117", navy3: "#111620",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.12)",
  cream: "#e8e0cc", cream2: "rgba(232,224,204,0.5)", cream3: "rgba(232,224,204,0.25)",
  amber: "#c9a84c", amber2: "rgba(201,168,76,0.12)",
};

function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app";

  // Redirect already-authenticated users, hide form until check completes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { window.location.replace(nextPath); return; }
      setSessionChecked(true);
    });
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("corvo_referrer", ref);
  }, [searchParams]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [mode, setMode] = useState<"login"|"signup"|"reset"|"magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [magicSent, setMagicSent] = useState(false);
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
      const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        posthog.capture("signup_completed", { method: "email_password" });
        setSuccess("Check your email to confirm your account.");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const userId = signUpData.user?.id ?? null;
        const displayName = email.split("@")[0] || null;
        fetch(`${apiUrl}/send-welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, display_name: displayName, user_id: userId }),
        }).catch(() => {});
      }
    } else if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
      });
      if (error) setError(error.message);
      else setSuccess("Magic link sent! Check your email.");
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

  const handleMagicLink = async () => {
    if (!email) { setError("Enter your email address first."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setMagicSent(true);
  };

  const handleGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
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

  if (!sessionChecked) {
    return <div style={{ minHeight: "100vh", background: C.navy2 }} />;
  }

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
            <img src="/corvo-logo.svg" width={40} height={32} alt="Corvo" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 4, color: C.cream }}>CORVO</span>
          </a>
          <p style={{ fontSize: 11, color: C.cream3, marginTop: 4, letterSpacing: 1 }}>Portfolio Intelligence</p>
        </div>

        {/* Mode tabs */}
        {mode !== "reset" && mode !== "magic" && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3, marginBottom: 22, border: `1px solid ${C.border}` }}>
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: m===mode?500:400, background: m===mode ? "rgba(201,168,76,0.12)" : "transparent", border: m===mode ? `1px solid rgba(201,168,76,0.3)` : "1px solid transparent", color: m===mode ? C.amber : C.cream3, cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.3 }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* OAuth buttons */}
        {(mode === "login" || mode === "signup") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            <button onClick={handleGoogle}
              style={{ width: "100%", padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.cream, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "border-color 0.15s" }}
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
            <button onClick={handleGitHub}
              style={{ width: "100%", padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.cream, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={C.cream}>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>
        )}

        {/* Divider */}
        {(mode === "login" || mode === "signup") && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <span style={{ fontSize: 10, color: C.cream3, letterSpacing: 1 }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {mode === "reset" && <p style={{ fontSize: 13, color: C.cream2, marginBottom: 6 }}>Enter your email to reset your password.</p>}
          {mode === "magic" && <p style={{ fontSize: 13, color: C.cream2, marginBottom: 6 }}>We'll send you a one-click sign-in link. No password needed.</p>}
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
            onKeyDown={e => (mode === "magic" || mode === "reset") && e.key === "Enter" && handle()}
            style={inputStyle("email")} />
          {(mode === "login" || mode === "signup") && (
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handle()}
              onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
              style={inputStyle("password")} />
          )}
        </div>

        {mode === "login" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: C.amber, cursor: "pointer" }} />
              <span style={{ fontSize: 11, color: C.cream3 }}>Remember me</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setMode("magic"); setError(null); setSuccess(null); }}
                style={{ background: "none", border: "none", fontSize: 11, color: C.amber, cursor: "pointer", letterSpacing: 0.3, opacity: 0.7 }}>
                Magic link
              </button>
              <button onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}
                style={{ background: "none", border: "none", fontSize: 11, color: C.cream3, cursor: "pointer", letterSpacing: 0.3 }}>
                Forgot password?
              </button>
            </div>
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
          ) : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : mode === "magic" ? "Send Magic Link" : "Send Reset Email"}
        </button>

        {mode === "login" && (
          magicSent ? (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 10, padding: "10px 12px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8, fontSize: 12, color: C.amber, textAlign: "center" }}>
              Check your email. Magic link sent.
            </motion.div>
          ) : (
            <button onClick={handleMagicLink} disabled={loading}
              style={{ width: "100%", marginTop: 10, padding: "11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.cream3, cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.cream; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.cream3; }}>
              Send magic link instead
            </button>
          )
        )}

        {(mode === "reset" || mode === "magic") && (
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

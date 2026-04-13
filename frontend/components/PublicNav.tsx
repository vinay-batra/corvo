"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function PublicNav() {
  const [navSolid, setNavSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  return (
    <>
      <style>{`
        .pnav-link:hover { color: #c9a84c !important; }
        .pnav-cta:hover { background: #d4b558 !important; transform: translateY(-1px) !important; }
        @media(max-width: 900px) {
          .pnav-links { display: none !important; }
          .pnav-actions { display: none !important; }
          .pnav-hamburger { display: flex !important; }
          .pnav-pad { padding: 0 20px !important; }
        }
      `}</style>
      <nav className="pnav-pad" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px", background: navSolid ? "rgba(10,14,20,0.97)" : "rgba(10,14,20,0.6)", backdropFilter: "blur(20px)", borderBottom: navSolid ? "1px solid rgba(201,168,76,0.1)" : "1px solid rgba(201,168,76,0.04)", transition: "background 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "#e8e0cc" }}>CORVO</span>
        </Link>
        {/* Center links */}
        <div className="pnav-links" style={{ display: "flex", gap: 2, alignItems: "center", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <a href="/#features" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Features</a>
          <Link href="/app?demo=true" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Demo</Link>
          <Link href="/pricing" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/pricing") ? "#c9a84c" : "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Pricing</Link>
          <Link href="/blog" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/blog") ? "#c9a84c" : "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Blog</Link>
          <Link href="/changelog" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/changelog") ? "#c9a84c" : "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Changelog</Link>
          <Link href="/faq" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/faq") ? "#c9a84c" : "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>FAQ</Link>
          <Link href="/about" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/about") ? "#c9a84c" : "rgba(232,224,204,0.45)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>About</Link>
        </div>
        {/* Right side */}
        <div className="pnav-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {loggedIn ? (
            <Link href="/app" className="pnav-cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none", transition: "all 0.2s" }}>Go to App</Link>
          ) : (
            <>
              <Link href="/auth" className="pnav-link" style={{ padding: "7px 16px", fontSize: 12, color: "rgba(232,224,204,0.4)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Log in</Link>
              <Link href="/auth" className="pnav-cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "#c9a84c", borderRadius: 8, color: "#0a0e14", textDecoration: "none", transition: "all 0.2s" }}>Get Started</Link>
            </>
          )}
        </div>
        {/* Hamburger */}
        <button className="pnav-hamburger" aria-label="Open menu" onClick={() => setMobileOpen(v => !v)} style={{ display: "none", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", flexShrink: 0, color: "#e8e0cc" }}>
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
        </button>
      </nav>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", top: 58, left: 0, right: 0, zIndex: 99, background: "rgba(10,14,20,0.98)", borderBottom: "1px solid rgba(201,168,76,0.1)", backdropFilter: "blur(20px)", padding: "16px 24px 24px", display: "flex", flexDirection: "column" as const, gap: 0 }}>
          <a href="/#features" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>Features</a>
          <Link href="/app?demo=true" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>Demo</Link>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>Pricing</Link>
          <Link href="/blog" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>Blog</Link>
          <Link href="/changelog" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>Changelog</Link>
          <Link href="/faq" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>FAQ</Link>
          <Link href="/about" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "rgba(232,224,204,0.7)", textDecoration: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "block" }}>About</Link>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {loggedIn ? (
              <Link href="/app" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, fontWeight: 600, color: "#0a0e14", textDecoration: "none", background: "#c9a84c", borderRadius: 10 }}>Go to App</Link>
            ) : (
              <>
                <Link href="/auth" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, color: "rgba(232,224,204,0.6)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}>Log in</Link>
                <Link href="/auth" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, fontWeight: 600, color: "#0a0e14", textDecoration: "none", background: "#c9a84c", borderRadius: 10 }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

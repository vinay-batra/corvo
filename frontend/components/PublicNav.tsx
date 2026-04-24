"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserMenu from "./UserMenu";
import { Sun, Moon } from "lucide-react";

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("corvo_theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("corvo_theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const active = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  const navBg = "var(--bg)";

  const drawerBg = "var(--bg)";

  return (
    <>
      <style>{`
        .pnav-link:hover { color: var(--accent) !important; }
        .pnav-cta:hover { filter: brightness(1.1) !important; transform: translateY(-1px) !important; }
        @media(max-width: 900px) {
          .pnav-links { display: none !important; }
          .pnav-actions { display: none !important; }
          .pnav-hamburger { display: flex !important; }
          .pnav-pad { padding: 0 20px !important; }
          .pnav-mobile-link { min-height: 44px !important; display: flex !important; align-items: center !important; }
        }
      `}</style>
      <nav className="pnav-pad" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px", background: navBg, backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", transition: "background 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src="/corvo-logo.svg" width={28} height={28} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>CORVO</span>
        </Link>
        {/* Center links */}
        <div className="pnav-links" style={{ display: "flex", gap: 2, alignItems: "center", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <a href="/#features" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Features</a>
          <Link href="/app?demo=true" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Demo</Link>
          <Link href="/pricing" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/pricing") ? "var(--accent)" : "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Pricing</Link>
          <Link href="/changelog" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/changelog") ? "var(--accent)" : "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Changelog</Link>
          <Link href="/blog" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/blog") ? "var(--accent)" : "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Blog</Link>
          <Link href="/faq" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/faq") ? "var(--accent)" : "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>FAQ</Link>
          <Link href="/about" className="pnav-link" style={{ padding: "7px 14px", fontSize: 12, color: active("/about") ? "var(--accent)" : "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>About</Link>
        </div>
        {/* Right side */}
        <div className="pnav-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", transition: "color 0.2s, border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text2)"; }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {loggedIn ? (
            <UserMenu />
          ) : (
            <>
              <Link href="/auth" className="pnav-link" style={{ padding: "7px 16px", fontSize: 12, color: "var(--text3)", textDecoration: "none", letterSpacing: 0.3, transition: "color 0.2s" }}>Log in</Link>
              <Link href="/auth" className="pnav-cta" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "var(--accent)", borderRadius: 8, color: "var(--bg)", textDecoration: "none", transition: "all 0.2s" }}>Get Started</Link>
            </>
          )}
        </div>
        {/* Hamburger */}
        <button className="pnav-hamburger" aria-label="Open menu" onClick={() => setMobileOpen(v => !v)} style={{ display: "none", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", flexShrink: 0, color: "var(--text)" }}>
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
        </button>
      </nav>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", top: 58, left: 0, right: 0, zIndex: 99, background: drawerBg, borderBottom: "1px solid var(--border)", backdropFilter: "blur(20px)", padding: "16px 24px 24px", display: "flex", flexDirection: "column" as const, gap: 0 }}>
          <a href="/#features" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>Features</a>
          <Link href="/app?demo=true" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>Demo</Link>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>Pricing</Link>
          <Link href="/changelog" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>Changelog</Link>
          <Link href="/blog" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>Blog</Link>
          <Link href="/faq" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>FAQ</Link>
          <Link href="/about" onClick={() => setMobileOpen(false)} style={{ padding: "13px 4px", fontSize: 14, color: "var(--text2)", textDecoration: "none", borderBottom: "0.5px solid var(--border)", display: "block" }}>About</Link>
          {/* Mobile theme toggle */}
          <button
            onClick={() => { toggle(); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", fontSize: 14, color: "var(--text2)", background: "none", border: "none", borderBottom: "0.5px solid var(--border)", cursor: "pointer", textAlign: "left" as const, width: "100%" }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {loggedIn ? (
              <Link href="/app" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, fontWeight: 600, color: "var(--bg)", textDecoration: "none", background: "var(--accent)", borderRadius: 10 }}>Go to App</Link>
            ) : (
              <>
                <Link href="/auth" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, color: "var(--text2)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 10 }}>Log in</Link>
                <Link href="/auth" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center" as const, fontSize: 13, fontWeight: 600, color: "var(--bg)", textDecoration: "none", background: "var(--accent)", borderRadius: 10 }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

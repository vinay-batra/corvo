"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserMenu from "./UserMenu";
import { Sun, Moon } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

// Theme hook (mirrors useTheme in the rest of the app: localStorage backed,
// applies data-theme attribute to documentElement).
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("corvo_theme") : null;
    const isDark = stored ? stored === "dark" : false;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    if (typeof window !== "undefined") localStorage.setItem("corvo_theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

// Flat link list - 7 items, in display order.
interface NavLinkDef { href: string; label: string; external?: boolean; }
const NAV_LINKS: NavLinkDef[] = [
  { href: "/#features",  label: "Features",  external: true }, // anchor on the homepage
  { href: "/install",    label: "Install" },
  { href: "/pricing",    label: "Pricing" },
  { href: "/changelog",  label: "Changelog" },
  { href: "/blog",       label: "Blog" },
  { href: "/about",      label: "About" },
  { href: "/faq",        label: "FAQ" },
];

interface PublicNavProps {
  // Optional inner scroller. When provided, hide/show is driven by the
  // container's scrollTop instead of window.scrollY (used on the homepage,
  // which wraps everything in a 100vh overflow-auto container for GSAP).
  scrollerRef?: React.RefObject<HTMLElement | HTMLDivElement | null>;
}

export default function PublicNav({ scrollerRef }: PublicNavProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const prevScrollY = useRef(0);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const { canInstall, install } = usePWAInstall();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Scroll behavior: hide on scroll down, show on scroll up.
  //
  // Previous versions used scroll events on window and the optional scroller,
  // which worked on every page EXCEPT the homepage. The homepage wraps all
  // content in a 100vh overflow-auto container that also hosts GSAP
  // ScrollTrigger pinning - whatever combination of strict-mode timing, GSAP
  // ownership, and React 19's deferred ref attachment broke event delivery on
  // the container. Easier to bypass entirely: poll scrollTop in a
  // requestAnimationFrame loop. Bulletproof and ~free at 60fps.
  useEffect(() => {
    let raf = 0;
    let lastY: number | null = null;
    const tick = () => {
      const el = scrollerRef?.current ?? null;
      const currentY = el ? el.scrollTop : window.scrollY;
      if (lastY === null) {
        lastY = currentY;
        prevScrollY.current = currentY;
      } else if (currentY !== lastY) {
        setScrolled(currentY > 8);
        if (currentY < 10) {
          setHidden(false);
        } else if (currentY > lastY + 8) {
          setHidden(true);
        } else if (currentY < lastY - 4) {
          setHidden(false);
        }
        lastY = currentY;
        prevScrollY.current = currentY;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollerRef]);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const active = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  // Subtle background only after scrolling so the nav floats over the hero
  // when at the very top, then earns its solid backing as you scroll.
  const navBackground = scrolled
    ? "color-mix(in srgb, var(--bg) 86%, transparent)"
    : "color-mix(in srgb, var(--bg) 70%, transparent)";

  return (
    <>
      <style>{`
        /* Pill hover bubble used on every nav button/link */
        .pnav-bubble {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 36px;
          padding: 0 14px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text2);
          background: transparent;
          border: none;
          cursor: pointer;
          text-decoration: none;
          letter-spacing: 0.1px;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: inherit;
          white-space: nowrap;
        }
        .pnav-bubble:hover,
        .pnav-bubble[data-open="true"] {
          background: var(--bg3);
          color: var(--text);
        }
        .pnav-bubble.active { color: var(--text); }

        /* Get Started pill */
        .pnav-cta {
          display: inline-flex; align-items: center; gap: 5px;
          height: 36px;
          padding: 0 18px;
          font-size: 13px; font-weight: 600;
          background: var(--accent);
          color: var(--bg);
          border-radius: 9999px;
          text-decoration: none;
          transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          letter-spacing: 0.1px;
          white-space: nowrap;
        }
        .pnav-cta:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(var(--accent-rgb), 0.32);
        }

        /* Icon button (theme toggle, install) */
        .pnav-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px;
          background: transparent;
          border: none;
          border-radius: 9px;
          cursor: pointer;
          color: var(--text2);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .pnav-icon-btn:hover { background: var(--bg3); color: var(--text); }

        /* Mobile */
        @media (max-width: 768px) {
          .pnav-desktop-links { display: none !important; }
          .pnav-desktop-actions { display: none !important; }
          .pnav-hamburger { display: inline-flex !important; }
          .pnav-inner { padding: 0 18px !important; }
        }

        /* Mobile drawer */
        .pnav-mobile-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 4px;
          font-size: 14px; color: var(--text);
          border-bottom: 0.5px solid var(--border);
          background: transparent;
          border-left: none; border-right: none; border-top: none;
          width: 100%;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          text-align: left;
        }
      `}</style>

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 68,
          background: navBackground,
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.25s ease, border-color 0.25s ease",
          willChange: "transform",
        }}
      >
        {/* Inner container - matches the hero content max-width (1240) and
            horizontal padding (56px) so the logo aligns with the leading
            edge of the headline and the actions align with the trailing edge. */}
        <div
          className="pnav-inner"
          style={{
            position: "relative",
            height: "100%",
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
        {/* Logo - left */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <img src="/corvo-logo.png" width={38} height={38} alt="Corvo" style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.25))" }} />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>
            CORVO
          </span>
        </Link>

        {/* Desktop nav links - absolutely centered, 7 flat links */}
        <div
          className="pnav-desktop-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {NAV_LINKS.map(link =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                className={`pnav-bubble ${active(link.href) ? "active" : ""}`}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`pnav-bubble ${active(link.href) ? "active" : ""}`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {/* Desktop actions */}
          <div className="pnav-desktop-actions" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="pnav-icon-btn"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Install */}
            {canInstall && (
              <button
                onClick={install}
                className="pnav-bubble"
                style={{ fontWeight: 500 }}
                aria-label="Install Corvo as an app"
              >
                Install App
              </button>
            )}

            {/* Auth area */}
            {loggedIn ? (
              <UserMenu />
            ) : (
              <>
                <Link href="/auth" className="pnav-bubble">Log in</Link>
                <Link href="/auth?mode=signup" className="pnav-cta">Get Started</Link>
              </>
            )}
          </div>

          {/* Hamburger - mobile only */}
          <button
            className="pnav-hamburger"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(v => !v)}
            style={{
              display: "none",
              alignItems: "center", justifyContent: "center",
              width: 44, height: 44,
              background: "var(--bg3)", border: "1px solid var(--border)",
              borderRadius: 10, cursor: "pointer",
              flexShrink: 0, color: "var(--text)",
              marginLeft: 4,
            }}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: 68,
            left: 0,
            right: 0,
            zIndex: 99,
            background: "var(--bg)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            padding: "12px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            maxHeight: "calc(100vh - 68px)",
            overflowY: "auto",
          }}
        >
          {/* Flat 7-link list */}
          {NAV_LINKS.map(link =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="pnav-mobile-row"
                style={{ textDecoration: "none" }}
              >
                <span>{link.label}</span>
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="pnav-mobile-row"
                style={{ textDecoration: "none" }}
              >
                <span>{link.label}</span>
              </Link>
            )
          )}

          {/* Theme toggle row */}
          <button
            onClick={toggle}
            className="pnav-mobile-row"
            style={{ fontFamily: "inherit" }}
          >
            <span>{dark ? "Switch to light mode" : "Switch to dark mode"}</span>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Install on mobile */}
          {canInstall && (
            <button
              onClick={() => { setMobileOpen(false); install(); }}
              className="pnav-mobile-row"
            >
              <span>Install App</span>
            </button>
          )}

          {/* Auth row */}
          {!loggedIn && (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Link href="/auth" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "13px", textAlign: "center", fontSize: 13, color: "var(--text2)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 10 }}>Log in</Link>
              <Link href="/auth?mode=signup" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "13px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--bg)", textDecoration: "none", background: "var(--accent)", borderRadius: 9999 }}>Get Started</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}


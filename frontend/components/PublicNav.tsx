"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserMenu from "./UserMenu";
import {
  Sun, Moon, ChevronDown,
  LayoutDashboard, Sparkles, Sunrise, Activity, Target, TrendingUp,
  BookOpen, FileText, HelpCircle, Download,
} from "lucide-react";
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

// Dropdown item shape
type LucideIcon = typeof LayoutDashboard;
interface DropdownItem {
  href: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
}

const PRODUCT_ITEMS: DropdownItem[] = [
  { href: "/#features", title: "Dashboard",   desc: "Live portfolio with metrics, charts, and AI insights",  Icon: LayoutDashboard },
  { href: "/#features", title: "AI Advisor",  desc: "Chat with Corvo about your holdings and what to do next", Icon: Sparkles },
  { href: "/#features", title: "Daily Brief", desc: "Personalized morning summary of what moved your portfolio", Icon: Sunrise },
  { href: "/#features", title: "Health Score", desc: "A to F grade across diversification, risk, and efficiency", Icon: Activity },
  { href: "/#features", title: "Goal Tracker", desc: "Project retirement and milestones with Monte Carlo",       Icon: Target },
  { href: "/#features", title: "Simulations",  desc: "Drawdown, Monte Carlo, and what-if scenarios",             Icon: TrendingUp },
];

const RESOURCES_ITEMS: DropdownItem[] = [
  { href: "/blog",      title: "Blog",      desc: "Product updates and finance writing", Icon: BookOpen },
  { href: "/changelog", title: "Changelog", desc: "Every release, every change",          Icon: FileText },
  { href: "/faq",       title: "FAQ",       desc: "Common questions about Corvo",         Icon: HelpCircle },
  { href: "/install",   title: "Install",   desc: "Add Corvo to your home screen",        Icon: Download },
];

interface PublicNavProps {
  // Optional inner scroller. When provided, hide/show is driven by the
  // container's scrollTop instead of window.scrollY (used on the homepage,
  // which wraps everything in a 100vh overflow-auto container for GSAP).
  scrollerRef?: React.RefObject<HTMLElement | HTMLDivElement | null>;
}

type DropdownKey = "product" | "resources" | null;

export default function PublicNav({ scrollerRef }: PublicNavProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DropdownKey>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const prevScrollY = useRef(0);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const { canInstall, install } = usePWAInstall();

  // Dropdown state with hover delays so the panel doesn't dismiss when the
  // cursor moves from the trigger down into the dropdown.
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const openDrop = (which: DropdownKey) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpenDropdown(which), 80);
  };
  const closeDrop = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenDropdown(null), 180);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Scroll behavior: hide on scroll down, show on scroll up, listen to either
  // window or the optional inner scroller.
  useEffect(() => {
    const scrollEl = scrollerRef?.current ?? null;
    const readY = () => (scrollEl ? scrollEl.scrollTop : window.scrollY);
    const onScroll = () => {
      const currentY = readY();
      setScrolled(currentY > 8);
      if (currentY < 10) {
        setHidden(false);
      } else if (currentY > prevScrollY.current + 8) {
        setHidden(true);
        // Auto-close any open dropdown when nav hides
        setOpenDropdown(null);
      } else if (currentY < prevScrollY.current - 4) {
        setHidden(false);
      }
      prevScrollY.current = currentY;
    };
    const target: Window | HTMLElement = scrollEl ?? window;
    target.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => target.removeEventListener("scroll", onScroll as EventListener);
  }, [scrollerRef]);

  // Escape closes any open dropdown
  useEffect(() => {
    if (!openDropdown && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDropdown, mobileOpen]);

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
        .pnav-chev {
          transition: transform 0.18s ease, opacity 0.18s ease;
          opacity: 0.55;
        }
        .pnav-bubble[data-open="true"] .pnav-chev { transform: rotate(180deg); opacity: 1; }

        /* Dropdown panel */
        .pnav-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 360px;
          background: var(--card-bg);
          border: 1px solid var(--border2);
          border-radius: 14px;
          padding: 10px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.04) inset;
          z-index: 110;
          animation: pnav-dropdown-in 0.16s cubic-bezier(0.2,0.8,0.2,1);
        }
        @keyframes pnav-dropdown-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .pnav-dropdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
        }
        .pnav-dropdown-item {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: flex-start;
          padding: 10px 12px;
          border-radius: 9px;
          text-decoration: none;
          transition: background 0.12s ease;
        }
        .pnav-dropdown-item:hover { background: var(--bg3); }
        .pnav-dropdown-icon {
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(var(--accent-rgb), 0.10);
          border: 1px solid rgba(var(--accent-rgb), 0.20);
          border-radius: 8px;
          color: var(--accent);
          flex-shrink: 0;
        }
        .pnav-dropdown-item:hover .pnav-dropdown-icon {
          background: rgba(var(--accent-rgb), 0.16);
          border-color: rgba(var(--accent-rgb), 0.32);
        }
        .pnav-dropdown-title {
          font-size: 13px; font-weight: 600; color: var(--text);
          letter-spacing: -0.1px; line-height: 1.25;
        }
        .pnav-dropdown-desc {
          font-size: 11px; color: var(--text3); line-height: 1.5;
          margin-top: 3px; letter-spacing: 0.05px;
        }
        .pnav-dropdown-footer {
          margin-top: 6px; padding: 10px 12px 4px;
          border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .pnav-dropdown-cta {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: var(--accent);
          text-decoration: none;
          padding: 6px 10px; border-radius: 7px;
          transition: background 0.12s ease;
        }
        .pnav-dropdown-cta:hover { background: rgba(var(--accent-rgb), 0.10); }
        .pnav-dropdown-tagline {
          font-size: 10px; color: var(--text-muted);
          letter-spacing: 0.4px; text-transform: uppercase;
          font-family: var(--font-mono);
        }

        /* Vertical divider */
        .pnav-divider {
          width: 1px;
          height: 24px;
          background: var(--border);
          margin: 0 4px;
          flex-shrink: 0;
        }

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
          .pnav-divider { display: none !important; }
          .pnav-hamburger { display: inline-flex !important; }
          .pnav-pad { padding: 0 18px !important; }
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
        .pnav-mobile-row .chev { transition: transform 0.18s ease; opacity: 0.5; }
        .pnav-mobile-row[data-open="true"] .chev { transform: rotate(180deg); opacity: 1; }
        .pnav-mobile-submenu {
          padding: 6px 0 10px 8px;
          border-bottom: 0.5px solid var(--border);
          display: flex; flex-direction: column; gap: 2px;
        }
        .pnav-mobile-sub-item {
          display: grid; grid-template-columns: 28px 1fr; gap: 10px;
          align-items: center;
          padding: 10px 8px;
          border-radius: 8px;
          text-decoration: none;
        }
        .pnav-mobile-sub-item .micon {
          width: 28px; height: 28px; border-radius: 7px;
          background: rgba(var(--accent-rgb), 0.10);
          border: 1px solid rgba(var(--accent-rgb), 0.20);
          color: var(--accent);
          display: flex; align-items: center; justify-content: center;
        }
        .pnav-mobile-sub-item .mtitle { font-size: 13px; color: var(--text); font-weight: 500; }
      `}</style>

      <nav
        className="pnav-pad"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          background: navBackground,
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.25s ease, border-color 0.25s ease",
          willChange: "transform",
        }}
      >
        {/* Logo - left, alone */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <img src="/corvo-logo.svg" width={30} height={30} alt="Corvo" />
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "var(--text)" }}>
            CORVO
          </span>
        </Link>

        {/* Right cluster - all links + actions, right-aligned together */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {/* Desktop nav links */}
          <div className="pnav-desktop-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Product dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => openDrop("product")}
              onMouseLeave={closeDrop}
            >
              <button
                className="pnav-bubble"
                data-open={openDropdown === "product"}
                onClick={() => setOpenDropdown(openDropdown === "product" ? null : "product")}
              >
                Product
                <ChevronDown className="pnav-chev" size={13} strokeWidth={2.2} />
              </button>
              {openDropdown === "product" && (
                <Dropdown items={PRODUCT_ITEMS} tagline="What Corvo does" ctaHref="/auth?mode=signup" ctaLabel="Try free" onSelect={() => setOpenDropdown(null)} />
              )}
            </div>

            {/* Resources dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => openDrop("resources")}
              onMouseLeave={closeDrop}
            >
              <button
                className="pnav-bubble"
                data-open={openDropdown === "resources"}
                onClick={() => setOpenDropdown(openDropdown === "resources" ? null : "resources")}
              >
                Resources
                <ChevronDown className="pnav-chev" size={13} strokeWidth={2.2} />
              </button>
              {openDropdown === "resources" && (
                <Dropdown items={RESOURCES_ITEMS} tagline="Learn more" ctaHref="/blog" ctaLabel="Visit the blog" onSelect={() => setOpenDropdown(null)} />
              )}
            </div>

            {/* Direct links */}
            <Link href="/pricing" className={`pnav-bubble ${active("/pricing") ? "active" : ""}`}>Pricing</Link>
            <Link href="/about"   className={`pnav-bubble ${active("/about")   ? "active" : ""}`}>About</Link>
          </div>

          <div className="pnav-divider" />

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
          {/* Product expandable */}
          <button
            className="pnav-mobile-row"
            data-open={mobileSection === "product"}
            onClick={() => setMobileSection(mobileSection === "product" ? null : "product")}
          >
            <span>Product</span>
            <ChevronDown className="chev" size={16} strokeWidth={2.2} />
          </button>
          {mobileSection === "product" && (
            <div className="pnav-mobile-submenu">
              {PRODUCT_ITEMS.map(({ Icon, ...item }, i) => (
                <Link key={i} href={item.href} onClick={() => setMobileOpen(false)} className="pnav-mobile-sub-item">
                  <span className="micon"><Icon size={14} /></span>
                  <span className="mtitle">{item.title}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Resources expandable */}
          <button
            className="pnav-mobile-row"
            data-open={mobileSection === "resources"}
            onClick={() => setMobileSection(mobileSection === "resources" ? null : "resources")}
          >
            <span>Resources</span>
            <ChevronDown className="chev" size={16} strokeWidth={2.2} />
          </button>
          {mobileSection === "resources" && (
            <div className="pnav-mobile-submenu">
              {RESOURCES_ITEMS.map(({ Icon, ...item }, i) => (
                <Link key={i} href={item.href} onClick={() => setMobileOpen(false)} className="pnav-mobile-sub-item">
                  <span className="micon"><Icon size={14} /></span>
                  <span className="mtitle">{item.title}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Direct mobile links */}
          <Link href="/pricing" onClick={() => setMobileOpen(false)} className="pnav-mobile-row" style={{ textDecoration: "none" }}>
            <span>Pricing</span>
          </Link>
          <Link href="/about" onClick={() => setMobileOpen(false)} className="pnav-mobile-row" style={{ textDecoration: "none" }}>
            <span>About</span>
          </Link>

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
              <Download size={16} />
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

// Dropdown panel (Linear-style 2-col grid of icon + title + desc rows)
function Dropdown({
  items,
  tagline,
  ctaHref,
  ctaLabel,
  onSelect,
}: {
  items: DropdownItem[];
  tagline: string;
  ctaHref: string;
  ctaLabel: string;
  onSelect: () => void;
}) {
  return (
    <div className="pnav-dropdown" role="menu">
      <div className="pnav-dropdown-grid">
        {items.map(({ Icon, ...item }, i) => (
          <Link
            key={i}
            href={item.href}
            onClick={onSelect}
            className="pnav-dropdown-item"
            role="menuitem"
          >
            <div className="pnav-dropdown-icon">
              <Icon size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="pnav-dropdown-title">{item.title}</div>
              <div className="pnav-dropdown-desc">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
      <div className="pnav-dropdown-footer">
        <span className="pnav-dropdown-tagline">{tagline}</span>
        <Link href={ctaHref} onClick={onSelect} className="pnav-dropdown-cta">
          {ctaLabel}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

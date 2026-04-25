"use client";

import Link from "next/link";

const AMBER = "var(--accent)";

const NAV_ITEMS = [
  { id: "overview",  label: "Dashboard", href: null },
  { id: "watchlist", label: "Watchlist", href: null },
  { id: "ai",        label: "AI Chat",   href: null },
  { id: "learn",     label: "Learn",     href: "/learn" },
  { id: "profile",   label: "Profile",   href: null },
] as const;

function NavIcon({ id }: { id: string }) {
  const s = { width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "overview") return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
  if (id === "watchlist") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  if (id === "ai") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
  if (id === "learn") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
  // profile
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

interface Props {
  activeTab: string;
  onTabChange: (id: string) => void;
  onProfile: () => void;
  onAiChat?: () => void;
}

export default function MobileBottomNav({ activeTab, onTabChange, onProfile, onAiChat }: Props) {
  return (
    <nav
      className="c-mob-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "var(--bg2)",
        borderTop: "0.5px solid var(--border)",
        display: "none",
        alignItems: "stretch",
        zIndex: 160,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        const style: React.CSSProperties = {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isActive ? AMBER : "var(--text3)",
          fontSize: 10,
          letterSpacing: 0.5,
          fontFamily: "var(--font-body)",
          padding: "6px 0 4px",
          minHeight: 44,
          position: "relative",
          textDecoration: "none",
          transition: "color 0.15s",
        };

        const indicator = isActive ? (
          <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: AMBER, borderRadius: "0 0 2px 2px" }} />
        ) : null;

        if (item.id === "profile") {
          return (
            <button key={item.id} onClick={onProfile} style={style}>
              {indicator}
              <NavIcon id={item.id} />
              <span>{item.label}</span>
            </button>
          );
        }
        if (item.href) {
          return (
            <Link key={item.id} href={item.href} style={style}>
              {indicator}
              <NavIcon id={item.id} />
              <span>{item.label}</span>
            </Link>
          );
        }
        return (
          <button key={item.id} onClick={() => item.id === "ai" && onAiChat ? onAiChat() : onTabChange(item.id)} style={style}>
            {isActive && item.id !== "ai" ? indicator : null}
            <NavIcon id={item.id} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

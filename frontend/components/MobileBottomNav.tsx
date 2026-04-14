"use client";

import Link from "next/link";
import { LayoutDashboard, Eye, MessageSquare, BookOpen, User } from "lucide-react";

const AMBER = "var(--accent)";

const NAV_ITEMS = [
  { id: "overview",  label: "Dashboard", Icon: LayoutDashboard, href: null },
  { id: "watchlist", label: "Watchlist", Icon: Eye,             href: null },
  { id: "ai",        label: "AI Chat",   Icon: MessageSquare,   href: null },
  { id: "learn",     label: "Learn",     Icon: BookOpen,        href: "/learn" },
  { id: "profile",   label: "Profile",   Icon: User,            href: null },
] as const;

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
        height: 64,
        background: "var(--bg2)",
        borderTop: "0.5px solid var(--border)",
        display: "none", // controlled by CSS media query
        alignItems: "stretch",
        zIndex: 160,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id || (item.id === "profile" && false);
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
          fontSize: 9,
          letterSpacing: 0.8,
          fontFamily: "var(--font-body)",
          padding: "6px 0 4px",
          position: "relative",
          textDecoration: "none",
          transition: "color 0.15s",
        };

        if (item.id === "profile") {
          return (
            <button key={item.id} onClick={onProfile} style={style}>
              {isActive && (
                <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: AMBER, borderRadius: "0 0 2px 2px" }} />
              )}
              <item.Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        }

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} style={style}>
              {isActive && (
                <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: AMBER, borderRadius: "0 0 2px 2px" }} />
              )}
              <item.Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        }

        return (
          <button key={item.id} onClick={() => item.id === "ai" && onAiChat ? onAiChat() : onTabChange(item.id)} style={style}>
            {isActive && item.id !== "ai" && (
              <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: AMBER, borderRadius: "0 0 2px 2px" }} />
            )}
            <item.Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

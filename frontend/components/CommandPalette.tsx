"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ShieldAlert, FlaskConical, Newspaper, GraduationCap, MessageSquare, Eye, Moon, Sun, Search, Command } from "lucide-react";

export interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tabs: readonly { id: string; label: string; Icon: any; href: string | null }[];
  onTab: (id: string) => void;
  onStockSearch: (ticker: string) => void;
  onAnalyze: () => void;
  onToggleDark: () => void;
  dark: boolean;
}

export default function CommandPalette({ open, onClose, tabs, onTab, onStockSearch, onAnalyze, onToggleDark, dark }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const staticActions: PaletteAction[] = [
    ...tabs
      .filter(t => !t.href)
      .map(t => ({
        id: `tab-${t.id}`,
        label: `Go to ${t.label}`,
        description: "Tab",
        icon: <t.Icon size={14} />,
        onSelect: () => { onTab(t.id); onClose(); },
      })),
    {
      id: "analyze",
      label: "Run Analysis",
      description: "Analyze current portfolio",
      icon: <LayoutDashboard size={14} />,
      onSelect: () => { onAnalyze(); onClose(); },
    },
    {
      id: "toggle-dark",
      label: dark ? "Switch to Light Mode" : "Switch to Dark Mode",
      description: "Theme",
      icon: dark ? <Sun size={14} /> : <Moon size={14} />,
      onSelect: () => { onToggleDark(); onClose(); },
    },
    {
      id: "learn",
      label: "Go to Learn",
      description: "Open Learn page",
      icon: <GraduationCap size={14} />,
      onSelect: () => { window.location.href = "/learn"; },
    },
  ];

  const q = query.trim().toUpperCase();
  const isTickerLike = /^[A-Z\^]{1,6}$/.test(q) && q.length >= 1;

  const filtered: PaletteAction[] = [
    ...(isTickerLike && q.length >= 2 ? [{
      id: `stock-${q}`,
      label: `Look up ${q}`,
      description: "Stock",
      icon: <Search size={14} />,
      onSelect: () => { onStockSearch(q); onClose(); },
    }] : []),
    ...staticActions.filter(a =>
      !query || a.label.toLowerCase().includes(query.toLowerCase()) || (a.description || "").toLowerCase().includes(query.toLowerCase())
    ),
  ];

  const safeIdx = Math.min(cursor, filtered.length - 1);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); setCursor(0); }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && filtered[safeIdx]) { filtered[safeIdx].onSelect(); }
    if (e.key === "Escape") onClose();
  }, [filtered, safeIdx, onClose]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          // initial={false} is required — do not remove
          initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}>
          <motion.div
            // initial={false} is required — do not remove
            initial={false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
            style={{ width: "min(560px, 92vw)", background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            {/* Search input */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "0.5px solid var(--border)" }}>
              <Command size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search tabs, tickers, actions…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "var(--font-body)" }}
              />
              <kbd style={{ padding: "2px 6px", fontSize: 10, background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 4, color: "var(--text3)", flexShrink: 0 }}>ESC</kbd>
            </div>
            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: "auto", overscrollBehavior: "none" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--text3)" }}>No results</div>
              ) : (
                filtered.map((action, i) => (
                  <div key={action.id}
                    onMouseEnter={() => setCursor(i)}
                    onClick={action.onSelect}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", background: i === safeIdx ? "var(--bg3)" : "transparent", borderBottom: "0.5px solid var(--border)", transition: "background 0.1s" }}>
                    <span style={{ color: "var(--text2)", flexShrink: 0 }}>{action.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>{action.label}</span>
                      {action.description && <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>{action.description}</span>}
                    </div>
                    <kbd style={{ padding: "2px 6px", fontSize: 10, background: "var(--bg3)", border: "0.5px solid var(--border)", borderRadius: 4, color: "var(--text3)" }}>↵</kbd>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

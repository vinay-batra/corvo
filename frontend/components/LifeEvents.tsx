"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LifeEvent {
  type: string;
  timeline?: string;
  added_at: string;
}

// ── Event definitions ──────────────────────────────────────────────────────────

const TIMELINES = [
  { id: "within_1_year", label: "Within 1 year" },
  { id: "1_2_years", label: "1-2 years" },
  { id: "2_5_years", label: "2-5 years" },
  { id: "5_plus_years", label: "5+ years" },
];

const LIFE_EVENTS = [
  {
    id: "buying_home",
    label: "Buying a home",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 10L11 2L20 10V19C20 19.6 19.6 20 19 20H14V15H8V20H3C2.4 20 2 19.6 2 19V10Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 20V15H14V20" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "getting_married",
    label: "Getting married",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="7" cy="11" r="4" stroke="var(--accent)" strokeWidth="1.4"/>
        <circle cx="15" cy="11" r="4" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M11 8V14" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "having_baby",
    label: "Having a baby",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="8" r="3.5" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M5 19C5 15.7 7.7 13 11 13C14.3 13 17 15.7 17 19" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M8 19H14" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "starting_business",
    label: "Starting a business",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="9" width="18" height="11" rx="1.5" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M7 9V7C7 4.8 8.8 3 11 3C13.2 3 15 4.8 15 7V9" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M2 13H20" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="11" cy="13" r="1.5" fill="var(--accent)"/>
      </svg>
    ),
  },
  {
    id: "changing_jobs",
    label: "Changing jobs",
    hasTimeline: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 8L2 11L5 14" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 8L20 11L17 14" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 11H20" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "retiring_soon",
    label: "Retiring soon",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="4" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M11 3V5M11 17V19M3 11H5M17 11H19M5.6 5.6L7 7M15 15L16.4 16.4M5.6 16.4L7 15M15 7L16.4 5.6" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "paying_off_debt",
    label: "Paying off debt",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="6" width="18" height="12" rx="2" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M2 10H20" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M7 15H9M11 15H13" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M15 3L17 5L20 2" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "building_emergency_fund",
    label: "Building emergency fund",
    hasTimeline: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3C7 3 3 6.5 3 11.5V15C3 16.1 3.9 17 5 17H17C18.1 17 19 16.1 19 15V11.5C19 6.5 15 3 11 3Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M7 17V19M15 17V19" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "sending_kids_to_college",
    label: "Sending kids to college",
    hasTimeline: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3L20 8L11 13L2 8L11 3Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M5 10.5V16C5 16 7.5 18 11 18C14.5 18 17 16 17 16V10.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M20 8V14" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "nothing_major",
    label: "Nothing major right now",
    hasTimeline: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M7.5 11.5L10 14L14.5 9" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function saveToApi(userId: string, events: LifeEvent[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  await fetch(`${API_URL}/user/life-events/${userId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ life_events: events }),
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventCard({
  event,
  selected,
  timeline,
  onToggle,
  onTimeline,
}: {
  event: typeof LIFE_EVENTS[number];
  selected: boolean;
  timeline: string;
  onToggle: () => void;
  onTimeline: (val: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px 10px",
          background: selected
            ? "rgba(var(--accent-rgb), 0.1)"
            : hovered ? "var(--bg3)" : "var(--bg2)",
          border: `1px solid ${selected ? "var(--accent)" : hovered ? "var(--border2)" : "var(--border)"}`,
          borderRadius: selected && event.hasTimeline ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)",
          cursor: "pointer",
          textAlign: "center",
          transition: "all 150ms",
          width: "100%",
          borderBottom: selected && event.hasTimeline ? "none" : undefined,
        }}
      >
        {event.icon}
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: selected ? "var(--accent)" : hovered ? "var(--text)" : "var(--text2)",
          lineHeight: 1.3,
          transition: "color 150ms",
        }}>
          {event.label}
        </span>
      </button>
      {selected && event.hasTimeline && (
        <select
          value={timeline}
          onChange={e => { e.stopPropagation(); onTimeline(e.target.value); }}
          style={{
            width: "100%",
            padding: "7px 10px",
            fontSize: 11,
            background: "rgba(var(--accent-rgb), 0.06)",
            border: "1px solid var(--accent)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            color: "var(--text2)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">Timeline (optional)</option>
          {TIMELINES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Modal (settings mode) ──────────────────────────────────────────────────────

function AddEventModal({
  current,
  onClose,
  onSave,
}: {
  current: LifeEvent[];
  onClose: () => void;
  onSave: (events: LifeEvent[]) => void;
}) {
  const [selected, setSelected] = useState<LifeEvent[]>(() =>
    current.filter(e => e.type !== "nothing_major")
  );
  const [saving, setSaving] = useState(false);

  const isSelected = (id: string) => selected.some(e => e.type === id);

  const getTimeline = (id: string) =>
    selected.find(e => e.type === id)?.timeline || "";

  const toggle = (id: string) => {
    if (id === "nothing_major") {
      setSelected([{ type: "nothing_major", added_at: new Date().toISOString() }]);
      return;
    }
    if (isSelected(id)) {
      setSelected(prev => prev.filter(e => e.type !== id));
    } else {
      setSelected(prev =>
        prev.filter(e => e.type !== "nothing_major").concat({
          type: id,
          added_at: new Date().toISOString(),
        })
      );
    }
  };

  const setTimeline = (id: string, timeline: string) => {
    setSelected(prev =>
      prev.map(e => e.type === id ? { ...e, timeline } : e)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    onSave(selected);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        width: "100%",
        maxWidth: 520,
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Add a life event
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 4, lineHeight: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18, lineHeight: 1.5 }}>
          Corvo uses this to give you more relevant advice.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {LIFE_EVENTS.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={isSelected(ev.id)}
              timeline={getTimeline(ev.id)}
              onToggle={() => toggle(ev.id)}
              onTimeline={val => setTimeline(ev.id, val)}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px", fontSize: 12, background: "none",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              color: "var(--text3)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 20px", fontSize: 12, fontWeight: 600,
              background: "var(--accent)", border: "none",
              borderRadius: "var(--radius)", color: "var(--bg)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LifeEvents({
  mode,
  userId,
  initialEvents = [],
  onChange,
}: {
  mode: "onboarding" | "settings";
  userId: string;
  initialEvents?: LifeEvent[];
  onChange?: (events: LifeEvent[]) => void;
}) {
  const [selected, setSelected] = useState<LifeEvent[]>(initialEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync initialEvents into state for settings mode on mount/change
  useEffect(() => {
    if (mode === "settings") setSelected(initialEvents);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEvents.length, mode]);

  const isSelected = (id: string) => selected.some(e => e.type === id);

  const getTimeline = (id: string) =>
    selected.find(e => e.type === id)?.timeline || "";

  const toggle = (id: string) => {
    let next: LifeEvent[];
    if (id === "nothing_major") {
      next = isSelected("nothing_major") ? [] : [{ type: "nothing_major", added_at: new Date().toISOString() }];
    } else if (isSelected(id)) {
      next = selected.filter(e => e.type !== id);
    } else {
      next = selected.filter(e => e.type !== "nothing_major").concat({
        type: id,
        added_at: new Date().toISOString(),
      });
    }
    setSelected(next);
    onChange?.(next);
  };

  const setTimeline = (id: string, timeline: string) => {
    const next = selected.map(e => e.type === id ? { ...e, timeline } : e);
    setSelected(next);
    onChange?.(next);
  };

  // Settings mode: remove chip instantly + persist
  const removeEvent = async (type: string) => {
    const next = selected.filter(e => e.type !== type);
    setSelected(next);
    if (userId) await saveToApi(userId, next);
  };

  // Settings mode: modal save
  const handleModalSave = async (events: LifeEvent[]) => {
    setSaving(true);
    const merged = events;
    setSelected(merged);
    if (userId) await saveToApi(userId, merged);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setModalOpen(false);
  };

  // ── Onboarding render ──────────────────────────────────────────────────────

  if (mode === "onboarding") {
    return (
      <div>
        <div className="ob-life-events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {LIFE_EVENTS.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={isSelected(ev.id)}
              timeline={getTimeline(ev.id)}
              onToggle={() => toggle(ev.id)}
              onTimeline={val => setTimeline(ev.id, val)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Settings render ────────────────────────────────────────────────────────

  const activeEvents = selected.filter(e => e.type !== "nothing_major");
  const eventLabel = (type: string) =>
    LIFE_EVENTS.find(e => e.id === type)?.label || type.replace(/_/g, " ");
  const timelineLabel = (timeline?: string) => {
    const t = TIMELINES.find(t => t.id === timeline);
    return t ? ` (${t.label})` : "";
  };

  return (
    <div>
      {activeEvents.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {activeEvents.map(ev => (
            <div
              key={ev.type}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px 5px 12px",
                background: "rgba(var(--accent-rgb), 0.08)",
                border: "1px solid rgba(var(--accent-rgb), 0.3)",
                borderRadius: 20,
                fontSize: 12,
                color: "var(--text2)",
              }}
            >
              {eventLabel(ev.type)}{timelineLabel(ev.timeline)}
              <button
                onClick={() => removeEvent(ev.type)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: "50%",
                  background: "none", border: "none",
                  cursor: "pointer", color: "var(--text3)", padding: 0,
                  lineHeight: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
          No life events added yet.
        </p>
      )}
      <button
        onClick={() => setModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          fontSize: 12,
          background: "none",
          border: "1px solid var(--border2)",
          borderRadius: "var(--radius)",
          color: "var(--text2)",
          cursor: "pointer",
          transition: "border-color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Add event
        {saved && <span style={{ color: "var(--accent)", fontSize: 11 }}>Saved</span>}
      </button>

      {modalOpen && (
        <AddEventModal
          current={selected}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FinancialGoal {
  id: string;
  timeline?: string;
  targetAmount?: string;
  targetMonths?: string;
  monthlyTarget?: string;
  debtType?: string;
  added_at: string;
}

type GoalFieldKey = "timeline" | "targetAmount" | "targetMonths" | "monthlyTarget" | "debtType";

interface GoalFieldDef {
  key: GoalFieldKey;
  type: "select" | "amount";
  placeholder: string;
  options?: { id: string; label: string }[];
}

interface GoalDef {
  id: string;
  label: string;
  icon: React.ReactElement;
  fields: GoalFieldDef[];
}

// ── Goal definitions ───────────────────────────────────────────────────────────

const GOAL_DEFS: GoalDef[] = [
  {
    id: "retire_early",
    label: "Retire early",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 17H19" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M7 17C7 14.24 8.79 12 11 12C13.21 12 15 14.24 15 17" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M11 5V7M4.5 7.5L5.9 8.9M17.5 7.5L16.1 8.9M3 12H5M17 12H19" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="11" cy="4.5" r="1.5" fill="var(--accent)"/>
      </svg>
    ),
    fields: [
      {
        key: "timeline",
        type: "select",
        placeholder: "Timeline",
        options: [
          { id: "5y", label: "5 years" },
          { id: "10y", label: "10 years" },
          { id: "20y", label: "20 years" },
          { id: "30y_plus", label: "30+ years" },
        ],
      },
      { key: "targetAmount", type: "amount", placeholder: "Target amount (optional)" },
    ],
  },
  {
    id: "emergency_fund",
    label: "Build emergency fund",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3L19 7V12C19 16.4 15.5 19.7 11 21C6.5 19.7 3 16.4 3 12V7L11 3Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 11L10.5 13.5L14 9" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    fields: [
      {
        key: "targetMonths",
        type: "select",
        placeholder: "Coverage target",
        options: [
          { id: "3mo", label: "3 months of expenses" },
          { id: "6mo", label: "6 months of expenses" },
          { id: "12mo", label: "12 months of expenses" },
        ],
      },
    ],
  },
  {
    id: "home_down_payment",
    label: "Home down payment",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 10L11 2L20 10V19C20 19.6 19.6 20 19 20H14V15H8V20H3C2.4 20 2 19.6 2 19V10Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    fields: [
      {
        key: "timeline",
        type: "select",
        placeholder: "Timeline",
        options: [
          { id: "1y", label: "1 year" },
          { id: "2y", label: "2 years" },
          { id: "5y", label: "5 years" },
        ],
      },
      { key: "targetAmount", type: "amount", placeholder: "Down payment target (optional)" },
    ],
  },
  {
    id: "save_for_college",
    label: "Save for college",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3L20 8L11 13L2 8L11 3Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M5 10.5V16C5 16 7.5 18 11 18C14.5 18 17 16 17 16V10.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M20 8V13" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    fields: [
      {
        key: "timeline",
        type: "select",
        placeholder: "Timeline",
        options: [
          { id: "5y", label: "5 years" },
          { id: "10y", label: "10 years" },
          { id: "15y_plus", label: "15+ years" },
        ],
      },
      { key: "targetAmount", type: "amount", placeholder: "Savings target (optional)" },
    ],
  },
  {
    id: "grow_wealth",
    label: "Grow long-term wealth",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 17L8 11L12 14L17 7L20 10" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 7H20V10" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    fields: [
      {
        key: "timeline",
        type: "select",
        placeholder: "Horizon",
        options: [
          { id: "10y", label: "10 years" },
          { id: "20y", label: "20 years" },
          { id: "30y_plus", label: "30+ years" },
        ],
      },
    ],
  },
  {
    id: "passive_income",
    label: "Generate passive income",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M11 7V8M11 14V15" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M8.5 9C8.5 7.9 9.6 7 11 7C12.4 7 13.5 7.9 13.5 9C13.5 10.1 12.4 11 11 11C9.6 11 8.5 11.9 8.5 13C8.5 14.1 9.6 15 11 15C12.4 15 13.5 14.1 13.5 13" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    fields: [
      { key: "monthlyTarget", type: "amount", placeholder: "Monthly income target (optional)" },
    ],
  },
  {
    id: "pay_off_debt",
    label: "Pay off debt",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="6" width="18" height="12" rx="2" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M2 10H20" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M14 3L16 5L19 2" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    fields: [
      {
        key: "debtType",
        type: "select",
        placeholder: "Debt type",
        options: [
          { id: "student_loans", label: "Student loans" },
          { id: "mortgage", label: "Mortgage" },
          { id: "credit_card", label: "Credit card" },
        ],
      },
    ],
  },
  {
    id: "major_purchase",
    label: "Major purchase",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 6H5.5L7.5 16H16.5L19 9H7.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9.5" cy="19" r="1.5" fill="var(--accent)"/>
        <circle cx="15" cy="19" r="1.5" fill="var(--accent)"/>
      </svg>
    ),
    fields: [
      {
        key: "timeline",
        type: "select",
        placeholder: "Timeline",
        options: [
          { id: "1y", label: "1 year" },
          { id: "2y", label: "2 years" },
          { id: "3y", label: "3 years" },
        ],
      },
      { key: "targetAmount", type: "amount", placeholder: "Target amount (optional)" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function saveGoalsToApi(userId: string, goals: FinancialGoal[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  await fetch(`${API_URL}/user/financial-goals/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ financial_goals: goals }),
  });
}

function goalChipLabel(goal: FinancialGoal): string {
  const def = GOAL_DEFS.find(d => d.id === goal.id);
  if (!def) return goal.id.replace(/_/g, " ");
  const parts: string[] = [];
  if (goal.timeline) {
    const opt = def.fields.find(f => f.key === "timeline")?.options?.find(o => o.id === goal.timeline);
    if (opt) parts.push(opt.label);
  }
  if (goal.targetMonths) {
    const opt = def.fields.find(f => f.key === "targetMonths")?.options?.find(o => o.id === goal.targetMonths);
    if (opt) parts.push(opt.label);
  }
  if (goal.debtType) {
    const opt = def.fields.find(f => f.key === "debtType")?.options?.find(o => o.id === goal.debtType);
    if (opt) parts.push(opt.label);
  }
  if (goal.targetAmount) {
    const num = parseFloat(goal.targetAmount.replace(/[^0-9.]/g, ""));
    parts.push(isNaN(num) ? goal.targetAmount : `$${num.toLocaleString()}`);
  }
  if (goal.monthlyTarget) {
    const num = parseFloat(goal.monthlyTarget.replace(/[^0-9.]/g, ""));
    parts.push(isNaN(num) ? goal.monthlyTarget : `$${num.toLocaleString()}/mo`);
  }
  return def.label + (parts.length ? ` (${parts.join(", ")})` : "");
}

// ── GoalCard sub-component ─────────────────────────────────────────────────────

function GoalCard({
  goal,
  selected,
  data,
  onToggle,
  onField,
}: {
  goal: GoalDef;
  selected: boolean;
  data: FinancialGoal | undefined;
  onToggle: () => void;
  onField: (key: GoalFieldKey, value: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasFields = selected && goal.fields.length > 0;

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    fontSize: 11,
    background: "rgba(var(--accent-rgb), 0.06)",
    border: "1px solid var(--accent)",
    borderTop: "none",
    color: "var(--text2)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
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
          borderRadius: hasFields ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)",
          borderBottom: hasFields ? "none" : undefined,
          cursor: "pointer",
          textAlign: "center",
          transition: "all 150ms",
          width: "100%",
        }}
      >
        {goal.icon}
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: selected ? "var(--accent)" : hovered ? "var(--text)" : "var(--text2)",
          lineHeight: 1.3,
          transition: "color 150ms",
        }}>
          {goal.label}
        </span>
      </button>
      {hasFields && goal.fields.map((field, i) => {
        const isLast = i === goal.fields.length - 1;
        const borderRadius = isLast ? "0 0 var(--radius-lg) var(--radius-lg)" : "0";
        const val = data ? (data[field.key] ?? "") : "";

        if (field.type === "select") {
          return (
            <select
              key={field.key}
              value={val}
              onChange={e => { e.stopPropagation(); onField(field.key, e.target.value); }}
              style={{ ...inputBase, borderRadius, cursor: "pointer" }}
            >
              <option value="">{field.placeholder}</option>
              {field.options?.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={field.key}
            type="text"
            value={val}
            onChange={e => onField(field.key, e.target.value)}
            placeholder={field.placeholder}
            style={{
              ...inputBase,
              borderRadius,
              fontFamily: "'Space Mono', monospace",
              cursor: "text",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Modal (settings mode) ──────────────────────────────────────────────────────

function AddGoalModal({
  current,
  onClose,
  onSave,
}: {
  current: FinancialGoal[];
  onClose: () => void;
  onSave: (goals: FinancialGoal[]) => void;
}) {
  const [selected, setSelected] = useState<FinancialGoal[]>(current);
  const [saving, setSaving] = useState(false);

  const isSelected = (id: string) => selected.some(g => g.id === id);
  const getData = (id: string) => selected.find(g => g.id === id);

  const toggle = (id: string) => {
    if (isSelected(id)) {
      setSelected(prev => prev.filter(g => g.id !== id));
    } else {
      setSelected(prev => [...prev, { id, added_at: new Date().toISOString() }]);
    }
  };

  const setField = (id: string, key: GoalFieldKey, value: string) => {
    setSelected(prev => prev.map(g => g.id === id ? { ...g, [key]: value } : g));
  };

  const handleSave = () => {
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
        maxWidth: 560,
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Add a financial goal
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
          Corvo uses your goals to give you more relevant advice.
        </p>
        <div className="fg-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {GOAL_DEFS.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              selected={isSelected(goal.id)}
              data={getData(goal.id)}
              onToggle={() => toggle(goal.id)}
              onField={(key, val) => setField(goal.id, key, val)}
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

export default function FinancialGoals({
  mode,
  userId,
  initialGoals = [],
  onChange,
}: {
  mode: "onboarding" | "settings";
  userId: string;
  initialGoals?: FinancialGoal[];
  onChange?: (goals: FinancialGoal[]) => void;
}) {
  const [selected, setSelected] = useState<FinancialGoal[]>(initialGoals);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mode === "settings") setSelected(initialGoals);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGoals.length, mode]);

  const isSelected = (id: string) => selected.some(g => g.id === id);
  const getData = (id: string) => selected.find(g => g.id === id);

  const toggle = (id: string) => {
    const next = isSelected(id)
      ? selected.filter(g => g.id !== id)
      : [...selected, { id, added_at: new Date().toISOString() }];
    setSelected(next);
    onChange?.(next);
  };

  const setField = (id: string, key: GoalFieldKey, value: string) => {
    const next = selected.map(g => g.id === id ? { ...g, [key]: value } : g);
    setSelected(next);
    onChange?.(next);
  };

  const removeGoal = async (id: string) => {
    const next = selected.filter(g => g.id !== id);
    setSelected(next);
    if (userId) await saveGoalsToApi(userId, next);
  };

  const handleModalSave = async (goals: FinancialGoal[]) => {
    setSaving(true);
    setSelected(goals);
    if (userId) await saveGoalsToApi(userId, goals);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setModalOpen(false);
  };

  // ── Onboarding render ──────────────────────────────────────────────────────

  if (mode === "onboarding") {
    return (
      <div className="ob-goals-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {GOAL_DEFS.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            selected={isSelected(goal.id)}
            data={getData(goal.id)}
            onToggle={() => toggle(goal.id)}
            onField={(key, val) => setField(goal.id, key, val)}
          />
        ))}
      </div>
    );
  }

  // ── Settings render ────────────────────────────────────────────────────────

  return (
    <div>
      {selected.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {selected.map(goal => (
            <div
              key={goal.id}
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
              {goalChipLabel(goal)}
              <button
                onClick={() => removeGoal(goal.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: "50%",
                  background: "none", border: "none",
                  cursor: "pointer", color: "var(--text3)", padding: 0, lineHeight: 0,
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
          No financial goals added yet.
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
        Add goal
        {saved && <span style={{ color: "var(--accent)", fontSize: 11 }}>Saved</span>}
      </button>

      {modalOpen && (
        <AddGoalModal
          current={selected}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

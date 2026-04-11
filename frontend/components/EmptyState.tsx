"use client";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  minHeight?: number;
}

export default function EmptyState({ icon = "○", title, message, ctaLabel, onCta, minHeight = 160 }: EmptyStateProps) {
  return (
    <div className="empty-state" style={{ minHeight }}>
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-msg">{message}</p>}
      {ctaLabel && onCta && (
        <button className="empty-state-cta" onClick={onCta}>{ctaLabel}</button>
      )}
    </div>
  );
}

"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  minHeight?: number;
}

export default function EmptyState({ icon, title, message, ctaLabel, onCta, minHeight = 180 }: EmptyStateProps) {
  const isSvgIcon = icon && typeof icon !== "string";
  return (
    <div className="empty-state" style={{ minHeight }}>
      <div className="empty-state-icon">
        {isSvgIcon ? icon : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        )}
      </div>
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-msg">{message}</p>}
      {ctaLabel && onCta && (
        <button className="empty-state-cta" onClick={onCta}>{ctaLabel}</button>
      )}
    </div>
  );
}

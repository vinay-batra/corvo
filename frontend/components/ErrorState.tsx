"use client";

interface ErrorStateProps {
  message?: string;
  reason?: string;
  onRetry?: () => void;
  minHeight?: number;
}

const DEFAULT_MESSAGE = "Corvo couldn't reach the server.";
const DEFAULT_REASON = "Our backend may be waking up after idle (Railway cold start). Give it 10 seconds and retry.";

export default function ErrorState({
  message = DEFAULT_MESSAGE,
  reason = DEFAULT_REASON,
  onRetry,
  minHeight = 160,
}: ErrorStateProps) {
  return (
    <div className="error-state" style={{ minHeight }}>
      <div className="error-state-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <p className="error-state-msg">{message}</p>
      {reason && (
        <p style={{ fontSize: 11.5, color: "var(--text3)", lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
          {reason}
        </p>
      )}
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

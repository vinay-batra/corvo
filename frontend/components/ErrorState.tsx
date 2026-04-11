"use client";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  minHeight?: number;
}

export default function ErrorState({
  message = "Unable to load data. The server may be temporarily unavailable.",
  onRetry,
  minHeight = 140,
}: ErrorStateProps) {
  return (
    <div className="error-state" style={{ minHeight }}>
      <div className="error-state-icon">⚠</div>
      <p className="error-state-msg">{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          ↺ Retry
        </button>
      )}
    </div>
  );
}

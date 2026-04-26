"use client";

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export default function TourInviteModal({ onAccept, onDecline }: Props) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.72)",
        zIndex: 1060,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "ti-overlay 200ms ease-out both",
      }}
    >
      <style>{`
        @keyframes ti-overlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ti-card { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ti-draw-line { from { stroke-dashoffset: 350; } to { stroke-dashoffset: 0; } }
        @keyframes ti-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes ti-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.9); opacity: 0.35; }
        }
        .ti-bar1 {
          transform-box: fill-box;
          transform-origin: 50% 100%;
          transform: scaleY(0);
          animation: ti-grow 800ms ease-out 450ms both;
        }
        .ti-bar2 {
          transform-box: fill-box;
          transform-origin: 50% 100%;
          transform: scaleY(0);
          animation: ti-grow 800ms ease-out 650ms both;
        }
        .ti-dot {
          transform-box: fill-box;
          transform-origin: center;
          animation: ti-pulse-dot 1.5s ease-in-out 1.8s infinite;
        }
      `}</style>

      <div
        style={{
          width: "min(440px, 96vw)",
          background: "var(--card-bg)",
          border: "0.5px solid var(--border)",
          borderRadius: 20,
          padding: "32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.05)",
          animation: "ti-card 300ms ease-out both",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Animated SVG illustration */}
        <svg
          viewBox="0 0 240 130"
          width="100%"
          height="auto"
          style={{ display: "block", borderRadius: 10, overflow: "visible" }}
        >
          {/* Background */}
          <rect width="240" height="130" rx="8" fill="var(--bg2)" />

          {/* Subtle grid lines */}
          <line x1="10" y1="100" x2="230" y2="100" stroke="var(--border)" strokeWidth="0.5" />
          <line x1="10" y1="70" x2="230" y2="70" stroke="var(--border)" strokeWidth="0.5" />
          <line x1="10" y1="40" x2="230" y2="40" stroke="var(--border)" strokeWidth="0.5" />

          {/* Bar 1 */}
          <rect
            className="ti-bar1"
            x="16" y="65" width="24" height="55"
            rx="3"
            fill="var(--accent)"
            fillOpacity="0.28"
          />

          {/* Bar 2 */}
          <rect
            className="ti-bar2"
            x="48" y="43" width="24" height="77"
            rx="3"
            fill="var(--accent)"
            fillOpacity="0.45"
          />

          {/* Area fill under line chart (no animation — just subtle presence) */}
          <path
            d="M 88,100 C 102,86 114,76 128,64 C 142,52 152,40 168,26 C 176,34 192,42 220,36 L 220,120 L 88,120 Z"
            fill="var(--accent)"
            fillOpacity="0.07"
          />

          {/* Line chart draws itself */}
          <path
            d="M 88,100 C 102,86 114,76 128,64 C 142,52 152,40 168,26 C 176,34 192,42 220,36"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="350"
            strokeDashoffset="350"
            style={{ animation: "ti-draw-line 1.5s ease-in-out 0.2s both" }}
          />

          {/* Pulse dot at line peak */}
          <circle className="ti-dot" cx="168" cy="26" r="4.5" fill="var(--accent)" />
        </svg>

        {/* Text */}
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.4px",
              margin: 0,
              marginBottom: 8,
              lineHeight: 1.25,
            }}
          >
            Want a quick tour?
          </h2>
          <p style={{ fontSize: 14, color: "var(--text3)", margin: 0, lineHeight: 1.65 }}>
            We'll show you the key features in about 2 minutes.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1, padding: "12px",
              background: "var(--accent)", border: "none", borderRadius: 10,
              color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              letterSpacing: 0.3, transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Take a tour
          </button>
          <button
            onClick={onDecline}
            style={{
              flex: 1, padding: "12px",
              background: "transparent",
              border: "0.5px solid var(--border)",
              borderRadius: 10,
              color: "var(--text3)", fontSize: 13, fontWeight: 500, cursor: "pointer",
              letterSpacing: 0.3, transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--bg3)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--border2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text3)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

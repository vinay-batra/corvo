"use client";

import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/app", "/learn"];

export default function AmbientOrbs() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return (
    <div
      aria-hidden
      className="ambient-orbs"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-25%",
          right: "-20%",
          width: "65vw",
          height: "65vw",
          background:
            "radial-gradient(circle, rgba(var(--accent-rgb), 0.22) 0%, rgba(var(--accent-rgb), 0.07) 35%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-28%",
          left: "-22%",
          width: "60vw",
          height: "60vw",
          background:
            "radial-gradient(circle, rgba(var(--accent-rgb), 0.14) 0%, rgba(var(--accent-rgb), 0.04) 40%, transparent 72%)",
          filter: "blur(90px)",
        }}
      />
    </div>
  );
}

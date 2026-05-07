"use client";

import { usePathname } from "next/navigation";
import ParticleCanvas from "./ParticleCanvas";

const HIDDEN_PATHS = ["/app", "/learn"];

export default function ConditionalParticleCanvas() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return <ParticleCanvas />;
}

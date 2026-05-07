import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "About — Corvo",
  description: "Built by a high school sophomore. The portfolio tool we wished existed.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

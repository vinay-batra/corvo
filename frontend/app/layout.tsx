import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corvo — Portfolio Intelligence",
  description: "Know your portfolio. Beat the market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#0a0e14" }}>
      <body style={{ margin: 0, background: "#0d1117" }}>{children}</body>
    </html>
  );
}

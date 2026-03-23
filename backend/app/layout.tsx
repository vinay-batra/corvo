import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corvo — Portfolio Intelligence",
  description: "Know your portfolio. Beat the market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#ffffff" }}>
      <body style={{ margin: 0, background: "#ffffff" }}>{children}</body>
    </html>
  );
}

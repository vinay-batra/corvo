import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corvo — Portfolio Intelligence",
  description: "AI-powered portfolio analytics. Know your portfolio. Beat the market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, background: "#01020a" }}>
      <body style={{ margin: 0, padding: 0, background: "#01020a" }}>{children}</body>
    </html>
  );
}

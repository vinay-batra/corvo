import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corvo — Portfolio Intelligence",
  description: "AI-powered portfolio analytics. Know your portfolio. Beat the market.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><polygon points='20,2 35,11 35,29 20,38 5,29 5,11' stroke='%2300ffa0' stroke-width='2' fill='none'/><path d='M26 14 A8 8 0 1 0 26 26' stroke='%2300ffa0' stroke-width='3' stroke-linecap='round' fill='none'/></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, background: "#020408" }}>
      <body style={{ margin: 0, padding: 0, background: "#020408" }}>{children}</body>
    </html>
  );
}

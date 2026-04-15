import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClosePilot AI — Finance Operations Platform",
  description: "Cut your month-end close from 5 days to 1 day. AI-native finance operations for SMB and mid-market teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-full"
        style={{
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {children}
      </body>
    </html>
  );
}

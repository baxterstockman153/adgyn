import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "adgyn – Local advertising, reimagined",
  description: "Put your business in front of the right neighbors.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

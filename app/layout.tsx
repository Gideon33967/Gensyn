import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenSyn Playground",
  description: "Real ML training in your browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen">{children}</body>
    </html>
  );
}

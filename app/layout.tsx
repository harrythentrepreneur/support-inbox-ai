import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Support Inbox",
  description: "A modern AI-powered shared inbox and issue management board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} h-screen overflow-hidden bg-white text-gray-900`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInit } from "@/components/theme-init";
import { TokenCookieSync } from "@/components/token-cookie-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tour Booking — Quản trị",
  description: "Quản trị tour và booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <ThemeInit />
        <TokenCookieSync />
        {children}
      </body>
    </html>
  );
}

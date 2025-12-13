import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastViewport from "@/components/ToastViewport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baseline Analytics | Investor Hub",
  description: "Live investor dashboard tracking Baseline's progress, funding metrics, and performance data for baseball and softball facilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#cb6b1e] focus:text-black focus:px-4 focus:py-2 focus:rounded-md"
        >
          Skip to main content
        </a>
        <ToastViewport />
        {children}
      </body>
    </html>
  );
}

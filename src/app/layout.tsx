import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小食光",
  description: "Love is the secret ingredient.",
  manifest: "/manifest.webmanifest",
  applicationName: "小食光",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小食光",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7D070",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

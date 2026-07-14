import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eatingtogether.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "小食光 FlavorTogether",
  description: "面向情侣的治愈系双人食材管理与协同做饭软件",
  manifest: "/manifest.webmanifest",
  applicationName: "小食光",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小食光",
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小食光",
  description: "面向情侣的治愈系双人食材管理与协同做饭软件",
  metadataBase: new URL("https://eatingtogether.vercel.app"),
  manifest: "/manifest.webmanifest",
  applicationName: "小食光",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小食光",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/apple-touch-icon-v3.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-v3.png", sizes: "180x180" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
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
      <head>
        {/* Absolute HTTPS URL — most reliable for Safari Web Clip preview */}
        <link
          rel="apple-touch-icon"
          href="https://eatingtogether.vercel.app/apple-touch-icon-v3.png"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

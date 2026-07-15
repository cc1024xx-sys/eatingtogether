import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eatingtogether.vercel.app";

const appleTouchIcon = `${siteUrl}/apple-touch-icon.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BC厨房",
  description: "面向情侣的治愈系双人食材管理与协同做饭软件",
  manifest: "/manifest.webmanifest",
  applicationName: "BC厨房",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BC厨房",
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        {/* Absolute URL — Safari Web Clip is most reliable with a full HTTPS href */}
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={appleTouchIcon}
        />
        <link rel="apple-touch-icon-precomposed" href={appleTouchIcon} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

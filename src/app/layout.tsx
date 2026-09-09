import type { Metadata, Viewport } from "next";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roznamcha",
  description: "Work timer and daily routine — a personal daybook.",
  applicationName: "Roznamcha",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Roznamcha" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2f4a34",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

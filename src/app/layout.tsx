import type { Metadata, Viewport } from "next"
import AppGate from "@/components/AppGate"
import UserPreferencesBoot from "@/components/UserPreferencesBoot"
import "leaflet/dist/leaflet.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "PrepSight",
  description: "Universal clinical procedure reference platform",
  applicationName: "PrepSight",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PrepSight",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10243E",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserPreferencesBoot />
        <AppGate>{children}</AppGate>
      </body>
    </html>
  )
}

import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        // Allow Firebase Auth popups to communicate back
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        source: "/procedures/:path*",
        headers: [
          { key: "X-Frame-Options",  value: "DENY" },
          { key: "X-Robots-Tag",     value: "noindex, nofollow" },
          { key: "Cache-Control",    value: "no-store" },
        ],
      },
    ]
  },
}

export default nextConfig

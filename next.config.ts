import path from "path"
import type { NextConfig } from "next"

const isNativeBuild = process.env.CAPACITOR_BUILD === "true"

const nextConfig: NextConfig = {
  output: isNativeBuild ? "export" : undefined,
  trailingSlash: isNativeBuild ? true : undefined,
  outputFileTracingRoot: path.join(__dirname),
  ...(isNativeBuild ? {} : { turbopack: { root: path.join(__dirname) } }),
  async rewrites() {
    if (isNativeBuild) return []
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://prepsight-43e96.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/init.json",
        destination: "https://prepsight-43e96.firebaseapp.com/__/firebase/init.json",
      },
    ]
  },
  async headers() {
    return [
      {
        // Login page opts out of COOP so the Firebase OAuth popup can post the auth
        // result back via window.opener (firebaseapp.com's own COOP would sever it).
        source: "/login",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        source: "/((?!login).*)",
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

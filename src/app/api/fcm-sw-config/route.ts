import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  }

  const js = Object.entries(config)
    .map(([k, v]) => `self.FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()} = ${JSON.stringify(v)};`)
    .join("\n")

  return new NextResponse(js, {
    headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" },
  })
}

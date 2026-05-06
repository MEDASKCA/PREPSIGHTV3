import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.prepsight.app",
  appName: "PrepSight",
  // Load live from Vercel — no APK rebuild needed for code changes
  server: {
    url: "https://prepsight.medaskca.com",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
}

export default config

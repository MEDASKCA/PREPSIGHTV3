import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.prepsight.app",
  appName: "PrepSight",
  webDir: "out",
  server: {
    url: "https://prepsight.medaskca.com",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "microsoft.com"],
    },
  },
}

export default config

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyDvldBzQTFgAK5U8Tb_PDdMOFByxooc2Tk",
  authDomain: "prepsight.medaskca.com",
  projectId: "prepsight-43e96",
  storageBucket: "prepsight-43e96.firebasestorage.app",
  messagingSenderId: "488061514416",
  appId: "1:488061514416:web:9d48027607701c06c00175",
})

// Initialise messaging — FCM uses webpush.notification from Cloud Function to auto-display
// background notifications without needing onBackgroundMessage
firebase.messaging()

// Force new SW to activate immediately so fresh FCM tokens are registered on next load
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", () => self.clients.claim())

// Open app (or focus existing tab) when notification is tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url.includes(self.location.origin))
        if (existing) {
          existing.focus()
          existing.postMessage({ type: "NOTIFICATION_CLICK", data })
          return
        }
        return clients.openWindow("/")
      })
  )
})

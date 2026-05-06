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

const messaging = firebase.messaging()

// Force new SW to take control immediately so tokens re-register on next app load
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", () => self.clients.claim())

// Handles push when app is closed or backgrounded
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const title = data.title || payload.notification?.title || "PrepSight"
  const body = data.body || payload.notification?.body || ""

  self.registration.showNotification(title, {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    requireInteraction: data.type === "call",
    data,
    actions:
      data.type === "call"
        ? [
            { action: "answer", title: "Answer" },
            { action: "decline", title: "Decline" },
          ]
        : [],
  })
})

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
        return clients.openWindow("/comms")
      })
  )
})

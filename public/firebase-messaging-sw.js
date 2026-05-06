importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

// Config is injected via self.FIREBASE_* by the SW install step below
self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch("/api/fcm-sw-config")
      .then((r) => r.text())
      .then((js) => {
        // eslint-disable-next-line no-eval
        eval(js)
        firebase.initializeApp({
          apiKey: self.FIREBASE_API_KEY,
          authDomain: self.FIREBASE_AUTH_DOMAIN,
          projectId: self.FIREBASE_PROJECT_ID,
          storageBucket: self.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
          appId: self.FIREBASE_APP_ID,
        })
        self.__messagingReady = true
      })
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", () => self.clients.claim())

// Background message handler
self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { return }

  const notification = payload.notification || {}
  const data = payload.data || {}

  event.waitUntil(
    self.registration.showNotification(notification.title || "PrepSight", {
      body: notification.body || "",
      icon: "/pwabig.png",
      badge: "/pwabig.png",
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
  )
})

// Notification click — open or focus the app
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

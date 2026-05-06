const { onDocumentCreated } = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")
const { getMessaging } = require("firebase-admin/messaging")

initializeApp()

const db = getFirestore()

async function getUserFcmTokens(uid) {
  const doc = await db.collection("comms_v5_users").doc(uid).get()
  if (!doc.exists) return []
  return doc.data()?.fcmTokens || []
}

async function sendPush(tokens, notification, data = {}) {
  if (!tokens.length) return
  const messaging = getMessaging()
  const results = await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        notification,
        data,
        webpush: {
          notification: {
            ...notification,
            icon: "/pwabig.png",
            badge: "/pwabig.png",
            vibrate: [200, 100, 200],
            requireInteraction: true,
          },
          fcmOptions: { link: "/comms" },
        },
        android: {
          priority: "high",
          notification: { sound: "default", channelId: "prepsight_comms" },
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
      })
    )
  )
  // Collect stale tokens to prune
  const staleTokens = []
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = r.reason?.errorInfo?.code || ""
      if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
        staleTokens.push(tokens[i])
      }
    }
  })
  return staleTokens
}

async function pruneTokens(uid, staleTokens) {
  if (!staleTokens.length) return
  const ref = db.collection("comms_v5_users").doc(uid)
  const doc = await ref.get()
  if (!doc.exists) return
  const current = doc.data()?.fcmTokens || []
  const pruned = current.filter(t => !staleTokens.includes(t))
  await ref.update({ fcmTokens: pruned })
}

// Notify on new message
exports.onNewCommsMessage = onDocumentCreated(
  "comms_v5_messages/{messageId}",
  async (event) => {
    const msg = event.data.data()
    if (!msg) return

    const senderUid = msg.uid
    const memberUids = msg.memberUids || []
    const recipients = memberUids.filter(uid => uid !== senderUid)
    if (!recipients.length) return

    const isCall = msg.type === "call"
    if (isCall) return // calls handled separately below

    const senderName = msg.displayName || "Someone"
    const text = msg.text?.slice(0, 120) || (msg.attachments?.length ? "Sent an attachment" : "")

    for (const uid of recipients) {
      const tokens = await getUserFcmTokens(uid)
      const stale = await sendPush(tokens, {
        title: senderName,
        body: text,
      }, {
        type: "message",
        threadId: msg.threadId || "",
        senderUid,
      })
      if (stale) await pruneTokens(uid, stale)
    }
  }
)

// Notify on incoming call
exports.onNewCommsCall = onDocumentCreated(
  "comms_v5_calls/{callId}",
  async (event) => {
    const call = event.data.data()
    if (!call || call.status !== "ringing") return

    const calleeUid = call.calleeUid
    const callerName = call.callerName || "Someone"
    const mode = call.mode === "video" ? "Video call" : "Voice call"

    const tokens = await getUserFcmTokens(calleeUid)
    const stale = await sendPush(tokens, {
      title: `Incoming ${mode}`,
      body: `${callerName} is calling you`,
    }, {
      type: "call",
      callId: event.params.callId,
      callerUid: call.callerUid,
      mode: call.mode || "audio",
    })
    if (stale) await pruneTokens(calleeUid, stale)
  }
)

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

// Data-only messages — onBackgroundMessage in the SW always fires regardless of app state.
// Notification-field messages are intercepted by FCM and never reach onBackgroundMessage.
async function sendPush(tokens, title, body, data = {}) {
  if (!tokens.length) return []
  const messaging = getMessaging()
  const results = await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        // All payload goes in data so the SW has full control over display
        data: { ...data, title, body },
        webpush: {
          headers: { Urgency: "high" },
          fcmOptions: { link: "/" },
        },
        android: { priority: "high" },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { "content-available": 1 } },
        },
      })
    )
  )
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
  const snap = await ref.get()
  if (!snap.exists) return
  const current = snap.data()?.fcmTokens || []
  await ref.update({ fcmTokens: current.filter(t => !staleTokens.includes(t)) })
}

exports.onNewCommsMessage = onDocumentCreated(
  "comms_v5_messages/{messageId}",
  async (event) => {
    const msg = event.data.data()
    if (!msg || msg.type === "call") return

    const senderUid = msg.uid
    const memberUids = msg.memberUids || []
    const recipients = memberUids.filter(uid => uid !== senderUid)
    if (!recipients.length) return

    const senderName = msg.displayName || "PrepSight"
    const body = msg.text?.slice(0, 120) || (msg.attachments?.length ? "Sent an attachment" : "New message")

    for (const uid of recipients) {
      const tokens = await getUserFcmTokens(uid)
      const stale = await sendPush(tokens, senderName, body, {
        type: "message",
        threadId: msg.threadId || "",
        senderUid,
      })
      if (stale?.length) await pruneTokens(uid, stale)
    }
  }
)

exports.onNewCommsCall = onDocumentCreated(
  "comms_v5_calls/{callId}",
  async (event) => {
    const call = event.data.data()
    if (!call || call.status !== "ringing") return

    const calleeUid = call.calleeUid
    const callerName = call.callerName || "PrepSight"
    const mode = call.mode === "video" ? "Video call" : "Voice call"

    const tokens = await getUserFcmTokens(calleeUid)
    const stale = await sendPush(
      tokens,
      `Incoming ${mode}`,
      `${callerName} is calling you`,
      {
        type: "call",
        callId: event.params.callId,
        callerUid: call.callerUid,
        mode: call.mode || "audio",
      }
    )
    if (stale?.length) await pruneTokens(calleeUid, stale)
  }
)

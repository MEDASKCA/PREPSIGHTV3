const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")
const { getMessaging } = require("firebase-admin/messaging")
const { getAuth } = require("firebase-admin/auth")

initializeApp()

const db = getFirestore()

async function getUserFcmTokens(uid) {
  const snap = await db.collection("comms_v5_users").doc(uid).get()
  if (!snap.exists) return []
  return snap.data()?.fcmTokens || []
}

async function sendPush(tokens, title, body, data = {}) {
  if (!tokens.length) return []
  const messaging = getMessaging()
  const results = await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        notification: { title, body },
        data: { ...data, title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/logo.png",
            badge: "/logo.png",
            vibrate: [200, 100, 200],
          },
          fcmOptions: { link: "/" },
          headers: { Urgency: "high" },
        },
        android: { priority: "high" },
        apns: {
          payload: { aps: { sound: "default", badge: 1, contentAvailable: 1 } },
          headers: { "apns-priority": "10" },
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

async function sendCallPush(tokens, callerName, mode, callId, callerUid) {
  if (!tokens.length) return []
  const messaging = getMessaging()
  const modeLabel = mode === "video" ? "Video" : "Voice"
  const results = await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        // Data-only for Android — our PrepSightMessagingService shows the
        // notification with Answer/Decline action buttons
        data: {
          type: "call",
          callId,
          callerUid,
          callerName,
          mode: mode || "audio",
          title: `Incoming ${modeLabel} Call`,
          body: `${callerName} is calling you`,
        },
        android: { priority: "high" },
        apns: {
          payload: { aps: { sound: "default", badge: 1, contentAvailable: 1 } },
          headers: { "apns-priority": "10" },
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

    const title = msg.displayName || "PrepSight"
    const body = msg.text?.slice(0, 120) || (msg.attachments?.length ? "Sent an attachment" : "New message")

    for (const uid of recipients) {
      const tokens = await getUserFcmTokens(uid)
      const stale = await sendPush(tokens, title, body, {
        type: "message",
        threadId: msg.threadId || "",
        senderUid,
        memberUids: (msg.memberUids || []).join(","),
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
    const callerUid = call.callerUid
    const mode = call.mode || "audio"

    // Resolve caller name: prefer Firestore field, fall back to Firebase Auth record
    let callerName = call.callerName && call.callerName.trim() ? call.callerName.trim() : null
    if (!callerName && callerUid) {
      try {
        const authUser = await getAuth().getUser(callerUid)
        callerName = authUser.displayName || authUser.email || null
      } catch (_) {}
    }
    if (!callerName) callerName = "Someone"

    const tokens = await getUserFcmTokens(calleeUid)
    const stale = await sendCallPush(tokens, callerName, mode, event.params.callId, callerUid)
    if (stale?.length) await pruneTokens(calleeUid, stale)
  }
)

exports.onCommsCallUpdated = onDocumentUpdated(
  "comms_v5_calls/{callId}",
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    if (!before || !after) return

    // Only act when moving out of ringing — dismiss the incoming call notification
    if (before.status !== "ringing") return
    const ended = ["ended", "declined", "missed"].includes(after.status)
    const answered = after.status === "active"
    if (!ended && !answered) return

    const callId = event.params.callId
    const calleeUid = after.calleeUid
    const callerUid = after.callerUid

    const messaging = getMessaging()
    const dismissData = { type: "call_dismiss", callId }

    // Send dismiss to both parties so the notification clears on both sides
    const [calleeTokens, callerTokens] = await Promise.all([
      getUserFcmTokens(calleeUid),
      getUserFcmTokens(callerUid),
    ])
    const allTokens = [...new Set([...calleeTokens, ...callerTokens])]

    await Promise.allSettled(
      allTokens.map(token =>
        messaging.send({
          token,
          data: dismissData,
          android: { priority: "high" },
        })
      )
    )
  }
)

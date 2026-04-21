"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import type { Firestore } from "firebase/firestore"

const STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export type CallStatus = "calling" | "connected" | "declined" | "ended"

export type IncomingCallInfo = {
  callId: string
  organizationId: string
  callerUid: string
  callerName: string
  threadId: string
}

export type ActiveCallInfo = {
  callId: string
  threadId: string
  peerName: string
  isOutgoing: boolean
  status: CallStatus
  durationSeconds: number
}

export type UseCallResult = {
  activeCall: ActiveCallInfo | null
  incomingCall: IncomingCallInfo | null
  startCall: (params: {
    threadId: string
    calleeUid: string
    calleeName: string
    organizationId: string
  }) => Promise<void>
  answerCall: () => Promise<void>
  declineCall: () => Promise<void>
  endCall: () => Promise<void>
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>
}

export function useCall({
  db,
  uid,
  callerName,
}: {
  db: Firestore | null
  uid: string | null
  callerName: string
}): UseCallResult {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callIdRef = useRef<string | null>(null)
  const listenersRef = useRef<Array<() => void>>([])
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function buildPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: STUN })

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
        void remoteAudioRef.current.play().catch(() => {})
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev))
        durationTimerRef.current = setInterval(() => {
          setActiveCall((prev) => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : prev))
        }, 1000)
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        void endCall()
      }
    }

    return pc
  }

  function cleanup() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    listenersRef.current.forEach((fn) => fn())
    listenersRef.current = []
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    callIdRef.current = null
    setActiveCall(null)
    setIncomingCall(null)
  }

  const endCall = useCallback(async () => {
    if (db && callIdRef.current) {
      try {
        await updateDoc(doc(db, "comms_calls", callIdRef.current), {
          status: "ended",
          updatedAt: new Date().toISOString(),
        })
      } catch {
        // best-effort
      }
    }
    cleanup()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  const startCall = useCallback(async ({
    threadId,
    calleeUid,
    calleeName,
    organizationId,
  }: {
    threadId: string
    calleeUid: string
    calleeName: string
    organizationId: string
  }) => {
    if (!db || !uid) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = buildPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      const callId = `call-${Date.now()}-${uid.slice(0, 6)}`
      callIdRef.current = callId

      // Write call document
      await setDoc(doc(db, "comms_calls", callId), {
        organizationId,
        threadId,
        callerUid: uid,
        callerName,
        calleeUid,
        calleeName,
        status: "calling",
        offer: null,
        answer: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // ICE candidates → Firestore subcollection
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(
            collection(db, "comms_calls", callId, "caller_candidates"),
            e.candidate.toJSON(),
          ).catch(() => {})
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await updateDoc(doc(db, "comms_calls", callId), {
        offer: { type: offer.type, sdp: offer.sdp },
      })

      setActiveCall({ callId, threadId, peerName: calleeName, isOutgoing: true, status: "calling", durationSeconds: 0 })

      // Watch for answer + status changes
      const unsubCall = onSnapshot(doc(db, "comms_calls", callId), async (snap) => {
        const data = snap.data()
        if (!data) return
        if ((data.status === "declined" || data.status === "ended") && callIdRef.current) {
          cleanup()
          return
        }
        if (data.answer && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer as RTCSessionDescriptionInit))
        }
      })

      // Watch callee ICE candidates
      const unsubCallee = onSnapshot(
        collection(db, "comms_calls", callId, "callee_candidates"),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit))
            }
          })
        },
      )

      listenersRef.current.push(unsubCall, unsubCallee)
    } catch (err) {
      console.warn("[Call] startCall failed:", err)
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, uid, callerName])

  const answerCall = useCallback(async () => {
    if (!db || !uid || !incomingCall) return
    const { callId, organizationId: _orgId } = incomingCall
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = buildPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      callIdRef.current = callId

      const callSnap = await getDoc(doc(db, "comms_calls", callId))
      const callData = callSnap.data()
      if (!callData?.offer) { cleanup(); return }

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit))

      // ICE candidates
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(
            collection(db, "comms_calls", callId, "callee_candidates"),
            e.candidate.toJSON(),
          ).catch(() => {})
        }
      }

      // Watch caller ICE candidates
      const unsubCaller = onSnapshot(
        collection(db, "comms_calls", callId, "caller_candidates"),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit))
            }
          })
        },
      )

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await updateDoc(doc(db, "comms_calls", callId), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: "connected",
        updatedAt: new Date().toISOString(),
      })

      setActiveCall({
        callId,
        threadId: incomingCall.threadId,
        peerName: incomingCall.callerName,
        isOutgoing: false,
        status: "connected",
        durationSeconds: 0,
      })
      setIncomingCall(null)
      listenersRef.current.push(unsubCaller)
    } catch (err) {
      console.warn("[Call] answerCall failed:", err)
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, uid, incomingCall])

  const declineCall = useCallback(async () => {
    if (!db || !incomingCall) return
    try {
      await updateDoc(doc(db, "comms_calls", incomingCall.callId), {
        status: "declined",
        updatedAt: new Date().toISOString(),
      })
    } catch {}
    setIncomingCall(null)
  }, [db, incomingCall])

  // Listen for incoming calls directed at this user
  useEffect(() => {
    if (!db || !uid) return
    const q = query(
      collection(db, "comms_calls"),
      where("calleeUid", "==", uid),
      where("status", "==", "calling"),
    )
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc.data()
        if (change.type === "added") {
          setIncomingCall({
            callId: change.doc.id,
            organizationId: data.organizationId as string,
            callerUid: data.callerUid as string,
            callerName: data.callerName as string,
            threadId: data.threadId as string,
          })
        }
        if (change.type === "modified" && data.status !== "calling") {
          setIncomingCall(null)
        }
        if (change.type === "removed") {
          setIncomingCall(null)
        }
      })
    })
    return unsub
  }, [db, uid])

  // Cleanup on unmount
  useEffect(() => cleanup, [])// eslint-disable-line

  return { activeCall, incomingCall, startCall, answerCall, declineCall, endCall, remoteAudioRef }
}

"use client"

import { useEffect, useState } from "react"
import { onAuthChange, type User } from "@/lib/auth"
import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore"
import type { CommsOrg, CommsUser } from "@/lib/comms-types"
import MainApp from "@/components/comms/MainApp"

const DEFAULT_HOSPITAL = "Royal Free Hospital"
const DEFAULT_DEPARTMENT = "Operating Theatres"
const DEFAULT_CLINICAL_ROLE = "Clinical role not set"
const DEFAULT_THEATRE_GROUPS = [
  "Trauma and Orthopaedics",
  "General Surgery",
  "Urology",
  "Obstetrics",
  "Gynaecology",
  "Otolaryngology",
  "Oral and Maxillofacial",
  "Dental",
  "Plastics",
  "Neurosurgery",
  "Cardiac",
  "Vascular",
  "Paediatrics",
  "Ophthalmology",
  "Podiatry",
  "Anaesthetics",
]

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function V5CommsDesktopRail() {
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<CommsOrg | null>(null)
  const [errorText, setErrorText] = useState("")

  useEffect(() => onAuthChange(nextUser => setUser(nextUser)), [])

  useEffect(() => {
    if (!user || !db) {
      setOrg(null)
      return
    }
    const currentUser = user
    const firestore = db
    let cancelled = false

    async function ensureCommsContext() {
      try {
        const memberSnap = await getDocs(
          query(collection(firestore, "comms_v5_memberships"), where("uid", "==", currentUser.uid), where("status", "==", "active")),
        )

        if (!memberSnap.empty) {
          const orgId = String(memberSnap.docs[0].data().orgId || "")
          if (orgId) {
            const orgDoc = await getDoc(doc(firestore, "comms_v5_orgs", orgId))
            if (orgDoc.exists()) {
              if (!cancelled) setOrg({ id: orgDoc.id, ...orgDoc.data() } as CommsOrg)
              return
            }
          }
        }

        const userRef = doc(firestore, "comms_v5_users", currentUser.uid)
        const userSnap = await getDoc(userRef)
        const existingUser = userSnap.exists() ? (userSnap.data() as Partial<CommsUser>) : {}
        const hydratedUser: CommsUser = {
          uid: currentUser.uid,
          displayName: existingUser.displayName?.trim() || currentUser.displayName || currentUser.email || "User",
          email: existingUser.email?.trim() || currentUser.email || "",
          hospital: existingUser.hospital?.trim() || DEFAULT_HOSPITAL,
          department: existingUser.department?.trim() || DEFAULT_DEPARTMENT,
          clinicalRole: existingUser.clinicalRole?.trim() || DEFAULT_CLINICAL_ROLE,
          specialties: existingUser.specialties?.length
            ? existingUser.specialties.map(value => value.trim()).filter(Boolean)
            : DEFAULT_THEATRE_GROUPS,
          groupLabel: existingUser.groupLabel?.trim() || existingUser.department?.trim() || DEFAULT_DEPARTMENT,
          updatedAt: Date.now(),
          ...(existingUser.photoURL ? { photoURL: existingUser.photoURL } : {}),
        }
        await setDoc(userRef, hydratedUser, { merge: true })

        const orgQuery = query(collection(firestore, "comms_v5_orgs"), where("name", "==", hydratedUser.hospital))
        const orgSnap = await getDocs(orgQuery)
        let activeOrg: CommsOrg
        if (!orgSnap.empty) {
          const orgDoc = orgSnap.docs[0]
          activeOrg = { id: orgDoc.id, ...orgDoc.data() } as CommsOrg
        } else {
          const orgRef = doc(collection(firestore, "comms_v5_orgs"))
          activeOrg = {
            id: orgRef.id,
            name: hydratedUser.hospital || DEFAULT_HOSPITAL,
            joinCode: generateJoinCode(),
            createdBy: currentUser.uid,
            createdAt: Date.now(),
          }
          await setDoc(orgRef, {
            name: activeOrg.name,
            joinCode: activeOrg.joinCode,
            createdBy: activeOrg.createdBy,
            createdAt: activeOrg.createdAt,
          })
        }

        await setDoc(doc(firestore, "comms_v5_memberships", `${currentUser.uid}__${activeOrg.id}`), {
          uid: currentUser.uid,
          orgId: activeOrg.id,
          displayName: hydratedUser.displayName,
          status: "active",
          joinedAt: Date.now(),
        }, { merge: true })

        const existingThreadsSnap = await getDocs(query(collection(firestore, "comms_v5_threads"), where("organizationId", "==", activeOrg.id)))
        const existingThreadNames = new Set(
          existingThreadsSnap.docs
            .map(docSnap => String(docSnap.data().name || "").trim().toLowerCase())
            .filter(Boolean),
        )

        for (const groupName of hydratedUser.specialties ?? []) {
          const normalized = groupName.trim().toLowerCase()
          if (!normalized || existingThreadNames.has(normalized)) continue
          await addDoc(collection(firestore, "comms_v5_threads"), {
            type: "channel",
            name: groupName,
            description: `${hydratedUser.department || DEFAULT_DEPARTMENT} group`,
            organizationId: activeOrg.id,
            memberUids: [currentUser.uid],
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessage: "",
          })
          existingThreadNames.add(normalized)
        }

        if (!cancelled) setOrg(activeOrg)
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Unable to load Comms.")
        }
      }
    }

    void ensureCommsContext()
    return () => { cancelled = true }
  }, [user])

  if (!user) {
    return (
      <aside className="hidden min-w-0 border-l border-black bg-black p-4 lg:flex lg:flex-col">
        <p className="text-[15px] text-[#35516A]">Sign in to open PrepSight Comms.</p>
      </aside>
    )
  }

  if (!org) {
    return (
      <aside className="hidden min-w-0 border-l border-black bg-black lg:flex lg:min-h-[calc(100vh-5.5rem)] lg:flex-col lg:items-center lg:justify-center">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#29b6d8] border-t-transparent" />
          <p className="text-[14px] text-[#35516A]">Preparing PrepSight Comms...</p>
          {errorText ? <p className="text-[12px] text-[#B45309]">{errorText}</p> : null}
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden min-w-0 border-l border-black bg-black lg:block lg:min-h-[calc(100vh-5.5rem)]">
      <div className="h-[calc(100vh-5.5rem)]">
        <MainApp
          user={user}
          org={org}
          onSignOut={() => {
            setUser(null)
            setOrg(null)
          }}
          onSwitchOrg={() => {
            setOrg(null)
          }}
          embedded
        />
      </div>
    </aside>
  )
}

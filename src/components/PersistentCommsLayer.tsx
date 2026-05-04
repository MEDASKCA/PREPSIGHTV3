"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
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
import { getProfile } from "@/lib/profile"
import {
  getDesktopCommsPreference,
  getDesktopCommsWidth,
  subscribeDesktopCommsPreference,
} from "@/lib/desktop-comms"

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

// Persistent comms host — lives at AppGate level so it never unmounts on navigation.
// The container uses fixed positioning; when width=0 it is invisible but MainApp stays
// in the React tree, keeping WebRTC connections and call state alive across page changes.
// position:fixed descendants (call overlay, floating pill) escape overflow:hidden and
// render at their viewport positions regardless of container width.
export default function PersistentCommsLayer() {
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<CommsOrg | null>(null)
  const [profileHospital, setProfileHospital] = useState("")
  const [profileDepartment, setProfileDepartment] = useState("")

  const commsRailOpen = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsPreference,
    getDesktopCommsPreference,
  )
  const commsRailWidth = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsWidth,
    getDesktopCommsWidth,
  )

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
        const psProfileSnap = await getDoc(doc(firestore, "users", currentUser.uid))
        const psProfile = psProfileSnap.exists() ? (psProfileSnap.data() as Record<string, unknown>) : {}
        const localProfile = getProfile()
        const resolvedHospital = (typeof psProfile.hospital === "string" && psProfile.hospital.trim()) || localProfile?.hospital?.trim() || ""
        const resolvedDept = (Array.isArray(psProfile.departments) && psProfile.departments.length > 0
          ? String(psProfile.departments[0]).trim()
          : "") || (localProfile?.departments?.[0]?.trim() ?? "")
        const resolvedRole = (typeof psProfile.jobTitle === "string" && psProfile.jobTitle.trim()) || localProfile?.jobTitle?.trim() || DEFAULT_CLINICAL_ROLE
        const resolvedName = (typeof psProfile.name === "string" && psProfile.name.trim()) || localProfile?.name?.trim() || currentUser.displayName || currentUser.email || "User"

        const memberSnap = await getDocs(
          query(collection(firestore, "comms_v5_memberships"), where("uid", "==", currentUser.uid)),
        )

        if (!memberSnap.empty) {
          const activeMembership = memberSnap.docs.find(d => d.data().status === "active")
          const bestMembership = activeMembership ?? memberSnap.docs[0]
          const orgId = String(bestMembership.data().orgId || "")
          if (orgId) {
            const orgDoc = await getDoc(doc(firestore, "comms_v5_orgs", orgId))
            if (orgDoc.exists()) {
              if (!activeMembership) {
                await setDoc(doc(firestore, "comms_v5_memberships", bestMembership.id), { status: "active" }, { merge: true })
              }
              const userRef = doc(firestore, "comms_v5_users", currentUser.uid)
              const updatePayload: Partial<CommsUser> = {
                displayName: resolvedName,
                email: currentUser.email || "",
                updatedAt: Date.now(),
              }
              if (resolvedHospital) updatePayload.hospital = resolvedHospital
              if (resolvedDept) { updatePayload.department = resolvedDept; updatePayload.groupLabel = resolvedDept }
              if (resolvedRole) updatePayload.clinicalRole = resolvedRole
              await setDoc(userRef, updatePayload, { merge: true })
              if (!cancelled) {
                setProfileHospital(resolvedHospital)
                setProfileDepartment(resolvedDept)
                setOrg({ id: orgDoc.id, ...orgDoc.data() } as CommsOrg)
              }
              return
            }
          }
        }

        const userRef = doc(firestore, "comms_v5_users", currentUser.uid)
        const userSnap = await getDoc(userRef)
        const existingUser = userSnap.exists() ? (userSnap.data() as Partial<CommsUser>) : {}
        const hospital = resolvedHospital || existingUser.hospital?.trim() || DEFAULT_HOSPITAL
        const dept = resolvedDept || existingUser.department?.trim() || DEFAULT_DEPARTMENT
        const hydratedUser: CommsUser = {
          uid: currentUser.uid,
          displayName: resolvedName,
          email: currentUser.email || "",
          hospital,
          department: dept,
          clinicalRole: resolvedRole,
          specialties: existingUser.specialties?.length
            ? existingUser.specialties.map(v => v.trim()).filter(Boolean)
            : DEFAULT_THEATRE_GROUPS,
          groupLabel: dept,
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
            name: hydratedUser.hospital ?? "",
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

        await setDoc(
          doc(firestore, "comms_v5_memberships", `${currentUser.uid}__${activeOrg.id}`),
          { uid: currentUser.uid, orgId: activeOrg.id, displayName: hydratedUser.displayName, status: "active", joinedAt: Date.now() },
          { merge: true },
        )

        const existingThreadsSnap = await getDocs(
          query(collection(firestore, "comms_v5_threads"), where("organizationId", "==", activeOrg.id)),
        )
        const existingThreadNames = new Set(
          existingThreadsSnap.docs
            .map(d => String(d.data().name || "").trim().toLowerCase())
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

        if (!cancelled) {
          setProfileHospital(resolvedHospital)
          setProfileDepartment(resolvedDept)
          setOrg(activeOrg)
        }
      } catch {
        // Silently fail — comms is non-blocking; the user can still use the app
      }
    }

    void ensureCommsContext()
    return () => { cancelled = true }
  }, [user])

  if (!user || !org) return null

  return (
    <div
      className={`hidden lg:block fixed right-0 z-[200] overflow-hidden transition-none ${commsRailOpen ? "border-l-[3px] border-[#2d2d2d] bg-black" : ""}`}
      style={{
        width: commsRailOpen ? commsRailWidth : 0,
        top: 0,
        height: "100vh",
      }}
    >
      {commsRailOpen ? (
        <>
          <button
            type="button"
            onMouseDown={(event) => {
              ;(window as Window & { __prepsightStartCommsResize?: (nextEvent: MouseEvent) => void }).__prepsightStartCommsResize?.(
                event.nativeEvent,
              )
            }}
            className="absolute left-0 top-0 z-[205] h-full w-[4px] cursor-col-resize bg-[#333333]"
            aria-label="Resize PrepSight Comms panel"
            title="Resize PrepSight Comms panel"
          />
        </>
      ) : null}
      <div className="h-full">
        <MainApp
          user={user}
          org={org}
          onSignOut={() => { setUser(null); setOrg(null) }}
          onSwitchOrg={() => setOrg(null)}
          profileHospital={profileHospital}
          profileDepartment={profileDepartment}
          embedded
          visible={commsRailOpen}
        />
      </div>
    </div>
  )
}

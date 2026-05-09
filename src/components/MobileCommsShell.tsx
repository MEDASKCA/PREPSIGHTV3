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
import { getProfile } from "@/lib/profile"

const DEFAULT_HOSPITAL       = "Royal Free Hospital"
const DEFAULT_DEPARTMENT     = "Operating Theatres"
const DEFAULT_CLINICAL_ROLE  = "Clinical role not set"
const DEFAULT_THEATRE_GROUPS = [
  "Trauma and Orthopaedics","General Surgery","Urology","Obstetrics",
  "Gynaecology","Otolaryngology","Oral and Maxillofacial","Dental",
  "Plastics","Neurosurgery","Cardiac","Vascular","Paediatrics",
  "Ophthalmology","Podiatry","Anaesthetics",
]

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function MobileCommsShell({
  visible = true,
  hideHeader = false,
  allowFoldableSplitView = true,
  suppressCallOverlay = false,
  onDirectThreadActiveChange,
  restoreStoredThread = false,
  ownsGlobalCallStatus = true,
}: {
  visible?: boolean
  hideHeader?: boolean
  allowFoldableSplitView?: boolean
  suppressCallOverlay?: boolean
  onDirectThreadActiveChange?: (active: boolean) => void
  restoreStoredThread?: boolean
  ownsGlobalCallStatus?: boolean
}) {
  const [user, setUser]         = useState<User | null>(null)
  const [org, setOrg]           = useState<CommsOrg | null>(null)
  const [errorText, setErrorText] = useState("")
  const [profileHospital, setProfileHospital] = useState("")
  const [profileDepartment, setProfileDepartment] = useState("")

  useEffect(() => onAuthChange(nextUser => setUser(nextUser)), [])

  useEffect(() => {
    if (!user || !db) { setOrg(null); return }
    const currentUser = user
    const firestore   = db
    let cancelled     = false

    async function ensureCommsContext() {
      try {
        // Always read the PrepSight profile so hospital/dept reflect onboarding choices.
        // Fall back to the locally cached profile when the Firestore doc is missing (e.g. new database).
        const psProfileSnap = await getDoc(doc(firestore, "users", currentUser.uid))
        const psProfile = psProfileSnap.exists() ? (psProfileSnap.data() as Record<string, unknown>) : {}
        const localProfile = getProfile()
        const profileHospital = (typeof psProfile.hospital === "string" && psProfile.hospital.trim()) || localProfile?.hospital?.trim() || ""
        const profileDept = (Array.isArray(psProfile.departments) && psProfile.departments.length > 0
          ? String(psProfile.departments[0]).trim()
          : "") || (localProfile?.departments?.[0]?.trim() ?? "")
        const profileRole = (typeof psProfile.jobTitle === "string" && psProfile.jobTitle.trim()) || localProfile?.jobTitle?.trim() || DEFAULT_CLINICAL_ROLE
        const profileName = (typeof psProfile.name === "string" && psProfile.name.trim()) || localProfile?.name?.trim() || currentUser.displayName || currentUser.email || "User"

        // Query ALL memberships (any status) so we can reactivate one that was accidentally deactivated
        const memberSnap = await getDocs(
          query(collection(firestore, "comms_v5_memberships"), where("uid", "==", currentUser.uid)),
        )
        if (!memberSnap.empty) {
          // Prefer active membership; fall back to the first inactive one (reactivate it)
          const activeMembership = memberSnap.docs.find(d => d.data().status === "active")
          const bestMembership = activeMembership ?? memberSnap.docs[0]
          const orgId = String(bestMembership.data().orgId || "")
          if (orgId) {
            const orgDoc = await getDoc(doc(firestore, "comms_v5_orgs", orgId))
            if (orgDoc.exists()) {
              // Reactivate if needed
              if (!activeMembership) {
                await setDoc(doc(firestore, "comms_v5_memberships", bestMembership.id), { status: "active" }, { merge: true })
              }
              // Sync comms user record with current PrepSight profile on every login
              const userRef = doc(firestore, "comms_v5_users", currentUser.uid)
              const updatePayload: Partial<CommsUser> = {
                displayName: profileName,
                email: currentUser.email || "",
                updatedAt: Date.now(),
              }
              if (profileHospital) updatePayload.hospital = profileHospital
              if (profileDept) { updatePayload.department = profileDept; updatePayload.groupLabel = profileDept }
              if (profileRole) updatePayload.clinicalRole = profileRole
              await setDoc(userRef, updatePayload, { merge: true })
              if (!cancelled) {
                setProfileHospital(profileHospital)
                setProfileDepartment(profileDept)
                setOrg({ id: orgDoc.id, ...orgDoc.data() } as CommsOrg)
              }
              return
            }
          }
        }

        const userRef       = doc(firestore, "comms_v5_users", currentUser.uid)
        const userSnap      = await getDoc(userRef)
        const existingUser  = userSnap.exists() ? (userSnap.data() as Partial<CommsUser>) : {}
        const resolvedHospital = profileHospital || existingUser.hospital?.trim() || DEFAULT_HOSPITAL
        const resolvedDept = profileDept || existingUser.department?.trim() || DEFAULT_DEPARTMENT
        const hydratedUser: CommsUser = {
          uid:          currentUser.uid,
          displayName:  profileName,
          email:        currentUser.email || "",
          hospital:     resolvedHospital,
          department:   resolvedDept,
          clinicalRole: profileRole,
          specialties:  existingUser.specialties?.length
            ? existingUser.specialties.map(v => v.trim()).filter(Boolean)
            : DEFAULT_THEATRE_GROUPS,
          groupLabel:   resolvedDept,
          updatedAt:    Date.now(),
          ...(existingUser.photoURL ? { photoURL: existingUser.photoURL } : {}),
        }
        await setDoc(userRef, hydratedUser, { merge: true })

        const orgSnap = await getDocs(query(collection(firestore, "comms_v5_orgs"), where("name", "==", hydratedUser.hospital)))
        let activeOrg: CommsOrg
        if (!orgSnap.empty) {
          const orgDoc = orgSnap.docs[0]
          activeOrg = { id: orgDoc.id, ...orgDoc.data() } as CommsOrg
        } else {
          const orgRef = doc(collection(firestore, "comms_v5_orgs"))
          activeOrg = { id: orgRef.id, name: hydratedUser.hospital ?? "", joinCode: generateJoinCode(), createdBy: currentUser.uid, createdAt: Date.now() }
          await setDoc(orgRef, { name: activeOrg.name, joinCode: activeOrg.joinCode, createdBy: activeOrg.createdBy, createdAt: activeOrg.createdAt })
        }

        await setDoc(doc(firestore, "comms_v5_memberships", `${currentUser.uid}__${activeOrg.id}`), {
          uid: currentUser.uid, orgId: activeOrg.id, displayName: hydratedUser.displayName, status: "active", joinedAt: Date.now(),
        }, { merge: true })

        const existingThreadsSnap = await getDocs(query(collection(firestore, "comms_v5_threads"), where("organizationId", "==", activeOrg.id)))
        const existingThreadNames = new Set(existingThreadsSnap.docs.map(d => String(d.data().name || "").trim().toLowerCase()).filter(Boolean))

        for (const groupName of hydratedUser.specialties ?? []) {
          const normalized = groupName.trim().toLowerCase()
          if (!normalized || existingThreadNames.has(normalized)) continue
          await addDoc(collection(firestore, "comms_v5_threads"), {
            type: "channel", name: groupName, description: `${hydratedUser.department || DEFAULT_DEPARTMENT} group`,
            organizationId: activeOrg.id, memberUids: [currentUser.uid], createdBy: currentUser.uid,
            createdAt: Date.now(), updatedAt: Date.now(), lastMessage: "",
          })
          existingThreadNames.add(normalized)
        }

        if (!cancelled) {
          setProfileHospital(profileHospital)
          setProfileDepartment(profileDept)
          setOrg(activeOrg)
        }
      } catch (error) {
        if (!cancelled) setErrorText(error instanceof Error ? error.message : "Unable to load Comms.")
      }
    }

    void ensureCommsContext()
    return () => { cancelled = true }
  }, [user])

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-[15px] text-[#35516A]">Sign in to open PrepSight Comms.</p>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#29b6d8] border-t-transparent" />
        <p className="text-[14px] text-[#35516A]">Preparing PrepSight Comms...</p>
        {errorText ? <p className="text-[12px] text-[#B45309]">{errorText}</p> : null}
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MainApp
        user={user}
        org={org}
        onSignOut={() => { setUser(null); setOrg(null) }}
        onSwitchOrg={() => setOrg(null)}
        profileHospital={profileHospital}
        profileDepartment={profileDepartment}
        embedded
        showProfileButton
        visible={visible}
        hideMobileHeader={hideHeader}
        allowFoldableSplitView={allowFoldableSplitView}
        suppressCallOverlay={suppressCallOverlay}
        onDirectThreadActiveChange={onDirectThreadActiveChange}
        restoreStoredThread={restoreStoredThread}
        ownsGlobalCallStatus={ownsGlobalCallStatus}
      />
    </div>
  )
}

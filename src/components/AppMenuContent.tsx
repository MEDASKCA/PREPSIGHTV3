"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth"
import { clearProfile } from "@/lib/profile"

export default function AppMenuContent() {
  const router = useRouter()

  async function handleSignOut() {
    clearProfile()
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <Link href="/" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Dashboard
      </Link>
      <Link href="/" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Repositories
      </Link>
      <Link href="/review" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Review
      </Link>
      <Link href="/calendar" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Calendar
      </Link>
      <Link href="/catalogue" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Catalogue
      </Link>
      <Link href="/suppliers" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Suppliers
      </Link>
      <Link href="/directory" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Directory
      </Link>
      <div className="my-2 border-t border-[#D5EAF1]" />
      <Link href="/settings/access" className="block rounded-[10px] px-3 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]">
        Settings
      </Link>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] text-[#10243E] hover:bg-[#F4FBFF]"
      >
        Sign out
      </button>
    </div>
  )
}

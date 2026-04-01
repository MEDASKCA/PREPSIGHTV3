import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { PLATFORM_ROLE_COOKIE_KEY } from "@/lib/profile"

export default async function ReviewModerationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const platformRole = cookieStore.get(PLATFORM_ROLE_COOKIE_KEY)?.value

  if (platformRole !== "moderator" && platformRole !== "admin") {
    redirect("/review")
  }

  return children
}

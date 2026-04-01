import { headers } from "next/headers"

function isPrivateLanHost(host: string) {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  const match172 = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
  if (match172) {
    const secondOctet = Number(match172[1])
    return secondOctet >= 16 && secondOctet <= 31
  }
  return false
}

export async function isDevRequestHost() {
  const store = await headers()
  const forwardedHost = store.get("x-forwarded-host")
  const hostHeader = forwardedHost || store.get("host") || ""
  const host = hostHeader.split(":")[0].trim().toLowerCase()
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || isPrivateLanHost(host)
}

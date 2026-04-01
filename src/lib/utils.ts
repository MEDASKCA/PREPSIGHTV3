const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "sir", "rev"])

/** Derive up to 2 initials from a display name, skipping honorifics. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(
    (w) => !HONORIFICS.has(w.toLowerCase().replace(/\.$/, ""))
  )
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Pick a consistent background colour for an avatar from a small palette. */
const AVATAR_COLOURS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-teal-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-orange-600",
]

export function avatarColour(seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length]
}

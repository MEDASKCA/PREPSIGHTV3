import { notFound } from "next/navigation"

import FixedDataCurationClient from "@/components/FixedDataCurationClient"
import { isDevRequestHost } from "@/lib/dev-access"

export const metadata = {
  title: "Fixed-data Curation | PrepSight Dev",
}

export default async function FixedDataDevPage() {
  const allowed = await isDevRequestHost()
  if (!allowed) {
    notFound()
  }

  return <FixedDataCurationClient />
}

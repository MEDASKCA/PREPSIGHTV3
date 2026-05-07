import LibraryPageClient from "@/components/LibraryPageClient"
import V4LibraryRouteShell from "@/components/V4LibraryRouteShell"

export async function generateStaticParams() { return [{ id: "_" }] }

interface Props {
  params: Promise<{ id: string }>
}

export default async function LibraryPage({ params }: Props) {
  const { id } = await params
  return (
    <V4LibraryRouteShell>
      <LibraryPageClient libraryId={id} />
    </V4LibraryRouteShell>
  )
}

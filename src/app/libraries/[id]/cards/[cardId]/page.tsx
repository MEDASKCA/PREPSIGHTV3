import LibraryCardRouteClient from "@/components/LibraryCardRouteClient"
import V4LibraryRouteShell from "@/components/V4LibraryRouteShell"

export async function generateStaticParams() { return [{ id: "_", cardId: "_" }] }

interface Props {
  params: Promise<{ id: string; cardId: string }>
}

export default async function LibraryCardPage({ params }: Props) {
  const { id, cardId } = await params
  return (
    <V4LibraryRouteShell>
      <LibraryCardRouteClient libraryId={id} cardId={cardId} />
    </V4LibraryRouteShell>
  )
}

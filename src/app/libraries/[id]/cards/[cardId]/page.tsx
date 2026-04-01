import LibraryCardRouteClient from "@/components/LibraryCardRouteClient"

interface Props {
  params: Promise<{ id: string; cardId: string }>
}

export default async function LibraryCardPage({ params }: Props) {
  const { id, cardId } = await params
  return <LibraryCardRouteClient libraryId={id} cardId={cardId} />
}

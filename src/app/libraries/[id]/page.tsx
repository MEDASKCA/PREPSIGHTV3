import LibraryPageClient from "@/components/LibraryPageClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function LibraryPage({ params }: Props) {
  const { id } = await params
  return <LibraryPageClient libraryId={id} />
}

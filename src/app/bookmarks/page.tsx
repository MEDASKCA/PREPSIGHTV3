import BookmarksPageClient from "@/components/BookmarksPageClient"
import MobileBookmarksPage from "@/components/MobileBookmarksPage"

export default function BookmarksPage() {
  return (
    <>
      <div className="lg:hidden">
        <MobileBookmarksPage />
      </div>
      <div className="hidden lg:block">
        <BookmarksPageClient />
      </div>
    </>
  )
}

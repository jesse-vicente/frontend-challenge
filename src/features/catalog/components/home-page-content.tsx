import { type CatalogSearch } from '../search'
import { CatalogSection } from './catalog-section'
import { HomeJournal, HomePromos } from './home-editorial'
import { HomeHero } from './home-hero'
import { MobileCatalogBar } from './mobile-catalog-bar'

export interface HomePageContentProps {
  search: CatalogSearch
  onSearchChange: (patch: Partial<CatalogSearch>, options?: { resetPage?: boolean }) => void
}

/** "Marketplace Page": also rendered behind the auth modals, as in the layout. */
export function HomePageContent({ search, onSearchChange }: HomePageContentProps) {
  return (
    <main className="page-container flex flex-col gap-6 pt-10 md:gap-24 md:pt-8">
      <MobileCatalogBar search={search} onSearchChange={onSearchChange} />
      <HomeHero />
      <CatalogSection search={search} onSearchChange={onSearchChange} />
      <div className="flex flex-col gap-16 pt-4 md:gap-24 md:pt-0">
        <HomePromos />
        <HomeJournal />
      </div>
    </main>
  )
}

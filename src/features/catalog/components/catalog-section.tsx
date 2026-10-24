import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useFavorites } from '@/features/favorites/queries'
import { announce } from '@/shared/a11y/announcer'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { cn } from '@/shared/lib/cn'
import { useReveal } from '@/shared/lib/use-reveal'
import { Button } from '@/shared/ui/button'
import { nftHighlightsQuery, nftListQuery } from '../queries'
import { type CatalogSearch, toListParams } from '../search'
import { CatalogFilters } from './catalog-filters'
import { CatalogPagination } from './catalog-pagination'
import { SegmentTabs, SortMenu } from './catalog-toolbar'
import { FeaturedBanner } from './featured-banner'
import { NftCard, NftCardSkeleton } from './nft-card'

export interface CatalogSectionProps {
  search: CatalogSearch
  /** Filter changes reset pagination; page changes keep the filters. */
  onSearchChange: (patch: Partial<CatalogSearch>, options?: { resetPage?: boolean }) => void
}

const SKELETON_KEYS = Array.from({ length: 9 }, (_, index) => `skeleton-${index}`)

function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(search.q || search.categories?.length || search.networks?.length || search.priceMin || search.priceMax)
}

export function CatalogSection({ search, onSearchChange }: CatalogSectionProps) {
  const reveal = useReveal()
  const params = toListParams(search)
  const list = useQuery(nftListQuery(params))
  const highlights = useQuery(nftHighlightsQuery())
  const favorites = useFavorites()
  const sectionRef = useRef<HTMLElement>(null)
  const page = list.data?.page ?? params.page ?? 1
  const totalPages = list.data?.totalPages ?? 0

  // Announce result counts once a new query settles.
  const total = list.data?.total
  const settled = list.isSuccess && !list.isPlaceholderData
  useEffect(() => {
    if (settled && total !== undefined) {
      announce(
        total === 0 ? 'Nenhum NFT encontrado.' : `${total} ${total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}.`,
      )
    }
  }, [settled, total])

  // A page beyond the last one (e.g. stale link) falls back to the last page.
  useEffect(() => {
    if (settled && totalPages > 0 && page > totalPages) onSearchChange({ page: totalPages })
  }, [settled, page, totalPages, onSearchChange])

  const changeFilters = (patch: Partial<CatalogSearch>) => onSearchChange(patch, { resetPage: true })
  const changePage = (next: number) => {
    onSearchChange({ page: next === 1 ? undefined : next })
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  let content: React.ReactNode
  if (list.isPending) {
    content = SKELETON_KEYS.map((key) => <NftCardSkeleton key={key} />)
  } else if (list.isError) {
    content = (
      <ErrorState
        className="col-span-full"
        title="Não foi possível carregar o catálogo"
        error={list.error}
        retrying={list.isFetching}
        onRetry={() => void list.refetch()}
      />
    )
  } else if (list.data.items.length === 0) {
    content = (
      <EmptyState
        className="col-span-full"
        title="Nenhum NFT encontrado"
        description={
          hasActiveFilters(search)
            ? 'Nenhum resultado para os filtros selecionados. Ajuste a busca ou limpe os filtros.'
            : 'Ainda não há NFTs listados no mercado.'
        }
        action={
          hasActiveFilters(search) ? (
            <Button
              variant="outline"
              onClick={() =>
                changeFilters({
                  q: undefined,
                  categories: undefined,
                  networks: undefined,
                  priceMin: undefined,
                  priceMax: undefined,
                })
              }
            >
              Limpar filtros
            </Button>
          ) : null
        }
      />
    )
  } else {
    content = list.data.items.map((nft, index) => (
      <NftCard key={nft.id} nft={nft} favorite={favorites.ids.has(nft.id)} priority={index < 3} revealIndex={index} />
    ))
  }

  return (
    <section
      ref={sectionRef}
      id="market"
      aria-labelledby="catalog-title"
      className="scroll-mt-6 md:scroll-mt-24 lg:flex lg:items-start lg:gap-12"
    >
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>

      <aside ref={reveal} aria-label="Filtros" className="reveal hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
        <CatalogFilters search={search} facets={list.data?.facets} onChange={changeFilters} className="w-[310px]" />
        <FeaturedBanner nft={highlights.data?.featured} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-14 md:items-end lg:gap-[88px]">
        <div className="flex w-full flex-col gap-4 md:gap-8">
          <div ref={reveal} className="reveal flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <SegmentTabs
              segment={search.segment ?? 'all'}
              onChange={(segment) => changeFilters({ segment: segment === 'all' ? undefined : segment })}
              className="max-w-full overflow-x-auto"
            />
            <div className="hidden md:block">
              <SortMenu
                sort={search.sort ?? 'newest'}
                onChange={(sort) => changeFilters({ sort: sort === 'newest' ? undefined : sort })}
              />
            </div>
          </div>

          {search.q ? (
            <p className="text-sm text-sand">
              Resultados para <strong className="text-foreground">“{search.q}”</strong>{' '}
              <button type="button" className="text-amber underline" onClick={() => changeFilters({ q: undefined })}>
                limpar busca
              </button>
            </p>
          ) : null}

          <div
            aria-busy={list.isFetching}
            className={cn(
              'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px] md:pb-0',
              // Mobile frame: the right column sits lower than the left one.
              'max-md:[&>article:nth-child(even)]:translate-y-8',
              list.isPlaceholderData && 'opacity-60 transition-opacity',
            )}
          >
            {content}
          </div>
        </div>
        <CatalogPagination page={page} totalPages={totalPages} onPageChange={changePage} />
      </div>
    </section>
  )
}

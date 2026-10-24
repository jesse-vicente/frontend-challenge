import { useQueries } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { NftCard } from '@/features/catalog/components/nft-card'
import { nftDetailQuery } from '@/features/catalog/queries'
import { useFavorites } from '@/features/favorites/queries'
import { EmptyState, ErrorState } from '@/shared/components/feedback-states'
import { Button } from '@/shared/ui/button'

/** "Lista de interesse": the collector's favorited NFTs (no frame; reuses the catalog cards). */
export function FavoritesSection() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const nfts = useQueries({ queries: ids.map((id) => nftDetailQuery(id)) })
  const loaded = favorites.isSuccess && nfts.every((query) => !query.isPending)
  const section = useRef<HTMLElement>(null)
  const targeted = useLocation({ select: (location) => location.hash === 'favoritos' })

  // The list loads after navigation, so the hash target is scrolled to once it has its final height.
  useEffect(() => {
    if (targeted && loaded)
      section.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
  }, [targeted, loaded])

  return (
    <section
      ref={section}
      id="favoritos"
      aria-labelledby="favorites-title"
      className="mt-16 scroll-mt-6 border-t border-border pt-10 md:scroll-mt-24"
    >
      <h2 id="favorites-title" className="mb-6 text-base font-bold text-foreground">
        Lista de interesse
      </h2>
      {favorites.isError ? (
        <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />
      ) : !loaded ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="skeleton h-[300px] rounded-lg" />
          <div className="skeleton h-[300px] rounded-lg" />
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          title="Nenhum NFT na sua lista"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="mercado">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {nfts.map((query, index) => (
            <li key={ids[index]}>
              {query.data ? (
                <NftCard nft={query.data} favorite />
              ) : (
                <p className="text-sm text-sand">Este NFT não está mais disponível.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

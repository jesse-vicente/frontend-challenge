import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { nftListQuery } from '@/features/catalog/queries'
import { cn } from '@/shared/lib/cn'

const PAGE_SIZE = 5
const PAGES = 3
const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e']

/** "Related Products": NFTs of the same collection in a snap carousel with page dots. */
export function RelatedCarousel({ nftId, collectionId }: { nftId: string; collectionId: string }) {
  const { data, isPending } = useQuery(
    nftListQuery({ collectionId, excludeId: nftId, pageSize: PAGE_SIZE * PAGES, page: 1 }),
  )
  const trackRef = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const items = data?.items ?? []
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => setPage(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)))
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (index: number) => {
    const track = trackRef.current
    track?.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }

  if (!isPending && items.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <h2 id="related-title" className="border-b border-border pb-2 text-lg leading-7 font-bold text-amber">
        Mais desta coleção
      </h2>
      <ul
        ref={trackRef}
        className="grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[calc((100%-4*24px)/5)] grid-flow-col gap-6 overflow-x-auto scroll-smooth pb-2 max-md:auto-cols-[46%] max-md:gap-4"
      >
        {isPending
          ? SKELETON_KEYS.map((key) => (
              <li key={key} className="snap-start">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="snap-start">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
      {pages > 1 ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, index) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: dots are positional
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir para o grupo ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              className={cn('size-3 rounded-full border-[1.5px] border-primary', index === page && 'bg-primary')}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

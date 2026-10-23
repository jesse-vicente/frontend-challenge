import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { type NftListParams } from '@/shared/api/dtos/nft'
import { cn } from '@/shared/lib/cn'
import { nftListQuery } from '../queries'
import { NftCard, NftCardSkeleton } from './nft-card'

const PAGE_SIZE = 5
const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e']

/**
 * Horizontal product carousel ("Mais desta coleção", "Colecionadores também viram"):
 * scroll-snap track with page dots, five cards per page on desktop.
 */
export function NftCarousel({ title, params }: { title: string; params: NftListParams }) {
  const { data, isPending } = useQuery(nftListQuery({ pageSize: PAGE_SIZE * 3, page: 1, ...params }))
  const trackRef = useRef<HTMLUListElement>(null)
  const titleId = useId()
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
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <h2 id={titleId} className="border-b border-border pb-2 text-lg leading-7 font-bold text-amber">
        {title}
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
        <div className="flex justify-center">
          {Array.from({ length: pages }, (_, index) => (
            // 12px dot of the layout inside a 24px target (WCAG 2.5.8).
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: dots are positional
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir para o grupo ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              className="grid size-6 place-items-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={cn('size-3 rounded-full border-[1.5px] border-primary', index === page && 'bg-primary')}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

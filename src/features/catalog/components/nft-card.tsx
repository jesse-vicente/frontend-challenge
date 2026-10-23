import { Link } from '@tanstack/react-router'
import favoriteBadge from '@/assets/icons/favorite-badge.svg'
import { type NftSummaryDto } from '@/shared/api/dtos/nft'
import { NftImage } from '@/shared/components/nft-image'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/format'
import { RARITY_LABELS } from '../labels'

interface NftCardProps {
  nft: NftSummaryDto
  favorite?: boolean
  priority?: boolean
  className?: string
}

/** Product card: desktop follows the grid card (258×300), mobile the rounded "P-n" card. */
export function NftCard({ nft, favorite = false, priority = false, className }: NftCardProps) {
  const soldOut = nft.availability === 'sold-out'

  return (
    <article className={cn('group relative flex flex-col gap-2 md:gap-3', className)}>
      <div
        className={cn(
          'relative flex h-[200px] items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(139.5deg,#241612_12%,#2f1d15_106.6%)] px-1',
          'md:h-[300px] md:rounded-none md:bg-surface md:bg-none md:px-1',
        )}
      >
        <NftImage
          image={nft.image}
          decorative
          sizes="(min-width: 768px) 250px, 168px"
          priority={priority}
          className={cn(
            'size-[168px] rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] md:size-[250px] md:rounded-[15px]',
            soldOut && 'opacity-60 grayscale-[40%]',
          )}
        />
        {nft.rarity !== 'common' ? (
          <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center bg-primary pl-2 text-[13px] leading-4 font-medium text-ink md:hidden">
            {RARITY_LABELS[nft.rarity].toUpperCase()}
          </span>
        ) : null}
        {favorite ? (
          <img
            src={favoriteBadge}
            alt=""
            width={28}
            height={28}
            className="absolute top-[18px] right-[10px] size-7 md:hidden"
          />
        ) : null}
        {soldOut ? (
          <span className="absolute right-3 bottom-3 rounded-sm bg-ink/85 px-2 py-1 text-xs font-bold text-amber">
            ESGOTADO
          </span>
        ) : null}
      </div>
      <div className="flex flex-col pl-2 md:gap-1.5 md:pl-0">
        <h3 className="text-[15px] leading-[normal] text-foreground md:text-base md:leading-4">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-ring md:after:rounded-none"
          >
            {nft.name}
            {favorite ? <span className="sr-only"> (favorito)</span> : null}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-base leading-4 font-bold text-amber md:text-lg">
          <span>{formatEth(nft.price)}</span>
          {nft.compareAtPrice ? (
            <del className="font-normal text-tan">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.compareAtPrice)}
            </del>
          ) : null}
        </p>
      </div>
    </article>
  )
}

/** Placeholder with the exact card geometry, so loading never shifts the layout. */
export function NftCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2 md:gap-3">
      <div className="skeleton h-[200px] rounded-[20px] md:h-[300px] md:rounded-none" />
      <div className="flex flex-col gap-1.5 pl-2 md:pl-0">
        <div className="skeleton h-4 w-3/4 rounded-sm" />
        <div className="skeleton h-4 w-1/3 rounded-sm" />
      </div>
    </div>
  )
}

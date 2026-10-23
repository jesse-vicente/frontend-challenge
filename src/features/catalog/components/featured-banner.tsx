import { Link } from '@tanstack/react-router'
import { type NftSummaryDto } from '@/shared/api/dtos/nft'
import { NftImage } from '@/shared/components/nft-image'
import { formatEth } from '@/shared/lib/format'

/** "Featured NFT Banner" of the sidebar: the top trending NFT on sale. */
export function FeaturedBanner({ nft }: { nft: NftSummaryDto | null | undefined }) {
  return (
    <section
      aria-labelledby="featured-title"
      className="relative flex h-[470px] w-[310px] overflow-hidden bg-[linear-gradient(180deg,rgba(210,138,76,0.1),rgba(210,138,76,0.03))] pt-6 pb-1"
    >
      <div className="relative z-10 flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-4 px-5">
          <h2 id="featured-title" className="w-full text-2xl leading-8 font-bold text-amber">
            NFT EM DESTAQUE
          </h2>
          <p className="w-full text-center text-[22px] leading-4 font-bold text-foreground">OFERTA LIMITADA</p>
        </div>
        {nft ? (
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group relative block rounded-[22px]">
            <NftImage image={nft.image} sizes="310px" className="h-[368px] w-full rounded-[22px]" />
            <span className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md bg-ink/85 px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="truncate text-sm text-foreground">{nft.name}</span>
              <span className="text-sm font-bold text-amber">{formatEth(nft.price)}</span>
            </span>
          </Link>
        ) : (
          <div aria-hidden="true" className="skeleton h-[368px] w-full rounded-[22px]" />
        )}
      </div>
      {/* Decorative shapes from the layout. */}
      <div
        aria-hidden="true"
        className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20"
      />
      <div
        aria-hidden="true"
        className="absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-[linear-gradient(145.5deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-[linear-gradient(145.5deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]"
      />
    </section>
  )
}

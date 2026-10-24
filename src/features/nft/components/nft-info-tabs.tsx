import { NETWORK_LABELS } from '@/features/catalog/labels'
import { type NftDetailDto } from '@/shared/api/dtos/nft'
import { StarRating } from '@/shared/components/star-rating'
import { formatDateTime, shortenAddress } from '@/shared/lib/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const triggerClass =
  'relative h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-2 font-normal text-base text-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-amber data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary'

/** "Description" section: NFT details and collector reviews. */
export function NftInfoTabs({ nft }: { nft: NftDetailDto }) {
  const network = NETWORK_LABELS[nft.network]
  return (
    <Tabs defaultValue="details" className="gap-0">
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0">
        <TabsTrigger value="details" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={triggerClass}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="flex flex-col gap-4 pt-4 text-sm leading-6 text-sand">
        <div className="flex flex-col gap-6">
          {nft.details.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          {/* The layout swaps these two labels; content is kept under the matching label. */}
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              <span className="font-mono">{shortenAddress(nft.contractAddress)}</span> • Contrato inteligente{' '}
              {nft.tokenStandard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos
              mercados compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>

      <TabsContent value="reviews" className="pt-4">
        <ul className="flex flex-col divide-y divide-border">
          {nft.reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold text-foreground">{review.author}</p>
                <StarRating value={review.rating} />
                <time dateTime={review.createdAt} className="text-xs text-sand">
                  {formatDateTime(review.createdAt)}
                </time>
              </div>
              <p className="text-sm leading-6 text-sand">{review.comment}</p>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}

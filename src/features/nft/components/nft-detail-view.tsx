import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Mail, ShoppingCart, Star } from 'lucide-react'
import linkedinIcon from '@/assets/icons/social-linkedin.svg'
import twitterIcon from '@/assets/icons/social-twitter.svg'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { type NftDetailDto } from '@/shared/api/dtos/nft'
import { NftImage } from '@/shared/components/nft-image'
import { QuantityStepper } from '@/shared/components/quantity-stepper'
import { StarRating } from '@/shared/components/star-rating'
import { formatEth } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { type NftPurchase, useNftPurchase } from '../use-nft-purchase'
import { EditionChips } from './edition-chips'
import { FavoriteButton, FavoriteIconButton } from './favorite-button'
import { NftGallery } from './nft-gallery'
import { NftInfoTabs } from './nft-info-tabs'

function ShareLinks({ nft }: { nft: NftDetailDto }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: linkedinIcon,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: null,
    },
    {
      label: 'X (Twitter)',
      href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: twitterIcon,
    },
  ]
  return (
    <div className="flex items-center gap-2.5">
      <p className="text-sm leading-4 font-bold text-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-2">
        {links.map(({ label, href, icon }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}${href.startsWith('mailto:') ? '' : ' (abre em nova aba)'}`}
              className="grid size-6 place-items-center rounded-sm text-foreground hover:text-amber"
            >
              {icon ? (
                <img src={icon} alt="" width={22} height={22} className="size-[22px]" />
              ) : (
                <Mail aria-hidden="true" className="size-[18px]" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TokenInfo({ nft }: { nft: NftDetailDto }) {
  return (
    <dl className="flex flex-col gap-3 text-[15px] leading-5 text-sand">
      <div className="flex gap-1">
        <dt>ID do token:</dt>
        <dd>{nft.tokenId}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Coleção:</dt>
        <dd>{nft.collection.name}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

function UnavailableNotice({ purchase }: { purchase: NftPurchase }) {
  return purchase.unavailableReason ? (
    <p role="status" className="text-sm text-warning">
      {purchase.unavailableReason}
    </p>
  ) : null
}

function DesktopDetails({ nft, purchase, onSelectEdition }: DetailProps) {
  return (
    <div className="flex flex-col gap-3.5 md:w-[595px]">
      <div className="flex flex-col gap-3 border-b border-border pb-3">
        <h1 className="text-[30px] leading-[37px] font-bold text-foreground">{nft.name}</h1>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-3 text-xl leading-4 font-bold text-amber">
            {formatEth(purchase.edition.price)}
            {purchase.edition.compareAtPrice ? (
              <del className="text-base font-normal text-tan">
                <span className="sr-only">Preço anterior: </span>
                {formatEth(purchase.edition.compareAtPrice)}
              </del>
            ) : null}
          </p>
          <p className="flex items-center gap-1.5 text-base text-foreground">
            <StarRating value={nft.rating.average} />
            {nft.rating.count} avaliações de colecionadores
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-sm leading-4 font-bold text-foreground">Sobre este NFT:</h2>
        <p className="text-sm leading-6 text-sand">{nft.description}</p>
      </div>
      <EditionChips editions={nft.editions} selectedId={purchase.edition.id} onSelect={onSelectEdition} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuantityStepper
          label={nft.name}
          value={purchase.quantity}
          max={Math.max(purchase.max, 1)}
          onChange={purchase.setQuantity}
          disabled={Boolean(purchase.unavailableReason)}
        />
        <div className="flex gap-2">
          <Button
            className="w-[130px]"
            onClick={() => void purchase.buyNow()}
            disabled={Boolean(purchase.unavailableReason) || purchase.pending}
            aria-disabled={Boolean(purchase.unavailableReason) || purchase.pending}
          >
            {purchase.pending ? 'ADICIONANDO…' : 'COMPRAR'}
          </Button>
          <FavoriteButton nftId={nft.id} name={nft.name} />
        </div>
      </div>
      <UnavailableNotice purchase={purchase} />
      <TokenInfo nft={nft} />
      <ShareLinks nft={nft} />
    </div>
  )
}

interface DetailProps {
  nft: NftDetailDto
  purchase: NftPurchase
  onSelectEdition: (editionId: string) => void
}

/** Mobile frame: artwork hero, rounded details sheet and the fixed buy bar. */
function MobileDetails({ nft, purchase, onSelectEdition }: DetailProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? router.history.back() : void navigate({ to: '/' }))

  return (
    <div className="md:hidden">
      <div className="relative px-7 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="grid size-[35px] place-items-center rounded-full border border-border-soft text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <FavoriteIconButton nftId={nft.id} name={nft.name} />
        </div>
        <NftImage image={nft.image} sizes="100vw" priority className="aspect-square w-full rounded-[28px]" />
      </div>
      <div className="relative -mt-8 flex flex-col gap-4 rounded-t-[32px] bg-surface px-6 pt-8 pb-48">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">{nft.name}</h1>
          <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm font-bold text-foreground">
            <span className="sr-only">Nota média</span>
            <Star aria-hidden="true" className="size-3.5 fill-primary text-primary" />
            {nft.rating.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
            <span className="font-normal text-sand">({nft.rating.count})</span>
          </p>
        </div>
        <p className="text-sm leading-6 text-sand">{nft.description}</p>
        <EditionChips editions={nft.editions} selectedId={purchase.edition.id} onSelect={onSelectEdition} />
        <UnavailableNotice purchase={purchase} />
        <TokenInfo nft={nft} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-surface-dark px-6 pt-5 pb-8 shadow-[0_-10px_30px_rgba(10,6,4,0.45)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground">Qtd.</span>
            <QuantityStepper
              size="sm"
              label={nft.name}
              value={purchase.quantity}
              max={Math.max(purchase.max, 1)}
              onChange={purchase.setQuantity}
              disabled={Boolean(purchase.unavailableReason)}
            />
          </div>
          <p className="text-xl font-bold text-amber">{formatEth(purchase.edition.price)}</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            className="h-[60px] flex-1 rounded-[30px] bg-[linear-gradient(90deg,#d28a4c,#b8763f)] text-base"
            onClick={() => void purchase.buyNow()}
            disabled={Boolean(purchase.unavailableReason) || purchase.pending}
          >
            Comprar NFT
          </Button>
          <button
            type="button"
            onClick={() => void purchase.addToCart()}
            disabled={Boolean(purchase.unavailableReason) || purchase.pending}
            aria-label="Adicionar ao carrinho"
            className="grid size-[60px] place-items-center rounded-full border border-border-soft bg-surface text-amber disabled:opacity-50"
          >
            <ShoppingCart aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function NftDetailView({
  nft,
  editionId,
  onSelectEdition,
}: {
  nft: NftDetailDto
  editionId: string | undefined
  onSelectEdition: (editionId: string) => void
}) {
  const purchase = useNftPurchase(nft, editionId)
  const props = { nft, purchase, onSelectEdition }

  return (
    <>
      <MobileDetails {...props} />
      <main className="page-container hidden flex-col gap-24 pt-8 md:flex">
        <div className="flex flex-col gap-3">
          <nav aria-label="Trilha de navegação">
            <ol className="flex gap-1 text-sm leading-4 font-bold text-foreground">
              <li>
                <Link to="/" className="hover:text-amber">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/" hash="mercado" className="hover:text-amber">
                  Mercado
                </Link>
              </li>
            </ol>
          </nav>
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <NftGallery name={nft.name} gallery={nft.gallery} />
            <DesktopDetails {...props} />
          </div>
        </div>
        <NftInfoTabs nft={nft} />
        <NftCarousel title="Mais desta coleção" params={{ collectionId: nft.collection.id, excludeId: nft.id }} />
      </main>
    </>
  )
}

/** Skeleton with the desktop geometry (gallery 573×448, details 595 wide). */
export function NftDetailSkeleton() {
  return (
    <main aria-busy="true" aria-label="Carregando NFT" className="page-container flex flex-col gap-8 pt-8">
      <div className="skeleton h-4 w-36 rounded-sm max-md:hidden" />
      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
        <div className="flex gap-7">
          <div className="hidden w-[100px] flex-col justify-between md:flex">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton size-[96px] rounded-md" />
            ))}
          </div>
          <div className="skeleton aspect-square w-full rounded-2xl md:size-[444px]" />
        </div>
        <div className="flex flex-col gap-4 md:w-[595px]">
          <div className="skeleton h-9 w-2/3 rounded-sm" />
          <div className="skeleton h-5 w-1/3 rounded-sm" />
          <div className="skeleton h-24 w-full rounded-sm" />
          <div className="skeleton h-7 w-52 rounded-full" />
          <div className="skeleton h-12 w-full rounded-md" />
          <div className="skeleton h-20 w-2/3 rounded-sm" />
        </div>
      </div>
    </main>
  )
}

import { Search } from 'lucide-react'
import { useState } from 'react'
import { type ImageDto } from '@/shared/api/dtos/common'
import { NftImage } from '@/shared/components/nft-image'
import { cn } from '@/shared/lib/cn'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'

/** "Product Images": thumbnail rail, main artwork card and zoom (lightbox). */
export function NftGallery({ name, gallery }: { name: string; gallery: readonly ImageDto[] }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = gallery[active] ?? gallery[0]
  if (!current) return null

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-7">
      <ul aria-label="Miniaturas" className="flex gap-3 md:w-[100px] md:flex-col md:justify-between">
        {gallery.map((image, index) => (
          <li key={`${image.url}-${image.alt}`}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              aria-label={`Ver imagem ${index + 1} de ${gallery.length}`}
              className={cn(
                'block overflow-hidden rounded-md border-2 border-transparent transition-colors hover:border-border-soft',
                index === active && 'border-primary hover:border-primary',
              )}
            >
              <NftImage image={image} decorative sizes="100px" className="size-16 md:size-[96px]" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative bg-surface p-5 md:size-[444px]">
        <NftImage
          image={current}
          sizes="(min-width: 768px) 404px, 100vw"
          priority
          className="aspect-square w-full rounded-2xl"
        />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={`Ampliar imagem de ${name}`}
          className="absolute top-[13px] right-[13px] grid size-[30px] place-items-center rounded-full bg-ink/90 text-foreground hover:text-amber"
        >
          <Search aria-hidden="true" className="size-[18px] stroke-[2.5]" />
        </button>
      </div>
      <Dialog open={zoomed} onOpenChange={setZoomed}>
        {/* As large as the viewport allows (square art), with a close button that stays readable
            over light artwork. */}
        <DialogContent
          className="w-[min(92vw,calc(100dvh-3rem),900px)] max-w-none border-border bg-surface p-3 sm:max-w-none"
          closeClassName="top-6 right-6 grid size-10 place-items-center rounded-full bg-ink/85 text-cream opacity-100 shadow-[0_4px_14px_rgba(10,6,4,0.5)] ring-1 ring-cream/25 transition-colors hover:bg-ink hover:text-amber data-[state=open]:bg-ink/85 data-[state=open]:text-cream [&_svg:not([class*='size-'])]:size-5"
        >
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <DialogDescription className="sr-only">{current.alt}</DialogDescription>
          <img src={current.url} alt={current.alt} width={800} height={800} className="w-full rounded-xl" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

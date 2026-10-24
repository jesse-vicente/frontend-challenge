import { Link } from '@tanstack/react-router'
import { type CSSProperties, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import arrowRightAccent from '@/assets/icons/arrow-right-accent.svg'
import mobileHeroMask from '@/assets/mobile/hero-mask.svg'
import { type NftSegment } from '@/shared/api/dtos/nft'
import { NftImage } from '@/shared/components/nft-image'
import { cn } from '@/shared/lib/cn'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Button } from '@/shared/ui/button'

const art = (index: number) => ({ url: `/images/nfts/nft-0${index}.webp`, width: 800, height: 800 })

interface HeroSlide {
  eyebrow: string
  title: [string, string]
  mobileTitle: [string, string]
  text: string
  mobileText: string
  cta: string
  segment: NftSegment | undefined
  art: ReturnType<typeof art> & { alt: string }
  smallArt: ReturnType<typeof art>
}

/** The Figma hero is the first slide; the other two follow its structure for the catalog segments. */
const SLIDES: readonly HeroSlide[] = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: ['SEJA DONO DO FUTURO', 'DA ARTE DIGITAL'],
    mobileTitle: ['SEJA DONO DA', 'CULTURA DIGITAL'],
    text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    mobileText: 'Descubra NFTs selecionados de criadores do mundo todo.',
    cta: 'EXPLORAR',
    segment: undefined,
    art: { ...art(1), alt: 'Emerald Ape, macaco de óculos e jaqueta verde, obra em destaque' },
    smallArt: art(3),
  },
  {
    eyebrow: 'Lançamentos da semana',
    title: ['EDIÇÕES GÊNESIS', 'ANTES DE TODO MUNDO'],
    mobileTitle: ['EDIÇÕES GÊNESIS', 'DA SEMANA'],
    text: 'Garanta edições limitadas direto dos criadores, com procedência registrada na rede desde a primeira cunhagem.',
    mobileText: 'Edições limitadas direto dos criadores.',
    cta: 'VER LANÇAMENTOS',
    segment: 'new',
    art: { ...art(3), alt: 'Macaco de chapéu e moletom roxo, lançamento da semana' },
    smallArt: art(4),
  },
  {
    eyebrow: 'Em alta na Kurio',
    title: ['AS COLEÇÕES QUE', 'TODOS ESTÃO DISPUTANDO'],
    mobileTitle: ['COLEÇÕES', 'EM ALTA'],
    text: 'Veja as obras mais procuradas pelos colecionadores agora e acompanhe preços e disponibilidade em tempo real.',
    mobileText: 'As obras mais procuradas agora.',
    cta: 'VER EM ALTA',
    segment: 'trending',
    art: { ...art(4), alt: 'Macaco ruivo com fones de ouvido e jaqueta clara, coleção em alta' },
    smallArt: art(2),
  },
]

/** Order of an element in the entrance cascade of the active slide (globals.css). */
const cascade = (step: number) => ({ '--i': step }) as CSSProperties

const AUTOPLAY_MS = 7000
const SWIPE_THRESHOLD = 40

function DesktopSlide({ slide, first }: { slide: HeroSlide; first: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-8 pl-10 lg:h-[450px]">
      <div className="flex max-w-[600px] flex-1 flex-col items-start gap-8">
        <div className="flex w-full flex-col gap-1">
          <div className="flex flex-col gap-2 text-foreground">
            <p className="hero-fade text-sm leading-4 font-medium tracking-[1.4px]" style={cascade(0)}>
              {slide.eyebrow}
            </p>
            <h2
              className="hero-rise text-[32px] leading-[52px] font-bold lg:text-[43px] lg:leading-[70px]"
              style={cascade(1)}
            >
              {slide.title[0]}
              <br />
              {slide.title[1]}
            </h2>
          </div>
          <p className="hero-fade max-w-[557px] text-sm leading-6 text-sand" style={cascade(2)}>
            {slide.text}
          </p>
        </div>
        <Button asChild className="hero-fade min-w-[140px] pr-9 pl-7" style={cascade(3)}>
          <Link to="/" search={slide.segment ? { segment: slide.segment } : {}} hash="market">
            {slide.cta}
          </Link>
        </Button>
      </div>
      <NftImage
        image={slide.art}
        sizes="(min-width: 1024px) 450px, 300px"
        priority={first}
        className="hero-art aspect-square w-[300px] shrink-0 rounded-[24px] lg:w-[450px]"
      />
    </div>
  )
}

function MobileSlide({ slide, first }: { slide: HeroSlide; first: boolean }) {
  return (
    <div className="relative flex w-full flex-1 items-center gap-2 overflow-hidden rounded-xl p-4 pb-8">
      <img
        src={mobileHeroMask}
        alt=""
        aria-hidden="true"
        width={366}
        height={190}
        className="absolute inset-0 size-full max-w-none"
      />
      <div className="relative flex min-w-0 flex-1 flex-col items-start">
        <div className="flex w-full flex-col gap-1.5">
          <p className="hero-fade text-xs leading-4 font-medium text-foreground" style={cascade(0)}>
            {slide.eyebrow}
          </p>
          <h2 className="hero-rise w-[190px] text-lg leading-[29px] font-bold text-foreground" style={cascade(1)}>
            {slide.mobileTitle[0]}
            <br />
            {slide.mobileTitle[1]}
          </h2>
          <p className="hero-fade text-xs leading-[18px] text-sand" style={cascade(2)}>
            {slide.mobileText}
          </p>
        </div>
        <Link
          to="/"
          search={slide.segment ? { segment: slide.segment } : {}}
          hash="market"
          className="hero-fade flex items-center gap-2 py-1"
          style={cascade(3)}
        >
          <span className="text-xs leading-[14px] font-bold text-amber">{slide.cta}</span>
          <img
            src={arrowRightAccent}
            alt=""
            aria-hidden="true"
            width={10}
            height={12}
            className="h-[10px] w-3 -rotate-90"
          />
        </Link>
      </div>
      <div className="hero-art relative grid shrink-0 place-items-start">
        <NftImage
          image={slide.art}
          decorative
          sizes="138px"
          priority={first}
          className="col-1 row-1 size-[138px] rounded-2xl"
        />
        <NftImage
          image={slide.smallArt}
          decorative
          sizes="58px"
          className="col-1 row-1 mt-[88px] ml-[14px] size-[58px] rounded-2xl"
        />
      </div>
    </div>
  )
}

/**
 * Home hero as a carousel: three slides that advance every 7 s. Autoplay pauses while the mouse
 * is over it, on keyboard focus, while the tab is hidden and under reduced motion.
 */
export function HomeHero() {
  const [index, setIndex] = useState(0)
  const [interacting, setInteracting] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const pointerStart = useRef<number | null>(null)
  const swiped = useRef(false)
  const playing = !interacting && !reducedMotion

  const goTo = useCallback((next: number) => setIndex((next + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((current) => (current + 1) % SLIDES.length)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [playing])

  const onPointerDown = (event: PointerEvent) => {
    pointerStart.current = event.clientX
    swiped.current = false
  }
  const onPointerUp = (event: PointerEvent) => {
    if (pointerStart.current === null) return
    const delta = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    swiped.current = true
    goTo(index + (delta < 0 ? 1 : -1))
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover/focus only pause the autoplay; the controls are the dots.
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da Kurio"
      className="relative flex flex-col gap-4 md:gap-0"
      // Mouse only: a tap fires mouseenter too and would keep the carousel paused.
      onPointerEnter={(event) => event.pointerType === 'mouse' && setInteracting(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false)
      }}
    >
      <h1 className="sr-only">Kurio, marketplace de NFTs</h1>
      {/* pan-y: the browser keeps vertical scrolling and leaves horizontal drags to the swipe
          (otherwise it claims the gesture and cancels the pointer before pointerup). */}
      {/* biome-ignore lint/a11y: swiping is a pointer shortcut; the dots are the accessible controls. */}
      <div
        className="touch-pan-y overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointerStart.current = null
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          // A swipe that ends on the CTA must not follow the link.
          if (!swiped.current) return
          swiped.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <div
          aria-live={playing ? 'off' : 'polite'}
          className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, slideIndex) => (
            // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA carousel pattern (group + aria-roledescription="slide").
            <div
              key={slide.eyebrow}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} de ${SLIDES.length}`}
              aria-hidden={slideIndex !== index}
              inert={slideIndex !== index}
              data-active={slideIndex === index ? '' : undefined}
              // Stretched to the tallest slide: every card keeps the same size and the dots stay put.
              className="flex w-full shrink-0 flex-col"
            >
              <div className="hidden md:block">
                <DesktopSlide slide={slide} first={slideIndex === 0} />
              </div>
              <div className="flex flex-1 md:hidden">
                <MobileSlide slide={slide} first={slideIndex === 0} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <HeroControls index={index} onSelect={goTo} />
    </section>
  )
}

/** Dots of the layout (8px, 7px on mobile) inside 24px targets. */
function HeroControls({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  return (
    <div
      className={cn(
        'hero-controls flex items-center justify-center gap-1',
        // Desktop: under the copy column, as the dots of the frame; mobile: below the card.
        'max-md:relative max-md:-mt-12 md:absolute md:bottom-0 md:left-10 md:w-[600px] md:justify-end',
      )}
    >
      {SLIDES.map((slide, slideIndex) => (
        <button
          key={slide.eyebrow}
          type="button"
          onClick={() => onSelect(slideIndex)}
          aria-label={`Mostrar destaque ${slideIndex + 1} de ${SLIDES.length}: ${slide.eyebrow}`}
          aria-current={slideIndex === index ? 'true' : undefined}
          className="grid size-6 place-items-center rounded-full"
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-[7px] rounded-full bg-primary transition-all duration-300 md:h-2',
              slideIndex === index ? 'w-5 md:w-6' : 'w-[7px] opacity-45 md:w-2',
            )}
          />
        </button>
      ))}
    </div>
  )
}

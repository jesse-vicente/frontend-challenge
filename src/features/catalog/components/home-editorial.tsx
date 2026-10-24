import { Link } from '@tanstack/react-router'
import promoMask from '@/assets/home/promo-mask.svg'
import arrowRight from '@/assets/icons/arrow-right.svg'
import { NftImage } from '@/shared/components/nft-image'
import { notifyComingSoon } from '@/shared/lib/coming-soon'
import { revealDelay, useReveal } from '@/shared/lib/use-reveal'

const art = (index: number) => ({ url: `/images/nfts/nft-0${index}.webp`, width: 800, height: 800 })

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: art(1),
    segment: 'new' as const,
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: art(2),
    segment: 'trending' as const,
  },
]

const ARTICLES = [
  {
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: art(2),
  },
  {
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: art(1),
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: art(3),
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: art(4),
  },
]

/** "Promos" frame: two promo cards linking to catalog segments. */
export function HomePromos() {
  const reveal = useReveal()
  return (
    <section aria-label="Lançamentos e curadoria" className="grid gap-7 lg:grid-cols-2">
      {PROMOS.map((promo, index) => (
        <article
          key={promo.text}
          ref={reveal}
          style={revealDelay(index, 2, 140)}
          className="reveal relative flex h-[250px] overflow-hidden rounded-lg bg-surface"
        >
          <NftImage
            image={promo.image}
            decorative
            sizes="292px"
            className="absolute top-0 left-[-5px] h-[250px] w-[45%] max-w-[292px] rounded-[18px] sm:w-[292px]"
          />
          <img
            src={promoMask}
            alt=""
            aria-hidden="true"
            width={586}
            height={250}
            className="pointer-events-none absolute inset-0 size-full max-w-none"
          />
          {/* Phones: tighter type and padding so the text and the button fit the 250 px card. */}
          <div className="relative ml-auto flex w-[56%] flex-col items-end gap-2 py-5 pr-4 text-right sm:w-[298px] sm:gap-3 sm:py-9 sm:pr-6">
            <h2 className="text-[15px] leading-5 font-bold text-foreground sm:text-lg sm:leading-6">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="text-[11px] leading-4 text-sand sm:text-sm sm:leading-6">{promo.text}</p>
            <Link
              to="/"
              search={{ segment: promo.segment }}
              hash="market"
              className="mt-auto flex h-9 w-[140px] shrink-0 items-center justify-center gap-1 rounded-md bg-primary text-sm leading-5 font-medium text-ink hover:bg-amber sm:h-10"
            >
              Explorar
              <img
                src={arrowRight}
                alt=""
                aria-hidden="true"
                width={11}
                height={13}
                className="h-[11px] w-3 -rotate-90"
              />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

/** "Blog" frame: editorial content is outside the delivery scope, so links explain that. */
export function HomeJournal() {
  const reveal = useReveal()
  return (
    <section aria-labelledby="journal-title" className="flex flex-col items-center gap-10">
      <header ref={reveal} className="reveal flex w-full flex-col items-center gap-3 text-center">
        <h2 id="journal-title" className="text-[28px] font-bold text-cream">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-sand">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      {/* Phones: a swipeable row that bleeds to the screen edges (next card peeks in). */}
      <div className="flex w-[calc(100%+2rem)] snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:w-full sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {ARTICLES.map((article, index) => (
          <article
            key={article.title}
            ref={reveal}
            style={revealDelay(index, 4, 90)}
            className="reveal group relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-lg bg-surface transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(10,6,4,0.55)] has-[:focus-visible]:-translate-y-1 motion-reduce:transform-none sm:w-auto"
          >
            <div className="overflow-hidden">
              <NftImage
                image={article.image}
                decorative
                sizes="(min-width: 1024px) 268px, (min-width: 640px) 50vw, 78vw"
                className="h-[195px] w-full transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="text-[11px] leading-4 font-medium whitespace-pre-wrap text-sand sm:text-xs">
                {`${article.date}  |  ${article.reading}`}
              </p>
              <h3 className="text-base font-bold text-cream">{article.title}</h3>
              <p className="text-xs leading-4 font-medium text-sand">{article.text}</p>
              <button
                type="button"
                onClick={() => notifyComingSoon('O Diário da Cunhagem')}
                // The whole card is the click target (stretched pseudo-element over the article).
                className="flex items-start gap-1 self-start rounded-sm text-xs text-amber outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
              >
                <span className="leading-[14px] font-bold">Ler mais</span>
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
                <span className="sr-only">: {article.title}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

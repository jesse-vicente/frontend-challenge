import { Link } from '@tanstack/react-router'
import heroDots from '@/assets/home/hero-dots.svg'
import arrowRightAccent from '@/assets/icons/arrow-right-accent.svg'
import mobileHeroDots from '@/assets/mobile/hero-dots.svg'
import mobileHeroMask from '@/assets/mobile/hero-mask.svg'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/ui/button'

const HERO_ART = { url: '/images/nfts/nft-01.webp', width: 800, height: 800 }
const HERO_ART_SMALL = { url: '/images/nfts/nft-03.webp', width: 800, height: 800 }

/** Desktop "Hero" frame: 1200×450, copy on the left and the featured artwork on the right. */
function DesktopHero() {
  return (
    <section aria-labelledby="hero-title" className="hidden items-center pl-10 md:flex lg:h-[450px]">
      <div className="flex w-full items-center justify-between gap-8">
        <div className="flex max-w-[600px] flex-1 flex-col items-end gap-11">
          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex w-full flex-col gap-1">
              <div className="flex flex-col gap-2 text-foreground">
                <p className="text-sm leading-4 font-medium tracking-[1.4px]">Bem-vindo à Kurio</p>
                <h1 id="hero-title" className="text-[32px] leading-[52px] font-bold lg:text-[43px] lg:leading-[70px]">
                  SEJA DONO DO FUTURO
                  <br />
                  DA ARTE DIGITAL
                </h1>
              </div>
              <p className="max-w-[557px] text-sm leading-6 text-sand">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
                artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <Button asChild className="w-[140px] pr-9 pl-7">
              <Link to="/" hash="mercado">
                EXPLORAR
              </Link>
            </Button>
          </div>
          <img src={heroDots} alt="" aria-hidden="true" width={40} height={8} className="h-2 w-10" />
        </div>
        <NftImage
          image={{ ...HERO_ART, alt: 'Emerald Ape, macaco de óculos e jaqueta verde, obra em destaque' }}
          sizes="(min-width: 1024px) 450px, 300px"
          priority
          className="aspect-square w-[300px] shrink-0 rounded-[24px] lg:w-[450px]"
        />
      </div>
    </section>
  )
}

/** Mobile "Hero Banner" frame: 366×190 card with stacked artworks. */
function MobileHero() {
  return (
    <section
      aria-labelledby="hero-title-mobile"
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-4 md:hidden"
    >
      <img
        src={mobileHeroMask}
        alt=""
        aria-hidden="true"
        width={366}
        height={190}
        className="absolute inset-0 size-full max-w-none"
      />
      <div className="relative flex w-full flex-col items-center gap-4">
        <div className="flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <div className="flex w-full flex-col gap-1.5">
              <p className="text-xs leading-4 font-medium text-foreground">Bem-vindo à Kurio</p>
              <h1 id="hero-title-mobile" className="w-[190px] text-lg leading-[29px] font-bold text-foreground">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </h1>
              <p className="text-xs leading-[18px] text-sand">Descubra NFTs selecionados de criadores do mundo todo.</p>
            </div>
            <Link to="/" hash="mercado" className="flex items-center gap-2 py-1">
              <span className="text-xs leading-[14px] font-bold text-amber">EXPLORAR</span>
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
          <div className="relative grid shrink-0 place-items-start">
            <NftImage
              image={HERO_ART}
              decorative
              sizes="138px"
              priority
              className="col-1 row-1 size-[138px] rounded-2xl"
            />
            <NftImage
              image={HERO_ART_SMALL}
              decorative
              sizes="58px"
              className="col-1 row-1 mt-[88px] ml-[14px] size-[58px] rounded-2xl"
            />
          </div>
        </div>
        <img src={mobileHeroDots} alt="" aria-hidden="true" width={33} height={7} className="h-[7px] w-[33px]" />
      </div>
    </section>
  )
}

export function HomeHero() {
  return (
    <>
      <DesktopHero />
      <MobileHero />
    </>
  )
}

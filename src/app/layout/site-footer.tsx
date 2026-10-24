import { Link, useRouterState } from '@tanstack/react-router'
import { type FormEvent, useId } from 'react'
import facebookIcon from '@/assets/icons/social-facebook.svg'
import instagramIcon from '@/assets/icons/social-instagram.svg'
import linkedinIcon from '@/assets/icons/social-linkedin.svg'
import twitterIcon from '@/assets/icons/social-twitter.svg'
import youtubeIcon from '@/assets/icons/social-youtube.svg'
import { type NftCategory } from '@/shared/api/dtos/nft'
import { cn } from '@/shared/lib/cn'
import { notifyComingSoon } from '@/shared/lib/coming-soon'

const FEATURES = [
  {
    initial: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    initial: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    initial: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com', icon: facebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: instagramIcon },
  { label: 'X (Twitter)', href: 'https://x.com', icon: twitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: linkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', icon: youtubeIcon },
] as const

const COLLECTION_LINKS: { label: string; category: NftCategory }[] = [
  { label: 'Arte digital', category: 'digital-art' },
  { label: 'Fotografia', category: 'photography' },
  { label: 'Música', category: 'music' },
  { label: 'Arte 3D', category: '3d-art' },
  { label: 'Utilidade', category: 'utility' },
]

const linkClass = 'text-left text-foreground text-sm leading-[30px] transition-colors hover:text-amber'

function ComingSoonLink({ label }: { label: string }) {
  return (
    <button type="button" className={linkClass} onClick={() => notifyComingSoon(label)}>
      {label}
    </button>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-1 flex-col gap-2">
      <h2 className="text-lg leading-4 font-bold text-foreground">{title}</h2>
      <ul className="flex flex-col">
        {Array.isArray(children)
          ? children.map((child, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static link list
              <li key={index}>{child}</li>
            ))
          : children}
      </ul>
    </nav>
  )
}

function Newsletter() {
  const inputId = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    notifyComingSoon('A newsletter')
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 md:px-4 lg:w-[357px]">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg leading-4 font-bold text-foreground">Antecipe-se ao próximo lançamento</h2>
        <div className="flex h-10 items-center justify-between rounded-md bg-surface-dark pl-3 drop-shadow-[0_0_10px_rgba(10,6,4,0.45)]">
          <label htmlFor={inputId} className="sr-only">
            E-mail para receber novidades
          </label>
          <input
            id={inputId}
            type="email"
            placeholder="digite seu e-mail..."
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent text-sm leading-4 text-foreground outline-none placeholder:text-tan"
          />
          <button
            type="submit"
            className="flex h-10 w-[85px] items-center justify-center rounded-r-md bg-primary px-3 text-lg leading-4 font-bold text-ink hover:bg-amber"
          >
            Enviar
          </button>
        </div>
      </div>
      <p className="text-[13px] leading-[22px] text-sand">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}

/** Desktop footer component of the layout; stacks into a single column on small screens. */
export function SiteFooter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Mobile auth frames are full-screen, without footer.
  const hideOnMobile = /^\/(login|register)/.test(pathname)
  return (
    <footer className={cn('page-container mt-16 pb-28 md:mt-24 md:pb-6', hideOnMobile && 'max-md:hidden')}>
      <div className="flex flex-col gap-8 bg-surface p-6 md:p-8 lg:h-[250px] lg:flex-row lg:items-end lg:justify-between lg:gap-0">
        <div className="grid gap-8 sm:grid-cols-3 lg:contents">
          {FEATURES.map((feature, index) => (
            <div key={feature.initial} className="flex lg:contents">
              {index > 0 ? <div aria-hidden="true" className="hidden w-px self-stretch bg-primary lg:block" /> : null}
              <div className="flex flex-col gap-3 md:px-4 lg:w-[264px] lg:first:flex-1">
                <div className="grid size-[74px] place-items-center rounded-full bg-primary">
                  <span aria-hidden="true" className="text-2xl font-bold text-ink">
                    {feature.initial}
                  </span>
                </div>
                <h2 className="text-[17px] leading-4 font-bold text-foreground">{feature.title}</h2>
                <p className="text-sm leading-[22px] text-sand lg:w-[204px]">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="hidden w-px self-stretch bg-primary lg:block" />
        <Newsletter />
      </div>

      <div className="flex flex-col gap-4 bg-surface-dark p-6 text-sm leading-[22px] text-foreground md:flex-row md:items-center md:gap-8 md:p-8 lg:h-[88px] lg:gap-[92px]">
        <p className="flex-1 font-bold tracking-[1.4px]">KURIO</p>
        <p className="flex-1 lg:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="flex-1 hover:text-amber">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-amber lg:w-[228px]">
          +55 11 4002 8922
        </a>
      </div>

      <div className="flex flex-col gap-10 bg-surface p-6 md:p-8 lg:h-[236px] lg:flex-row lg:gap-[124px]">
        <div className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-3 lg:contents">
          <FooterColumn title="Meu perfil">
            <Link to="/profile" className={linkClass}>
              Meu perfil
            </Link>
            <ComingSoonLink label="Minha coleção" />
            <ComingSoonLink label="Atividade" />
            <ComingSoonLink label="Estúdio do criador" />
            <Link to="/profile" hash="favorites" className={linkClass}>
              Lista de interesse
            </Link>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <ComingSoonLink label="Central de ajuda" />
            <ComingSoonLink label="Como comprar NFTs" />
            <ComingSoonLink label="Carteira e segurança" />
            <ComingSoonLink label="Política do mercado" />
            <ComingSoonLink label="Denunciar item" />
          </FooterColumn>
          <FooterColumn title="Coleções">
            {COLLECTION_LINKS.map((link) => (
              <Link
                key={link.category}
                to="/"
                search={{ categories: [link.category] }}
                hash="market"
                className={linkClass}
              >
                {link.label}
              </Link>
            ))}
          </FooterColumn>
        </div>
        <div className="flex flex-col gap-8 lg:w-[228px]">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold text-foreground">Redes sociais</h2>
            <ul className="flex items-center gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.label} (abre em nova aba)`}
                    className="block rounded-sm"
                  >
                    <img
                      src={social.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="size-[30px] max-w-none scale-[1.066]"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold text-foreground">Carteiras compatíveis</h2>
            <p className="flex h-[26px] items-center justify-center rounded-md border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] whitespace-pre text-amber">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm leading-[30px] text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}

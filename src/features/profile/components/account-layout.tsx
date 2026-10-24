import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Download,
  Heart,
  LogOut,
  type LucideIcon,
  MapPin,
  ShoppingCart,
  SquareActivity,
  TriangleAlert,
  User,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { useLogout } from '@/features/auth/queries'
import { MobilePageHeader } from '@/shared/components/mobile-page-header'
import { cn } from '@/shared/lib/cn'
import { notifyComingSoon } from '@/shared/lib/coming-soon'

type AccountSection = 'profile' | 'wallets' | 'favorites'

const itemClass =
  'relative flex h-[45px] items-center gap-3 px-4 text-[15px] text-amber transition-colors hover:bg-surface-dark max-md:h-10 max-md:shrink-0 max-md:rounded-full max-md:border max-md:border-border max-md:px-4'
const activeClass =
  'before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:bg-primary max-md:border-primary max-md:before:hidden'

function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" strokeWidth={1.5} className="size-[18px] shrink-0" />
}

type NavItem =
  | { kind: 'link'; section: AccountSection; label: string; icon: LucideIcon }
  | { kind: 'soon'; label: string; icon: LucideIcon; feature: string }

/** Entries in the frame order; areas outside the challenge scope announce they are coming soon. */
const NAV_ITEMS: readonly NavItem[] = [
  { kind: 'link', section: 'profile', label: 'Dados do perfil', icon: User },
  { kind: 'link', section: 'wallets', label: 'Carteiras', icon: MapPin },
  { kind: 'soon', label: 'Atividade', icon: ShoppingCart, feature: 'A atividade da conta' },
  { kind: 'link', section: 'favorites', label: 'Lista de interesse', icon: Heart },
  { kind: 'soon', label: 'Ofertas', icon: SquareActivity, feature: 'A área de ofertas' },
  { kind: 'soon', label: 'Arquivos baixados', icon: Download, feature: 'A área de arquivos baixados' },
  { kind: 'soon', label: 'Suporte', icon: TriangleAlert, feature: 'O suporte' },
]

/** "Meu perfil" sidebar of the profile and wallet frames; a scrollable chip row on mobile. */
function AccountNav({ current }: { current: AccountSection }) {
  const logout = useLogout()
  const navigate = useNavigate()

  const signOut = () => {
    void navigate({ to: '/' })
    logout.mutate()
  }

  const link = (section: AccountSection, label: string, icon: LucideIcon) => {
    const props = {
      className: cn(itemClass, current === section && activeClass),
      'aria-current': current === section ? ('page' as const) : undefined,
    }
    const content = (
      <>
        <NavIcon icon={icon} />
        {label}
      </>
    )
    if (section === 'wallets') {
      return (
        <Link to="/wallets" {...props}>
          {content}
        </Link>
      )
    }
    return (
      <Link
        to="/profile"
        hash={section === 'favorites' ? 'favorites' : undefined}
        activeOptions={{ includeHash: true }}
        {...props}
      >
        {content}
      </Link>
    )
  }

  return (
    <nav
      aria-labelledby="account-nav-title"
      className="flex flex-col bg-surface py-4 max-md:-mx-4 max-md:bg-transparent max-md:py-0 md:w-[310px] md:shrink-0 md:self-start"
    >
      <h2 id="account-nav-title" className="mb-1 px-2.5 text-lg font-bold text-foreground max-md:sr-only">
        Meu perfil
      </h2>
      <ul className="flex flex-col max-md:flex-row max-md:gap-2 max-md:overflow-x-auto max-md:px-4 max-md:pb-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.label} className="max-md:shrink-0">
            {item.kind === 'link' ? (
              link(item.section, item.label, item.icon)
            ) : (
              <button
                type="button"
                onClick={() => notifyComingSoon(item.feature)}
                className={cn(itemClass, 'w-full text-left')}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </button>
            )}
          </li>
        ))}
        <li className="border-t border-border max-md:shrink-0 max-md:border-0 md:mt-1">
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className={cn(itemClass, 'w-full text-left font-bold')}
          >
            <NavIcon icon={LogOut} />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}

/** Shell of the account pages: sidebar on the left, section content on the right. */
export function AccountLayout({
  current,
  title,
  children,
}: {
  current: AccountSection
  title: string
  children: ReactNode
}) {
  return (
    <main className="page-container pt-6 pb-16 md:border-t md:border-border md:pt-8">
      <MobilePageHeader title={title} />
      <div className="flex flex-col gap-6 max-md:mt-4 md:flex-row md:gap-7">
        <AccountNav current={current} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  )
}

/** Active sidebar entry of /profile: "Lista de interesse" is the #favorites section. */
export function useProfileSection(): AccountSection {
  return useLocation({ select: (location) => (location.hash === 'favorites' ? 'favorites' : 'profile') })
}

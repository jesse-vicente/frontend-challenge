import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import cartIcon from '@/assets/icons/cart.svg'
import cartBadge from '@/assets/icons/cart-badge.svg'
import headerDivider from '@/assets/icons/header-divider.svg'
import loginIcon from '@/assets/icons/login.svg'
import navUnderline from '@/assets/icons/nav-underline.svg'
import searchIcon from '@/assets/icons/search.svg'
import { useOpenAuth, withAuthModal } from '@/features/auth/auth-modal'
import { useLogout } from '@/features/auth/queries'
import { cartItemCount, cartQuery } from '@/features/cart/queries'
import { cn } from '@/shared/lib/cn'
import { notifyComingSoon } from '@/shared/lib/coming-soon'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { SearchDialog } from './search-dialog'
import { type Section, useScrolled, useSection } from './use-section'

const navItemClass = 'font-normal text-base text-foreground leading-[normal] transition-colors hover:text-amber'

function NavItem({ children }: { children: ReactNode }) {
  return (
    <div data-nav-item className="flex pb-[21px]">
      {children}
    </div>
  )
}

/** One underline for the whole menu: it slides to the item of the current section. */
function NavUnderline({ navRef, activeIndex }: { navRef: React.RefObject<HTMLElement | null>; activeIndex: number }) {
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = () => {
      const item = nav.querySelectorAll<HTMLElement>('[data-nav-item]')[activeIndex]
      setBox(item ? { left: item.offsetLeft, width: item.offsetWidth } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [navRef, activeIndex])

  if (!box) return null
  return (
    <img
      src={navUnderline}
      alt=""
      aria-hidden="true"
      height={3}
      className="absolute bottom-0 h-[3px] transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
      style={{ left: box.left, width: box.width }}
    />
  )
}

function CartLink() {
  const owner = useCacheOwner()
  const { data: cart } = useQuery(cartQuery(owner))
  const count = cartItemCount(cart)
  return (
    <Link
      to="/cart"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
      className="relative inline-grid size-6 place-items-start rounded-sm"
    >
      <img src={cartIcon} alt="" width={24} height={24} className="col-1 row-1 size-6" />
      {count > 0 ? (
        <span aria-hidden="true" className="col-1 row-1 ml-[15px] grid size-4 place-items-center">
          <img src={cartBadge} alt="" width={20} height={20} className="col-1 row-1 size-5 max-w-none" />
          <span className="col-1 row-1 text-[10px] leading-none font-medium text-ink">{count > 9 ? '9+' : count}</span>
        </span>
      ) : null}
    </Link>
  )
}

function AccountButton() {
  const user = useSessionUser()
  const logout = useLogout()
  const openAuth = useOpenAuth()
  const href = useRouterState({ select: (state) => state.location.href })

  if (!user) {
    // A real link (the modal lives in the URL), opened over the current page.
    return (
      <Button asChild size="sm" className="w-[100px] gap-1 font-medium">
        <a
          href={withAuthModal(href, 'login')}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            openAuth('login')
          }}
        >
          <img src={loginIcon} alt="" width={18} height={17} className="size-5 p-[2px]" />
          Entrar
        </a>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="max-w-[180px] font-medium" aria-label={`Conta de ${user.displayName}`}>
          <span className="truncate">{user.displayName.split(' ')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 border-border bg-surface text-foreground">
        <DropdownMenuLabel className="truncate text-sand">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem asChild>
          <Link to="/profile">Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onSelect={() => logout.mutate()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Desktop/tablet header ("Header With Divider" / "Header Row" components). It sticks to the top
 * and gets a glass background once the page scrolls; its size never changes.
 */
export function SiteHeader() {
  const { route, current } = useSection()
  const scrolled = useScrolled()
  const [searchOpen, setSearchOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const activeIndex = (['home', 'market'] satisfies Section[]).indexOf(current)

  return (
    <header
      className={cn(
        'sticky top-0 z-40 hidden transition-[background-color,box-shadow,backdrop-filter] duration-300 md:block',
        scrolled && 'bg-ink/70 shadow-[0_10px_30px_rgba(10,6,4,0.45)] backdrop-blur-md backdrop-saturate-150',
      )}
    >
      <div className="page-container pt-6">
        <div className="flex items-start justify-between gap-6">
          <Link to="/" aria-label="Kurio, página inicial" className="h-[34px] shrink-0 pt-2 lg:w-[160px]">
            <span className="text-sm font-bold tracking-[1.4px] text-foreground">KURIO</span>
          </Link>

          <nav ref={navRef} aria-label="Principal" className="relative hidden items-start gap-6 md:flex lg:gap-10">
            <NavItem>
              <Link
                to="/"
                aria-current={current === 'home' ? 'page' : undefined}
                className={cn(navItemClass, current === 'home' && 'font-bold text-amber')}
              >
                Início
              </Link>
            </NavItem>
            <NavItem>
              <Link
                to="/"
                hash="market"
                aria-current={current === 'market' ? 'page' : undefined}
                className={cn(navItemClass, current === 'market' && 'font-bold text-amber')}
              >
                Mercado
              </Link>
            </NavItem>
            {['Criadores', 'Aprenda'].map((label) => (
              <NavItem key={label}>
                <button type="button" className={navItemClass} onClick={() => notifyComingSoon(label)}>
                  {label}
                </button>
              </NavItem>
            ))}
            <NavUnderline navRef={navRef} activeIndex={activeIndex} />
          </nav>

          <div className="flex items-center gap-7">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar NFTs"
              className="grid size-6 place-items-center rounded-sm"
            >
              <img src={searchIcon} alt="" width={20} height={20} className="size-5" />
            </button>
            <CartLink />
            <AccountButton />
          </div>
        </div>
        {route === 'home' ? (
          <img src={headerDivider} alt="" aria-hidden="true" height={1} className="h-px w-full" />
        ) : null}
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

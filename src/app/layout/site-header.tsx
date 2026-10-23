import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import cartIcon from '@/assets/icons/cart.svg'
import cartBadge from '@/assets/icons/cart-badge.svg'
import headerDivider from '@/assets/icons/header-divider.svg'
import loginIcon from '@/assets/icons/login.svg'
import navUnderline from '@/assets/icons/nav-underline.svg'
import searchIcon from '@/assets/icons/search.svg'
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
import { type Section, useSection } from './use-section'

const navItemClass = 'font-normal text-base text-foreground leading-[normal] transition-colors hover:text-amber'

function NavItem({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-6">
      {children}
      <img
        src={navUnderline}
        alt=""
        aria-hidden="true"
        height={3}
        className={cn('-mt-[3px] h-[3px] w-full', !active && 'invisible')}
      />
    </div>
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

  if (!user) {
    return (
      <Button asChild size="sm" className="w-[100px] gap-1 font-medium">
        <Link to="/login">
          <img src={loginIcon} alt="" width={18} height={17} className="size-5 p-[2px]" />
          Entrar
        </Link>
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

/** Desktop/tablet header ("Header With Divider" / "Header Row" components). */
export function SiteHeader() {
  const section: Section = useSection()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="page-container hidden pt-6 md:block">
      <div className="flex items-start justify-between gap-6">
        <Link to="/" aria-label="Kurio, página inicial" className="h-[34px] shrink-0 pt-2 lg:w-[160px]">
          <span className="text-sm font-bold tracking-[1.4px] text-foreground">KURIO</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-start gap-6 md:flex lg:gap-10">
          <NavItem active={section === 'home'}>
            <Link
              to="/"
              aria-current={section === 'home' ? 'page' : undefined}
              className={cn(navItemClass, section === 'home' && 'font-bold text-amber')}
            >
              Início
            </Link>
          </NavItem>
          <NavItem active={section === 'market'}>
            <Link
              to="/"
              hash="mercado"
              aria-current={section === 'market' ? 'page' : undefined}
              className={cn(navItemClass, section === 'market' && 'font-bold text-amber')}
            >
              Mercado
            </Link>
          </NavItem>
          {['Criadores', 'Aprenda'].map((label) => (
            <NavItem key={label} active={false}>
              <button type="button" className={navItemClass} onClick={() => notifyComingSoon(label)}>
                {label}
              </button>
            </NavItem>
          ))}
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
      {section === 'home' ? (
        <img src={headerDivider} alt="" aria-hidden="true" height={1} className="h-px w-full" />
      ) : null}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

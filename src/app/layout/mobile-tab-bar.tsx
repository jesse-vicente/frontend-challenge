import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import scanIcon from '@/assets/icons/scan.svg'
import heartIcon from '@/assets/icons/tab-heart.svg'
import homeIcon from '@/assets/icons/tab-home.svg'
import shopIcon from '@/assets/icons/tab-shop.svg'
import userIcon from '@/assets/icons/tab-user.svg'
import tabBarBackground from '@/assets/mobile/tabbar-bg.svg'
import tabBarFab from '@/assets/mobile/tabbar-fab.svg'
import { cartItemCount, cartQuery } from '@/features/cart/queries'
import { MaskIcon } from '@/shared/components/mask-icon'
import { cn } from '@/shared/lib/cn'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { useSessionUser } from '@/shared/session/session-store'
import { SearchDialog } from './search-dialog'

const tabClass =
  'grid size-11 place-items-center rounded-md text-sand transition-colors hover:text-amber aria-[current=page]:text-amber'

/** Bottom navigation of the mobile frames ("Tab Bar"), with the scan button opening search. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const user = useSessionUser()
  const owner = useCacheOwner()
  const { data: cart } = useQuery(cartQuery(owner))
  const count = cartItemCount(cart)
  const [searchOpen, setSearchOpen] = useState(false)
  const current = (path: string) => (pathname === path ? 'page' : undefined)

  // Detail pages show their own buy bar in place of the tab bar (mobile frame).
  if (pathname.startsWith('/nfts/')) return null

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 h-[126px] md:hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-[24.6%_0_0.04%_0]">
        <div className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%]">
          <img src={tabBarBackground} alt="" width={474} height={155} className="block size-full max-w-none" />
        </div>
      </div>

      <button
        type="button"
        aria-label="Buscar NFTs"
        onClick={() => setSearchOpen(true)}
        className="absolute top-0 left-[calc(50%-32.5px)] grid size-[65px] place-items-center rounded-full"
      >
        <img src={tabBarFab} alt="" width={65} height={65} className="absolute inset-0 size-full" />
        <img src={scanIcon} alt="" width={27} height={24} className="relative h-6 w-[27px]" />
      </button>

      <ul className="absolute inset-x-0 top-[59px] flex items-center justify-between px-6">
        <li>
          <Link to="/" aria-label="Início" aria-current={current('/')} className={tabClass}>
            <MaskIcon src={homeIcon} className="h-[16.7px] w-[15.8px]" />
          </Link>
        </li>
        <li className="mr-auto ml-7">
          <Link to="/profile" hash="favoritos" aria-label="Favoritos" className={tabClass}>
            <MaskIcon src={heartIcon} className="h-[17.8px] w-5" />
          </Link>
        </li>
        <li className="mr-7 ml-auto">
          <Link
            to="/cart"
            aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'}
            aria-current={current('/cart')}
            className={cn(tabClass, 'relative')}
          >
            <MaskIcon src={shopIcon} className="size-5" />
            {count > 0 ? (
              <span
                aria-hidden="true"
                className="absolute top-1 right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-ink"
              >
                {count > 9 ? '9+' : count}
              </span>
            ) : null}
          </Link>
        </li>
        <li>
          <Link
            to={user ? '/profile' : '/login'}
            aria-label={user ? 'Meu perfil' : 'Entrar'}
            aria-current={current('/profile')}
            className={tabClass}
          >
            <MaskIcon src={userIcon} className="size-5" />
          </Link>
        </li>
      </ul>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  )
}

import { Heart } from 'lucide-react'
import { useOpenAuth } from '@/features/auth/auth-modal'
import { useFavorites, useToggleFavorite } from '@/features/favorites/queries'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

/** Favorites require a session: guests sign in over this page and stay on it. */
function useFavoriteToggle(nftId: string, name: string) {
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const openAuth = useOpenAuth()
  const active = favorites.ids.has(nftId)

  const onToggle = () => {
    if (!favorites.enabled) {
      openAuth('login')
      return
    }
    toggle.mutate({ nftId, favorite: !active, name })
  }
  return { active, onToggle }
}

export function FavoriteButton({ nftId, name }: { nftId: string; name: string }) {
  const { active, onToggle } = useFavoriteToggle(nftId, name)
  return (
    <Button variant="outline" className="h-10 min-w-[130px] gap-2 px-4" aria-pressed={active} onClick={onToggle}>
      <Heart aria-hidden="true" className={cn('size-5', active && 'fill-primary')} />
      {active ? 'Favoritado' : 'Favoritar'}
    </Button>
  )
}

/**
 * Round heart of the mobile hero and of the catalog cards. `revealOnHover`: on devices with a
 * mouse it shows on hover or keyboard focus, and stays visible once the NFT is a favorite.
 */
export function FavoriteIconButton({
  nftId,
  name,
  revealOnHover = false,
  className,
}: {
  nftId: string
  name: string
  revealOnHover?: boolean
  className?: string
}) {
  const { active, onToggle } = useFavoriteToggle(nftId, name)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      onClick={onToggle}
      className={cn(
        'grid size-[35px] place-items-center rounded-full border border-border-soft bg-ink/80 text-amber transition-[opacity,background-color] duration-200 will-change-[opacity] hover:bg-ink',
        revealOnHover &&
          !active &&
          '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100',
        className,
      )}
    >
      <Heart aria-hidden="true" className={cn('size-[18px]', active && 'fill-primary')} />
    </button>
  )
}

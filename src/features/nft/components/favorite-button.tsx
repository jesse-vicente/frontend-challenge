import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useFavorites, useToggleFavorite } from '@/features/favorites/queries'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

/** Favorites require a session: guests are sent to login and brought back here. */
function useFavoriteToggle(nftId: string, name: string) {
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const active = favorites.ids.has(nftId)

  const onToggle = () => {
    if (!favorites.enabled) {
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate({ nftId, favorite: !active, name })
  }
  return { active, onToggle }
}

export function FavoriteButton({ nftId, name }: { nftId: string; name: string }) {
  const { active, onToggle } = useFavoriteToggle(nftId, name)
  return (
    <Button variant="outline" className="h-10 w-[130px] gap-2 px-3" aria-pressed={active} onClick={onToggle}>
      <Heart aria-hidden="true" className={cn('size-5', active && 'fill-primary')} />
      {active ? 'Favoritado' : 'Favoritar'}
    </Button>
  )
}

/** Round heart of the mobile hero. */
export function FavoriteIconButton({ nftId, name }: { nftId: string; name: string }) {
  const { active, onToggle } = useFavoriteToggle(nftId, name)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      onClick={onToggle}
      className="grid size-[35px] place-items-center rounded-full border border-border-soft bg-ink/80 text-amber"
    >
      <Heart aria-hidden="true" className={cn('size-[18px]', active && 'fill-primary')} />
    </button>
  )
}

import { X } from 'lucide-react'
import { formatEth } from '@/shared/lib/format'
import { type PriceChangeNotice, realtimeStore, useRealtimeState } from '@/shared/realtime/realtime-store'

function describeNotice(notice: PriceChangeNotice): string {
  if (notice.available === 0) return `${notice.name} esgotou.`
  const parts: string[] = []
  if (notice.previousPrice !== null) {
    parts.push(`preço de ${formatEth(notice.previousPrice)} para ${formatEth(notice.price)}`)
  }
  if (notice.previousAvailable !== null) {
    parts.push(`disponibilidade de ${notice.previousAvailable} para ${notice.available}`)
  }
  return `${notice.name}: ${parts.join(' e ')}.`
}

/** Banner for price/stock changes received over Socket.IO while the cart is open. */
export function CartNotices() {
  const { cartNotices } = useRealtimeState()
  if (cartNotices.length === 0) return null

  return (
    <section
      aria-label="Alterações nos itens do carrinho"
      className="flex items-start justify-between gap-4 rounded-lg border border-warning/60 bg-surface-dark px-4 py-3"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-warning">Itens do seu carrinho foram atualizados</p>
        <ul className="flex flex-col gap-0.5 text-sm text-sand">
          {cartNotices.map((notice) => (
            <li key={`${notice.nftId}:${notice.editionId}`}>{describeNotice(notice)}</li>
          ))}
        </ul>
        <p className="text-xs text-sand">O resumo já reflete os novos valores.</p>
      </div>
      <button
        type="button"
        onClick={() => realtimeStore.dismissCartNotices()}
        aria-label="Dispensar avisos"
        className="grid size-7 shrink-0 place-items-center rounded-md text-sand hover:text-amber"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  )
}

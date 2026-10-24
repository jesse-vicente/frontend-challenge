import { useSyncExternalStore } from 'react'
import { createEventGuard } from '@/domain/events'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

export interface PriceChangeNotice {
  nftId: string
  editionId: string
  name: string
  previousPrice: string | null
  price: string
  previousAvailable: number | null
  available: number
  at: string
}

interface RealtimeState {
  status: ConnectionStatus
  /** Changes to items in the cart received while the user browses. */
  cartNotices: PriceChangeNotice[]
}

let state: RealtimeState = { status: 'idle', cartNotices: [] }
const listeners = new Set<() => void>()

function setState(next: Partial<RealtimeState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

/** Shared by the socket handlers and REST query functions (via `observe`). */
export const eventGuard = createEventGuard()

export const realtimeStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setStatus(status: ConnectionStatus) {
    if (state.status !== status) setState({ status })
  },
  pushCartNotices(notices: PriceChangeNotice[]) {
    if (notices.length === 0) return
    const keys = new Set(notices.map((notice) => `${notice.nftId}:${notice.editionId}`))
    setState({
      cartNotices: [
        ...state.cartNotices.filter((notice) => !keys.has(`${notice.nftId}:${notice.editionId}`)),
        ...notices,
      ],
    })
  },
  dismissCartNotices() {
    if (state.cartNotices.length > 0) setState({ cartNotices: [] })
  },
  reset() {
    eventGuard.reset()
    setState({ status: 'idle', cartNotices: [] })
  },
}

export function useRealtimeState(): RealtimeState {
  return useSyncExternalStore(realtimeStore.subscribe, realtimeStore.getState, realtimeStore.getState)
}

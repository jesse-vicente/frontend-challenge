import { type QueryClient } from '@tanstack/react-query'
// biome-ignore lint/style/useImportType: `import { type … }` keeps a side-effect import under verbatimModuleSyntax, which would evaluate engine.io before the mocks patch WebSocket.
import type { io as connect, Socket } from 'socket.io-client'
import { backendReady } from '../api/backend-ready'
import { nftUpdatedEventSchema, orderUpdatedEventSchema, REALTIME_EVENTS } from '../api/dtos/events'
import { sessionStore } from '../session/session-store'
import { applyNftUpdated, applyOrderUpdated } from './cache-sync'
import { eventGuard, realtimeStore } from './realtime-store'

// Read on connect: the module is also evaluated outside the browser (build-time prerender).
const socketUrl = () => import.meta.env.VITE_SOCKET_URL || window.location.origin

/**
 * Owns the Socket.IO connection for the current session.
 * socket.io-client is loaded only once the backend is ready: engine.io captures the
 * WebSocket constructor when evaluated, and the mocks must have patched it by then.
 * A new session (login, logout, user switch) tears the socket down and opens a
 * new one, so listeners and events of a previous user never leak into the next.
 */
export function startRealtime(queryClient: QueryClient): () => void {
  let socket: Socket | null = null
  let io: typeof connect | null = null
  let stopped = false

  const open = () => {
    if (!io || stopped) return
    const token = sessionStore.getToken()
    const userId = sessionStore.getUser()?.id ?? null
    let disconnected = false

    const next = io(socketUrl(), {
      transports: ['websocket'],
      // Each session gets its own Manager: no multiplexing across users.
      forceNew: true,
      auth: token ? { token } : {},
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socket = next
    realtimeStore.setStatus('connecting')

    next.on('connect', () => {
      realtimeStore.setStatus('connected')
      // Events may have been missed while offline: reconcile active data with REST.
      if (disconnected) void queryClient.invalidateQueries({ type: 'active' })
      disconnected = false
    })
    next.on('disconnect', () => {
      disconnected = true
      realtimeStore.setStatus('reconnecting')
    })

    next.on(REALTIME_EVENTS.nftUpdated, (payload: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success || eventGuard.inspect(parsed.data) !== 'apply') return
      applyNftUpdated(queryClient, parsed.data)
    })

    next.on(REALTIME_EVENTS.orderUpdated, (payload: unknown) => {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return
      // Private events must belong to the user this socket was opened for.
      if (parsed.data.userId !== userId || sessionStore.getUser()?.id !== userId) return
      if (eventGuard.inspect(parsed.data) !== 'apply') return
      applyOrderUpdated(queryClient, parsed.data)
    })
  }

  const close = () => {
    socket?.removeAllListeners()
    socket?.disconnect()
    socket = null
  }

  void backendReady()
    .then(() => import('socket.io-client'))
    .then((client) => {
      io = client.io
      open()
    })
  const unsubscribe = sessionStore.subscribe((nextState, previous) => {
    if (nextState.session?.token === previous.session?.token) return
    close()
    realtimeStore.reset()
    open()
  })

  return () => {
    stopped = true
    unsubscribe()
    close()
    realtimeStore.reset()
  }
}

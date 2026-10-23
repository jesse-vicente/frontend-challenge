import { type QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { nftUpdatedEventSchema, orderUpdatedEventSchema, REALTIME_EVENTS } from '../api/dtos/events'
import { sessionStore } from '../session/session-store'
import { applyNftUpdated, applyOrderUpdated } from './cache-sync'
import { eventGuard, realtimeStore } from './realtime-store'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

/**
 * Owns the Socket.IO connection for the current session.
 * A new session (login, logout, user switch) tears the socket down and opens a
 * new one, so listeners and events of a previous user never leak into the next.
 */
export function startRealtime(queryClient: QueryClient): () => void {
  let socket: Socket | null = null

  const open = () => {
    const token = sessionStore.getToken()
    const userId = sessionStore.getUser()?.id ?? null
    let disconnected = false

    const next = io(SOCKET_URL, {
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

  open()
  const unsubscribe = sessionStore.subscribe((nextState, previous) => {
    if (nextState.session?.token === previous.session?.token) return
    close()
    realtimeStore.reset()
    open()
  })

  return () => {
    unsubscribe()
    close()
    realtimeStore.reset()
  }
}

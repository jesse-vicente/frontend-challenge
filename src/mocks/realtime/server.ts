import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { closeAllConnections, registerConnection, type SocketConnection, unregisterConnection } from './publisher'

/** Engine.IO expects a server ping within pingInterval + pingTimeout (25 s + 5 s). */
const HEARTBEAT_MS = 20_000

let offline = false
let connectionSeq = 0
let resolveUserId: (token: string) => string | null = () => null

export function setTokenResolver(resolver: typeof resolveUserId): void {
  resolveUserId = resolver
}

/** Simulates the realtime server going down: drops sockets and refuses reconnections. */
export function setRealtimeOffline(value: boolean): void {
  offline = value
  if (value) closeAllConnections()
}

export function isRealtimeOffline(): boolean {
  return offline
}

/**
 * MSW strips the default "/socket.io/" path before matching, so the link is the
 * server origin itself.
 */
function socketUrlPattern(): string {
  return (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/^http/, 'ws')
}

/** Reads the token from the Socket.IO CONNECT packet ("40{...auth}"). */
function tokenFromConnectPacket(data: unknown): string | null {
  if (typeof data !== 'string' || !data.startsWith('40')) return null
  try {
    const auth = JSON.parse(data.slice(2)) as { token?: unknown }
    return typeof auth.token === 'string' ? auth.token : null
  } catch {
    return null
  }
}

export function createSocketHandler() {
  const link = ws.link(socketUrlPattern())

  return link.addEventListener('connection', (connection) => {
    if (offline) {
      connection.client.close()
      return
    }

    const io = toSocketIo(connection)
    connectionSeq += 1
    const socket: SocketConnection = {
      id: `socket_${connectionSeq}`,
      token: null,
      userId: null,
      emit: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(),
      isOpen: () => {
        const raw = (connection.client as { socket?: WebSocket }).socket
        return raw === undefined || raw.readyState <= WebSocket.OPEN
      },
    }
    registerConnection(socket)

    connection.client.addEventListener('message', (event) => {
      const token = tokenFromConnectPacket(event.data)
      if (token === null) return
      socket.token = token
      socket.userId = resolveUserId(token)
    })

    const heartbeat = setInterval(() => connection.client.send('2'), HEARTBEAT_MS)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      unregisterConnection(socket.id)
    })
  })
}

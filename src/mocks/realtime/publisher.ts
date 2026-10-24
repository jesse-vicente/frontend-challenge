import { type DomainEvent } from '@/domain/events'
import { mutate } from '../db/store'

export interface SocketConnection {
  readonly id: string
  /** Session token sent in the Socket.IO handshake; null for anonymous sockets. */
  token: string | null
  userId: string | null
  emit(event: string, payload: unknown): void
  close(): void
  /** False once the client side went away (it may close without a close event). */
  isOpen(): boolean
}

const connections = new Map<string, SocketConnection>()
const HISTORY_SIZE = 100
const history: DomainEvent[] = []

/** Lets private events be dropped when the connection's session is no longer valid. */
let isSessionActive: (token: string, userId: string) => boolean = () => true

export function setSessionValidator(validator: typeof isSessionActive): void {
  isSessionActive = validator
}

export function registerConnection(connection: SocketConnection): void {
  connections.set(connection.id, connection)
}

export function unregisterConnection(id: string): void {
  connections.delete(id)
}

function pruneClosed(): void {
  for (const [id, connection] of connections) if (!connection.isOpen()) connections.delete(id)
}

export function connectionCount(): number {
  pruneClosed()
  return connections.size
}

/** Stamps a stable event id and timestamp onto the event fields. */
export function buildEvent<TEvent extends DomainEvent>(
  fields: Pick<TEvent, 'type' | 'resource' | 'version' | 'userId' | 'data'>,
): TEvent {
  const eventId = mutate((db) => {
    db.eventSeq += 1
    return `evt_${String(db.eventSeq).padStart(6, '0')}`
  })
  return { ...fields, eventId, occurredAt: new Date().toISOString() } as TEvent
}

function deliver(event: DomainEvent): number {
  pruneClosed()
  let delivered = 0
  for (const connection of connections.values()) {
    if (event.userId !== null) {
      if (connection.userId !== event.userId || !connection.token) continue
      if (!isSessionActive(connection.token, event.userId)) continue
    }
    connection.emit(event.type, event)
    delivered += 1
  }
  return delivered
}

/** Sends an event to its audience: everyone for broadcasts, the owner for private events. */
export function publish(event: DomainEvent): void {
  history.push(event)
  if (history.length > HISTORY_SIZE) history.shift()
  deliver(event)
}

export function recentEvents(): readonly DomainEvent[] {
  return history
}

/** Re-sends an already published event, exactly as it was (duplicate delivery). */
export function replay(eventId: string): boolean {
  const event = history.find((candidate) => candidate.eventId === eventId)
  if (!event) return false
  deliver(event)
  return true
}

/** Sends an arbitrary event without recording it (used to simulate stale or out-of-order delivery). */
export function deliverRaw(event: DomainEvent): number {
  return deliver(event)
}

export function closeAllConnections(): void {
  for (const connection of [...connections.values()]) connection.close()
  connections.clear()
}

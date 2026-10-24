export interface ResourceRef {
  readonly type: string
  readonly id: string
}

/** Envelope shared by every realtime event: stable identity, affected resource and version. */
export interface DomainEvent<TType extends string = string, TData = unknown> {
  readonly eventId: string
  readonly type: TType
  readonly resource: ResourceRef
  readonly version: number
  readonly occurredAt: string
  /** Owner of a private event; null for broadcast events. */
  readonly userId: string | null
  readonly data: TData
}

export function resourceKey(resource: ResourceRef): string {
  return `${resource.type}:${resource.id}`
}

export type EventVerdict = 'apply' | 'duplicate' | 'stale'

export interface EventGuard {
  /** Decides whether an event must be applied, and records it when it is. */
  inspect(event: Pick<DomainEvent, 'eventId' | 'resource' | 'version'>): EventVerdict
  /** Records a version observed through REST so older events get discarded. */
  observe(resource: ResourceRef, version: number): void
  versionOf(resource: ResourceRef): number | undefined
  reset(): void
}

export interface EventGuardOptions {
  /** How many event ids to remember for duplicate detection. */
  readonly maxRememberedIds?: number
}

export function createEventGuard({ maxRememberedIds = 500 }: EventGuardOptions = {}): EventGuard {
  // Map keeps insertion order, which gives a cheap LRU for seen ids.
  const seenIds = new Map<string, true>()
  const versions = new Map<string, number>()

  const remember = (eventId: string) => {
    seenIds.set(eventId, true)
    if (seenIds.size > maxRememberedIds) {
      const oldest = seenIds.keys().next()
      if (!oldest.done) seenIds.delete(oldest.value)
    }
  }

  return {
    inspect(event) {
      if (seenIds.has(event.eventId)) return 'duplicate'
      remember(event.eventId)

      const key = resourceKey(event.resource)
      const current = versions.get(key)
      if (current !== undefined && event.version <= current) return 'stale'
      versions.set(key, event.version)
      return 'apply'
    },
    observe(resource, version) {
      const key = resourceKey(resource)
      const current = versions.get(key)
      if (current === undefined || version > current) versions.set(key, version)
    },
    versionOf(resource) {
      return versions.get(resourceKey(resource))
    },
    reset() {
      seenIds.clear()
      versions.clear()
    },
  }
}

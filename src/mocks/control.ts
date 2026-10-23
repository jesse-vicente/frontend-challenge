import { type DomainEvent } from '@/domain/events'
import { getDb, resetDb } from './db/store'
import { closeAllConnections, connectionCount, deliverRaw, recentEvents, replay } from './realtime/publisher'
import { isRealtimeOffline, setRealtimeOffline } from './realtime/server'
import { type NetworkEffect, SCENARIOS, type ScenarioDefinition, type ScenarioName } from './scenarios/definitions'
import { addRule, clearRules, getScenario, setLatencyOverride, setScenario } from './scenarios/runtime'
import { type EditionPatch, findNft, updateNft } from './services/catalog'
import { cancelAllTimers, settleOrder } from './services/orders'
import { expireSessions } from './services/sessions'

/**
 * Control surface of the simulated backend. Used by the scenario panel and by
 * Playwright through `window.__mock`. Every action goes through the mock db and
 * the Socket.IO server, never through the app state.
 */
export interface MockControl {
  reset(scenario?: ScenarioName): Promise<void>
  setScenario(name: ScenarioName): void
  getScenario(): ScenarioDefinition
  listScenarios(): ScenarioDefinition[]
  setLatency(ms: number | null): void
  failNext(method: string, path: string, effect: NetworkEffect, times?: number): void
  clearFailures(): void
  updateNft(nftId: string, patches: EditionPatch[]): void
  replayEvent(eventId: string): boolean
  sendStaleNftEvent(nftId: string): number
  recentEvents(): readonly DomainEvent[]
  settleOrder(orderId: string, outcome?: 'confirmed' | 'declined'): void
  expireSession(userId?: string): number
  setRealtimeOffline(offline: boolean): void
  dropRealtime(): void
  status(): { scenario: ScenarioName; sockets: number; realtimeOffline: boolean; orders: number }
}

export const mockControl: MockControl = {
  async reset(scenario) {
    cancelAllTimers()
    closeAllConnections()
    setRealtimeOffline(false)
    await resetDb()
    setScenario(scenario ?? getScenario().name)
  },
  setScenario,
  getScenario,
  listScenarios: () => Object.values(SCENARIOS),
  setLatency: setLatencyOverride,
  failNext(method, path, effect, times = 1) {
    addRule({ method, path, effect, times })
  },
  clearFailures: clearRules,
  updateNft(nftId, patches) {
    updateNft(nftId, patches)
  },
  replayEvent: replay,
  sendStaleNftEvent(nftId) {
    const nft = findNft(nftId)
    if (!nft) return 0
    return deliverRaw({
      eventId: `evt_stale_${nftId}_${Date.now()}`,
      type: 'nft.updated',
      resource: { type: 'nft', id: nftId },
      version: Math.max(nft.version - 1, 0),
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      userId: null,
      data: {
        priceFrom: '999',
        available: 0,
        availability: 'sold-out',
        editions: nft.editions.map((edition) => ({ id: edition.id, price: '999', available: 0 })),
      },
    })
  },
  recentEvents,
  settleOrder(orderId, outcome) {
    settleOrder(orderId, outcome)
  },
  expireSession: expireSessions,
  setRealtimeOffline,
  dropRealtime: closeAllConnections,
  status: () => ({
    scenario: getScenario().name,
    sockets: connectionCount(),
    realtimeOffline: isRealtimeOffline(),
    orders: getDb().orders.length,
  }),
}

declare global {
  interface Window {
    __mock?: MockControl
  }
}

export function installControl(): void {
  window.__mock = mockControl
}

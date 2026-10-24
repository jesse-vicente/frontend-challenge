import { buildCoupons, buildFavorites, buildUsers, buildWallets } from '../fixtures/accounts'
import { buildCatalog } from '../fixtures/catalog'
import { type MockDb } from './types'

export const DB_SCHEMA_VERSION = 2
const STORAGE_KEY = 'nft-mock:db'

let db: MockDb | null = null

export async function createSeedDb(): Promise<MockDb> {
  return {
    schemaVersion: DB_SCHEMA_VERSION,
    seq: 0,
    eventSeq: 0,
    users: await buildUsers(),
    sessions: [],
    nfts: buildCatalog(),
    favorites: buildFavorites(),
    carts: [],
    coupons: buildCoupons(),
    quotes: [],
    wallets: buildWallets(),
    orders: [],
    idempotency: [],
  }
}

function readPersisted(): MockDb | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MockDb>
    return parsed.schemaVersion === DB_SCHEMA_VERSION ? (parsed as MockDb) : null
  } catch {
    return null
  }
}

function persist(): void {
  if (!db) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Storage full or blocked: the in-memory state keeps working for this session.
  }
}

/** Loads the persisted db (survives refresh) or seeds a fresh one. */
export async function initDb(): Promise<MockDb> {
  db = readPersisted() ?? (await createSeedDb())
  persist()
  return db
}

/** Restores the known seed scenario, discarding every change. */
export async function resetDb(): Promise<MockDb> {
  db = await createSeedDb()
  persist()
  return db
}

export function getDb(): MockDb {
  if (!db) throw new Error('Mock db not initialized: call initDb() first')
  return db
}

/** Runs a mutation and persists the result. */
export function mutate<T>(fn: (state: MockDb) => T): T {
  const result = fn(getDb())
  persist()
  return result
}

export function nextId(prefix: string): string {
  return mutate((state) => {
    state.seq += 1
    return `${prefix}_${state.seq.toString(36).padStart(4, '0')}`
  })
}

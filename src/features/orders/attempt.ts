import { z } from 'zod'
import { payloadFingerprint } from '@/domain/idempotency'
import { type CreateOrderRequest } from '@/shared/api/dtos/order'
import { readStored, removeStored, writeStored } from '@/shared/lib/storage'

const attemptSchema = z.object({ key: z.string(), fingerprint: z.string() })
const attemptKey = (userId: string) => `nft:checkout-attempt:${userId}`
const pendingKey = (userId: string) => `nft:pending-order:${userId}`

/**
 * Idempotency key of the current purchase attempt. Retrying the same payload
 * (double click, timeout, reload) reuses the key, so the API returns the same
 * order; a different payload (new quote, other wallet) starts a new attempt.
 */
export function idempotencyKeyFor(userId: string, payload: CreateOrderRequest): string {
  const fingerprint = payloadFingerprint(payload)
  const stored = readStored('session', attemptKey(userId), attemptSchema)
  if (stored?.fingerprint === fingerprint) return stored.key
  const key = crypto.randomUUID()
  writeStored('session', attemptKey(userId), { key, fingerprint })
  return key
}

export function clearAttempt(userId: string): void {
  removeStored('session', attemptKey(userId))
}

/** Order awaiting settlement: survives reloads so the user lands back on it. */
export function rememberPendingOrder(userId: string, orderId: string): void {
  writeStored('local', pendingKey(userId), orderId)
}

export function pendingOrderOf(userId: string): string | null {
  return readStored('local', pendingKey(userId), z.string())
}

export function forgetPendingOrder(userId: string): void {
  removeStored('local', pendingKey(userId))
}

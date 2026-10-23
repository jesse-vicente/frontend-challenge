import { useEffect } from 'react'
import { type UseFormWatch } from 'react-hook-form'
import { z } from 'zod'
import { readStored, removeStored, writeStored } from '@/shared/lib/storage'
import { type CheckoutFormValues } from './schema'

const draftKey = (userId: string) => `nft:checkout-draft:${userId}`
const draftSchema = z.record(z.string(), z.unknown())

/**
 * Checkout draft kept in sessionStorage per user: if the session expires in the
 * middle of checkout, the collector comes back from login to the same data.
 */
export function readCheckoutDraft(userId: string): Partial<CheckoutFormValues> | null {
  return readStored('session', draftKey(userId), draftSchema) as Partial<CheckoutFormValues> | null
}

export function clearCheckoutDraft(userId: string): void {
  removeStored('session', draftKey(userId))
}

export function usePersistCheckoutDraft(userId: string, watch: UseFormWatch<CheckoutFormValues>) {
  useEffect(() => {
    const subscription = watch((values) => writeStored('session', draftKey(userId), values))
    return () => subscription.unsubscribe()
  }, [userId, watch])
}

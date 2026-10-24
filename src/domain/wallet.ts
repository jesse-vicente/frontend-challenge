export type WalletRole = 'primary' | 'secondary'

export const WALLET_ROLES: readonly WalletRole[] = ['primary', 'secondary']

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_PATTERN.test(value)
}

export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export interface WalletSlot {
  readonly id: string
  readonly role: WalletRole
  readonly address: string
}

export type WalletConflict = 'role-taken' | 'address-taken'

/**
 * A collector keeps at most one wallet per role and never the same address twice.
 * Returns the conflict a new or edited wallet would cause, if any.
 */
export function walletConflict(
  existing: readonly WalletSlot[],
  candidate: Omit<WalletSlot, 'id'> & { readonly id?: string },
): WalletConflict | null {
  const others = existing.filter((wallet) => wallet.id !== candidate.id)
  if (others.some((wallet) => wallet.role === candidate.role)) return 'role-taken'
  if (others.some((wallet) => sameAddress(wallet.address, candidate.address))) return 'address-taken'
  return null
}

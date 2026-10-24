import { describe, expect, it } from 'vitest'
import { normalizeEmail, passwordIssues, USERNAME_PATTERN } from './account'
import { isEvmAddress, walletConflict } from './wallet'

describe('account rules', () => {
  it('validates password policy', () => {
    expect(passwordIssues('abc12345')).toEqual([])
    expect(passwordIssues('abc')).toEqual(['too-short', 'missing-number'])
    expect(passwordIssues('12345678')).toEqual(['missing-letter'])
  })

  it('normalizes emails and validates usernames', () => {
    expect(normalizeEmail('  Alice@NFT.test ')).toBe('alice@nft.test')
    expect(USERNAME_PATTERN.test('alice_01')).toBe(true)
    expect(USERNAME_PATTERN.test('A!')).toBe(false)
  })
})

describe('wallet rules', () => {
  const address = `0x${'a'.repeat(40)}`
  const other = `0x${'b'.repeat(40)}`
  const wallets = [{ id: 'w1', role: 'primary' as const, address }]

  it('validates EVM addresses', () => {
    expect(isEvmAddress(address)).toBe(true)
    expect(isEvmAddress('0x123')).toBe(false)
  })

  it('detects role and address conflicts', () => {
    expect(walletConflict(wallets, { role: 'primary', address: other })).toBe('role-taken')
    expect(walletConflict(wallets, { role: 'secondary', address: address.toUpperCase().replace('0X', '0x') })).toBe(
      'address-taken',
    )
    expect(walletConflict(wallets, { role: 'secondary', address: other })).toBeNull()
  })

  it('allows editing a wallet in place', () => {
    expect(walletConflict(wallets, { id: 'w1', role: 'primary', address: other })).toBeNull()
  })
})

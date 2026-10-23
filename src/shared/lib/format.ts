import { type EthAmount } from '@/domain/money'

// The layout writes amounts as "1.19 ETH" (dot decimal, crypto convention), not pt-BR currency.
const ethFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Formats a decimal string for display. Intl accepts numeric strings, so the
 * value never goes through a JS float.
 */
export function formatEth(value: EthAmount): string {
  return `${ethFormatter.format(value as Intl.StringNumericLiteral)} ETH`
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

export function shortenAddress(address: string, visible = 4): string {
  return address.length <= visible * 2 + 2 ? address : `${address.slice(0, visible + 2)}…${address.slice(-visible)}`
}

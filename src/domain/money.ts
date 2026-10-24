import Big from 'big.js'

/**
 * ETH amount as a decimal string (e.g. "0.125"). Amounts never travel as
 * JS numbers, so no precision is lost between API, cache and UI.
 */
export type EthAmount = string

/** ETH has 18 decimals (wei). Results are rounded to that scale. */
export const ETH_SCALE = 18

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/

// Isolated constructor: strict mode rejects numbers, so floats can't sneak in.
const Decimal = Big()
Decimal.DP = ETH_SCALE
Decimal.RM = Big.roundHalfUp
Decimal.strict = true

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value)
}

function toDecimal(value: EthAmount): Big {
  if (!isEthAmount(value)) throw new TypeError(`Invalid ETH amount: "${String(value)}"`)
  return new Decimal(value)
}

function fromDecimal(value: Big): EthAmount {
  // toFixed() never uses exponential notation and drops trailing zeros.
  return value.round(ETH_SCALE, Big.roundHalfUp).toFixed()
}

export function normalize(value: EthAmount): EthAmount {
  return fromDecimal(toDecimal(value))
}

export function add(a: EthAmount, b: EthAmount): EthAmount {
  return fromDecimal(toDecimal(a).plus(toDecimal(b)))
}

export function subtract(a: EthAmount, b: EthAmount): EthAmount {
  return fromDecimal(toDecimal(a).minus(toDecimal(b)))
}

export function multiply(amount: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity)) throw new TypeError(`Quantity must be an integer, got ${quantity}`)
  return fromDecimal(toDecimal(amount).times(new Decimal(String(quantity))))
}

/** Applies a percentage expressed as a decimal string ("10" = 10%). */
export function percentOf(amount: EthAmount, percent: string): EthAmount {
  return fromDecimal(toDecimal(amount).times(toDecimal(percent)).div(new Decimal('100')))
}

export function sum(amounts: readonly EthAmount[]): EthAmount {
  return fromDecimal(amounts.reduce((acc, value) => acc.plus(toDecimal(value)), new Decimal('0')))
}

export function compare(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  return toDecimal(a).cmp(toDecimal(b))
}

export function equals(a: EthAmount, b: EthAmount): boolean {
  return compare(a, b) === 0
}

export function min(a: EthAmount, b: EthAmount): EthAmount {
  return compare(a, b) <= 0 ? normalize(a) : normalize(b)
}

export function max(a: EthAmount, b: EthAmount): EthAmount {
  return compare(a, b) >= 0 ? normalize(a) : normalize(b)
}

export function isZero(value: EthAmount): boolean {
  return toDecimal(value).eq(new Decimal('0'))
}

export function isNegative(value: EthAmount): boolean {
  return toDecimal(value).lt(new Decimal('0'))
}

/** Rounds for display only; never feed the result back into calculations. */
export function toFixedScale(value: EthAmount, scale: number): EthAmount {
  return toDecimal(value).round(scale, Big.roundHalfUp).toFixed(scale)
}

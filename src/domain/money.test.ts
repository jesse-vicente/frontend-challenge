import { describe, expect, it } from 'vitest'
import {
  add,
  compare,
  equals,
  isEthAmount,
  isZero,
  max,
  min,
  multiply,
  normalize,
  percentOf,
  subtract,
  sum,
  toFixedScale,
} from './money'

describe('money', () => {
  it('validates decimal strings', () => {
    expect(isEthAmount('1')).toBe(true)
    expect(isEthAmount('0.000000000000000001')).toBe(true)
    expect(isEthAmount('-2.5')).toBe(true)
    expect(isEthAmount('1e3')).toBe(false)
    expect(isEthAmount('1.')).toBe(false)
    expect(isEthAmount(1)).toBe(false)
  })

  it('adds without floating point drift', () => {
    expect(add('0.1', '0.2')).toBe('0.3')
    expect(sum(['0.1', '0.1', '0.1'])).toBe('0.3')
    expect(sum([])).toBe('0')
  })

  it('keeps wei precision and never uses exponent notation', () => {
    expect(add('0.000000000000000001', '0')).toBe('0.000000000000000001')
    expect(multiply('1000000000', 1000)).toBe('1000000000000')
  })

  it('multiplies by integer quantities only', () => {
    expect(multiply('0.25', 3)).toBe('0.75')
    expect(() => multiply('0.25', 1.5)).toThrow(TypeError)
  })

  it('applies percentages', () => {
    expect(percentOf('2.5', '10')).toBe('0.25')
    expect(percentOf('1', '33.3333')).toBe('0.333333')
  })

  it('subtracts and compares', () => {
    expect(subtract('1', '0.75')).toBe('0.25')
    expect(compare('1.0', '1')).toBe(0)
    expect(compare('0.9', '1')).toBe(-1)
    expect(equals('1.50', '1.5')).toBe(true)
    expect(min('2', '1.5')).toBe('1.5')
    expect(max('2', '1.5')).toBe('2')
    expect(isZero('0.000')).toBe(true)
  })

  it('normalizes trailing zeros', () => {
    expect(normalize('01.2500')).toBe('1.25')
  })

  it('rounds for display without mutating the source', () => {
    expect(toFixedScale('1.23456', 4)).toBe('1.2346')
    expect(toFixedScale('2', 2)).toBe('2.00')
  })

  it('rejects invalid input', () => {
    expect(() => add('abc', '1')).toThrow(TypeError)
  })
})

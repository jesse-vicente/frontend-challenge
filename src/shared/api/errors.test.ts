import { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './errors'

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig

function httpError(status: number, data: unknown) {
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('toApiError', () => {
  it('maps the API error envelope', () => {
    const error = toApiError(
      httpError(422, { error: { code: 'VALIDATION_ERROR', message: 'Invalid', fields: { email: 'Taken' } } }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 422, code: 'VALIDATION_ERROR', fields: { email: 'Taken' } })
    expect(error.isTransient).toBe(false)
  })

  it('treats unknown 5xx bodies as transient', () => {
    const error = toApiError(httpError(502, '<html>'))
    expect(error.code).toBe('TRANSIENT')
    expect(error.isTransient).toBe(true)
  })

  it('distinguishes network, timeout and cancellation', () => {
    expect(toApiError(new AxiosError('down', 'ERR_NETWORK', config)).kind).toBe('network')
    expect(toApiError(new AxiosError('slow', AxiosError.ECONNABORTED, config)).kind).toBe('timeout')
    expect(toApiError(new CanceledError()).isCanceled).toBe(true)
  })

  it('flags session errors', () => {
    const error = toApiError(httpError(401, { error: { code: 'SESSION_EXPIRED', message: 'Expired' } }))
    expect(error.isSessionError).toBe(true)
  })
})

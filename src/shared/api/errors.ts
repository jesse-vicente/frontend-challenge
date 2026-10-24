import { AxiosError, isAxiosError, isCancel } from 'axios'
import { type ApiErrorCode, apiErrorBodySchema } from './dtos/error'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled' | 'invalid-response'

interface ApiErrorInit {
  kind: ApiErrorKind
  message: string
  status?: number | undefined
  code?: ApiErrorCode | undefined
  fields?: Record<string, string> | undefined
  details?: unknown
  cause?: unknown
}

/** Single error type that leaves the HTTP layer; components never see AxiosError. */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly code: ApiErrorCode | undefined
  readonly fields: Record<string, string> | undefined
  readonly details: unknown

  constructor(init: ApiErrorInit) {
    super(init.message, { cause: init.cause })
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.fields = init.fields
    this.details = init.details
  }

  /** Transient failures that are safe to retry for idempotent operations. */
  get isTransient(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') return true
    if (this.code === 'TRANSIENT') return true
    return this.kind === 'http' && this.status !== undefined && this.status >= 500
  }

  get isSessionError(): boolean {
    return this.code === 'SESSION_EXPIRED' || this.code === 'UNAUTHENTICATED'
  }

  get isCanceled(): boolean {
    return this.kind === 'canceled'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function hasErrorCode(error: unknown, code: ApiErrorCode): error is ApiError {
  return isApiError(error) && error.code === code
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error

  if (isCancel(error)) {
    return new ApiError({ kind: 'canceled', message: 'Request canceled', cause: error })
  }

  if (isAxiosError(error)) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ kind: 'timeout', message: 'Request timed out', cause: error })
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', message: 'Network unavailable', cause: error })
    }

    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fields, details } = parsed.data.error
      return new ApiError({
        kind: 'http',
        status: error.response.status,
        code,
        message,
        fields,
        details,
        cause: error,
      })
    }
    return new ApiError({
      kind: 'http',
      status: error.response.status,
      code: error.response.status >= 500 ? 'TRANSIENT' : undefined,
      message: `Unexpected response (${error.response.status})`,
      cause: error,
    })
  }

  return new ApiError({
    kind: 'network',
    message: error instanceof Error ? error.message : 'Unknown error',
    cause: error,
  })
}

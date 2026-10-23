import axios, { type AxiosRequestConfig, isAxiosError } from 'axios'
import { type z } from 'zod'
import { backendReady } from './backend-ready'
import { ApiError, toApiError } from './errors'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Bridge between the HTTP layer and the session owner (auth feature).
 * Keeps `shared` free of feature imports while letting interceptors read the
 * token and report invalid sessions.
 */
export interface AuthBridge {
  getAccessToken(): string | null
  getGuestCartId(): string | null
  onSessionInvalid(reason: 'SESSION_EXPIRED' | 'UNAUTHENTICATED'): void
}

let authBridge: AuthBridge | null = null

export function registerAuthBridge(bridge: AuthBridge): () => void {
  authBridge = bridge
  return () => {
    if (authBridge === bridge) authBridge = null
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Arrays as repeated keys: ?categories=art&categories=music
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use(async (config) => {
  await backendReady()
  const token = authBridge?.getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const guestCartId = authBridge?.getGuestCartId()
  if (guestCartId) config.headers.set('X-Cart-Id', guestCartId)
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  // Only a request that carried a token can reveal that the session died.
  const sentToken = isAxiosError(error) && Boolean(error.config?.headers.Authorization)
  if (sentToken && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHENTICATED')) {
    authBridge?.onSessionInvalid(apiError.code)
  }
  return Promise.reject(apiError)
})

/**
 * Performs a request and validates the payload against its DTO schema, so the
 * rest of the app only ever handles typed, verified data.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  config: AxiosRequestConfig,
): Promise<z.output<TSchema>> {
  let data: unknown
  try {
    const response = await http.request<unknown>(config)
    data = response.data
  } catch (error) {
    throw toApiError(error)
  }

  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    throw new ApiError({
      kind: 'invalid-response',
      message: `Invalid response for ${config.method?.toUpperCase() ?? 'GET'} ${config.url ?? ''}`,
      details: parsed.error.issues,
    })
  }
  return parsed.data
}

/** For endpoints that answer 204 No Content. */
export async function apiCommand(config: AxiosRequestConfig): Promise<void> {
  try {
    await http.request(config)
  } catch (error) {
    throw toApiError(error)
  }
}

import { delay, HttpResponse } from 'msw'
import { type z } from 'zod'
import { type ApiErrorBody, type ApiErrorCode, HTTP_STATUS_BY_CODE } from '@/shared/api/dtos/error'
import { matchEffect, nextLatency } from '../scenarios/runtime'

export const API_PREFIX = '/api'

/** Error thrown inside handlers and converted into the API error envelope. */
export class MockHttpError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly options: { fields?: Record<string, string>; details?: unknown; status?: number } = {},
  ) {
    super(message)
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  options: { fields?: Record<string, string> | undefined; details?: unknown; status?: number | undefined } = {},
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(options.fields ? { fields: options.fields } : {}),
      ...(options.details === undefined ? {} : { details: options.details }),
    },
  }
  return HttpResponse.json(body, { status: options.status ?? HTTP_STATUS_BY_CODE[code] })
}

export const notFound = (message = 'Recurso não encontrado.') => new MockHttpError('NOT_FOUND', message)

export const validationError = (fields: Record<string, string>, message = 'Verifique os campos informados.') =>
  new MockHttpError('VALIDATION_ERROR', message, { fields })

/** Validates a body against its DTO schema, mapping zod issues to field errors. */
export async function readJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw validationError({}, 'Corpo da requisição inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    throw validationError(fields)
  }
  return parsed.data
}

type RouteResolver<TParams> = (input: { request: Request; params: TParams }) => Promise<Response> | Response

/**
 * Wraps every handler: applies scenario latency and failures first, then turns
 * MockHttpError into the API error envelope.
 */
export function route<TParams>(resolver: RouteResolver<TParams>) {
  return async ({ request, params }: { request: Request; params: TParams }) => {
    const url = new URL(request.url)
    const path = url.pathname.slice(API_PREFIX.length) || '/'

    await delay(nextLatency())
    const effect = matchEffect(request.method, path)
    if (effect?.type === 'network-error') return HttpResponse.error()
    if (effect?.type === 'timeout') {
      await delay('infinite')
      return HttpResponse.error()
    }
    if (effect?.type === 'http-error') return errorResponse(effect.code, effect.message, { status: effect.status })

    try {
      return await resolver({ request, params })
    } catch (error) {
      if (error instanceof MockHttpError) return errorResponse(error.code, error.message, error.options)
      console.error('[mocks] unhandled handler error', error)
      return errorResponse('TRANSIENT', 'Erro inesperado no servidor simulado.', { status: 500 })
    }
  }
}

export const apiPath = (path: string) => `${API_PREFIX}${path}`

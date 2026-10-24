import { HttpResponse, http } from 'msw'
import { normalizeEmail, passwordIssues } from '@/domain/account'
import { loginRequestSchema, registerRequestSchema } from '@/shared/api/dtos/auth'
import { getDb, mutate, nextId } from '../db/store'
import { type UserRecord } from '../db/types'
import { apiPath, MockHttpError, readJson, route, validationError } from '../http/respond'
import { hashPassword, randomSalt } from '../lib/crypto'
import { mergeGuestCart } from '../services/carts'
import { createSession, requireAuth, revokeSession, toSessionDto } from '../services/sessions'

export const PASSWORD_ISSUE_MESSAGES = {
  'too-short': 'A senha deve ter pelo menos 8 caracteres.',
  'too-long': 'A senha deve ter no máximo 64 caracteres.',
  'missing-letter': 'A senha deve conter ao menos uma letra.',
  'missing-number': 'A senha deve conter ao menos um número.',
} as const

export const authHandlers = [
  http.post(
    apiPath('/auth/login'),
    route(async ({ request }) => {
      const body = await readJson(request, loginRequestSchema)
      const user = getDb().users.find((item) => item.email === normalizeEmail(body.email))
      const valid = user && (await hashPassword(body.password, user.passwordSalt)) === user.passwordHash
      if (!user || !valid) {
        throw new MockHttpError('UNAUTHENTICATED', 'E-mail ou senha inválidos.', {
          fields: { password: 'E-mail ou senha inválidos.' },
        })
      }
      mergeGuestCart(body.guestCartId, user.id)
      return HttpResponse.json(toSessionDto(createSession(user.id), user))
    }),
  ),

  http.post(
    apiPath('/auth/register'),
    route(async ({ request }) => {
      const body = await readJson(request, registerRequestSchema)
      const email = normalizeEmail(body.email)
      const [issue] = passwordIssues(body.password)
      if (issue) throw validationError({ password: PASSWORD_ISSUE_MESSAGES[issue] })

      const db = getDb()
      const fields: Record<string, string> = {}
      if (db.users.some((user) => user.email === email)) fields.email = 'Este e-mail já está cadastrado.'
      if (db.users.some((user) => user.username === body.username)) fields.username = 'Este nome de usuário já existe.'
      if (Object.keys(fields).length > 0) {
        throw new MockHttpError('CONFLICT', 'Já existe uma conta com esses dados.', { fields })
      }

      const salt = randomSalt()
      const now = new Date().toISOString()
      const user: UserRecord = {
        id: nextId('user'),
        email,
        username: body.username,
        displayName: body.username,
        ensName: null,
        walletNickname: 'Minha carteira',
        avatarUrl: null,
        passwordSalt: salt,
        passwordHash: await hashPassword(body.password, salt),
        createdAt: now,
        updatedAt: now,
      }
      mutate((state) => {
        state.users.push(user)
        state.favorites[user.id] = []
      })
      mergeGuestCart(body.guestCartId, user.id)
      return HttpResponse.json(toSessionDto(createSession(user.id), user), { status: 201 })
    }),
  ),

  http.get(
    apiPath('/auth/session'),
    route(({ request }) => {
      const { session, user } = requireAuth(request)
      return HttpResponse.json(toSessionDto(session, user))
    }),
  ),

  http.post(
    apiPath('/auth/logout'),
    route(({ request }) => {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (token) revokeSession(token)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]

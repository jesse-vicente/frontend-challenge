import { HttpResponse, http } from 'msw'
import { normalizeEmail, passwordIssues } from '@/domain/account'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  changePasswordRequestSchema,
  type ProfileDto,
  updateProfileRequestSchema,
} from '@/shared/api/dtos/profile'
import { getDb, mutate } from '../db/store'
import { type UserRecord } from '../db/types'
import { apiPath, MockHttpError, readJson, route, validationError } from '../http/respond'
import { hashPassword, randomSalt } from '../lib/crypto'
import { requireAuth } from '../services/sessions'
import { PASSWORD_ISSUE_MESSAGES } from './auth'

function toProfile(user: UserRecord): ProfileDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

function updateUser(userId: string, change: (user: UserRecord) => void): UserRecord {
  return mutate((db) => {
    const user = db.users.find((item) => item.id === userId)
    if (!user) throw new MockHttpError('NOT_FOUND', 'Usuário não encontrado.')
    change(user)
    user.updatedAt = new Date().toISOString()
    return user
  })
}

async function toDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${file.type};base64,${btoa(binary)}`
}

export const profileHandlers = [
  http.get(
    apiPath('/me'),
    route(({ request }) => HttpResponse.json(toProfile(requireAuth(request).user))),
  ),

  http.patch(
    apiPath('/me'),
    route(async ({ request }) => {
      const { user } = requireAuth(request)
      const body = await readJson(request, updateProfileRequestSchema)
      const email = normalizeEmail(body.email)
      const others = getDb().users.filter((item) => item.id !== user.id)
      const fields: Record<string, string> = {}
      if (others.some((item) => item.email === email)) fields.email = 'Este e-mail já está em uso.'
      if (others.some((item) => item.username === body.username)) fields.username = 'Este nome de usuário já existe.'
      if (Object.keys(fields).length > 0) throw new MockHttpError('CONFLICT', 'Dados já utilizados.', { fields })

      const updated = updateUser(user.id, (draft) => {
        draft.displayName = body.displayName
        draft.username = body.username
        draft.email = email
        draft.bio = body.bio
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.put(
    apiPath('/me/avatar'),
    route(async ({ request }) => {
      const { user } = requireAuth(request)
      const form = await request.formData().catch(() => null)
      const file = form?.get('avatar')
      if (!(file instanceof File)) throw validationError({ avatar: 'Selecione uma imagem.' })
      if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw validationError({ avatar: 'Use uma imagem PNG, JPG ou WebP.' })
      }
      if (file.size > AVATAR_MAX_BYTES) throw validationError({ avatar: 'A imagem deve ter no máximo 1 MB.' })

      const avatarUrl = await toDataUrl(file)
      const updated = updateUser(user.id, (draft) => {
        draft.avatarUrl = avatarUrl
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.delete(
    apiPath('/me/avatar'),
    route(({ request }) => {
      const { user } = requireAuth(request)
      const updated = updateUser(user.id, (draft) => {
        draft.avatarUrl = null
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.put(
    apiPath('/me/password'),
    route(async ({ request }) => {
      const { user } = requireAuth(request)
      const body = await readJson(request, changePasswordRequestSchema)
      if ((await hashPassword(body.currentPassword, user.passwordSalt)) !== user.passwordHash) {
        throw validationError({ currentPassword: 'Senha atual incorreta.' })
      }
      const [issue] = passwordIssues(body.newPassword)
      if (issue) throw validationError({ newPassword: PASSWORD_ISSUE_MESSAGES[issue] })
      if (body.newPassword === body.currentPassword) {
        throw validationError({ newPassword: 'A nova senha deve ser diferente da atual.' })
      }

      const salt = randomSalt()
      const hash = await hashPassword(body.newPassword, salt)
      updateUser(user.id, (draft) => {
        draft.passwordSalt = salt
        draft.passwordHash = hash
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]

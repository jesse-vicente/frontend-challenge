import { type Session, type SessionUser } from '@/shared/api/dtos/auth'
import { getDb, mutate } from '../db/store'
import { type SessionRecord, type UserRecord } from '../db/types'
import { MockHttpError } from '../http/respond'
import { randomToken } from '../lib/crypto'
import { behavior } from '../scenarios/runtime'

export function toSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export function toSessionDto(session: SessionRecord, user: UserRecord): Session {
  return { token: session.token, expiresAt: session.expiresAt, user: toSessionUser(user) }
}

export function createSession(userId: string): SessionRecord {
  const session: SessionRecord = {
    token: randomToken(),
    userId,
    expiresAt: new Date(Date.now() + behavior().sessionTtlMs).toISOString(),
    revoked: false,
  }
  mutate((db) => {
    // Drop dead sessions so storage does not grow forever.
    db.sessions = db.sessions.filter((item) => !item.revoked && Date.parse(item.expiresAt) > Date.now())
    db.sessions.push(session)
  })
  return session
}

export function isSessionValid(session: SessionRecord): boolean {
  return !session.revoked && Date.parse(session.expiresAt) > Date.now()
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export interface AuthContext {
  session: SessionRecord
  user: UserRecord
}

/** Resolves the caller; throws SESSION_EXPIRED for a dead token, returns null without one. */
export function optionalAuth(request: Request): AuthContext | null {
  const token = bearerToken(request)
  if (!token) return null
  const db = getDb()
  const session = db.sessions.find((item) => item.token === token)
  if (!session || !isSessionValid(session)) {
    throw new MockHttpError('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  }
  const user = db.users.find((item) => item.id === session.userId)
  if (!user) throw new MockHttpError('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  return { session, user }
}

export function requireAuth(request: Request): AuthContext {
  const auth = optionalAuth(request)
  if (!auth) throw new MockHttpError('UNAUTHENTICATED', 'Faça login para continuar.')
  return auth
}

export function revokeSession(token: string): void {
  mutate((db) => {
    const session = db.sessions.find((item) => item.token === token)
    if (session) session.revoked = true
  })
}

/** Expires every active session of a user (used by tests and the scenario panel). */
export function expireSessions(userId?: string): number {
  return mutate((db) => {
    let count = 0
    for (const session of db.sessions) {
      if ((userId === undefined || session.userId === userId) && isSessionValid(session)) {
        session.expiresAt = new Date(Date.now() - 1000).toISOString()
        count += 1
      }
    }
    return count
  })
}

export function userIdForToken(token: string): string | null {
  const session = getDb().sessions.find((item) => item.token === token)
  return session && isSessionValid(session) ? session.userId : null
}

export function isTokenActiveFor(token: string, userId: string): boolean {
  return userIdForToken(token) === userId
}

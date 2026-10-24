import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, USERNAME_PATTERN } from '@/domain/account'
import { idSchema, isoDateTimeSchema } from './common'

export const sessionUserSchema = z.object({
  id: idSchema,
  email: z.email(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

export const sessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
  user: sessionUserSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  /** Guest cart to merge into the account after authentication. */
  guestCartId: z.string().optional(),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username: z.string().regex(USERNAME_PATTERN),
  email: z.email(),
  password: z.string().max(PASSWORD_MAX_LENGTH),
  guestCartId: z.string().optional(),
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

import { z } from 'zod'
import { ENS_LABEL_PATTERN, PASSWORD_MAX_LENGTH, USERNAME_PATTERN } from '@/domain/account'
import { idSchema, isoDateTimeSchema } from './common'

/** Full ENS name, e.g. "nova.kurio.eth". */
export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value.endsWith('.eth') && ENS_LABEL_PATTERN.test(value.slice(0, -4)), {
    message: 'Invalid ENS name',
  })

export const profileSchema = z.object({
  id: idSchema,
  email: z.email(),
  username: z.string(),
  displayName: z.string(),
  ensName: z.string().nullable(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateTimeSchema,
})
export type ProfileDto = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  username: z.string().regex(USERNAME_PATTERN),
  email: z.email(),
  ensName: ensNameSchema,
  walletNickname: z.string().trim().min(2).max(32),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: z.string().max(PASSWORD_MAX_LENGTH),
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const AVATAR_MAX_BYTES = 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

import { z } from 'zod'
import { passwordIssues, splitEnsName } from '@/domain/account'
import { PASSWORD_ISSUE_MESSAGES } from '@/features/auth/schemas'
import { accountFields } from '@/features/wallets/schemas'
import { type ProfileDto, type UpdateProfileRequest } from '@/shared/api/dtos/profile'

/** "Perfil do colecionador" (profile data) form. */
export const profileFormSchema = z.object({
  displayName: accountFields.displayName,
  username: accountFields.username,
  email: accountFields.email,
  ensLabel: accountFields.ensLabel,
  ensSuffix: accountFields.ensSuffix,
  walletNickname: accountFields.walletNickname,
})
export type ProfileFormValues = z.input<typeof profileFormSchema>

export const PROFILE_FORM_FIELDS = Object.keys(profileFormSchema.shape) as (keyof ProfileFormValues)[]

export function profileFormValues(profile: ProfileDto): ProfileFormValues {
  const ens = splitEnsName(profile.ensName)
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensLabel: ens.label,
    ensSuffix: ens.suffix,
    walletNickname: profile.walletNickname,
  }
}

export function toUpdateProfileRequest(values: ProfileFormValues): UpdateProfileRequest {
  const parsed = profileFormSchema.parse(values)
  return {
    displayName: parsed.displayName,
    username: parsed.username,
    email: parsed.email,
    ensName: `${parsed.ensLabel}${parsed.ensSuffix}`,
    walletNickname: parsed.walletNickname,
  }
}

const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const

/**
 * The profile frame has a single "Salvar": the "Alterar senha" block is optional
 * and only validated once the collector starts filling it.
 */
export const profilePageSchema = profileFormSchema
  .extend({ currentPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((values, context) => {
    if (!wantsPasswordChange(values)) return
    if (!values.currentPassword) {
      context.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual.' })
    }
    const [issue] = passwordIssues(values.newPassword)
    if (issue) context.addIssue({ code: 'custom', path: ['newPassword'], message: PASSWORD_ISSUE_MESSAGES[issue] })
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não coincidem.' })
    }
  })
export type ProfilePageValues = z.input<typeof profilePageSchema>

export function wantsPasswordChange(values: Pick<ProfilePageValues, (typeof PASSWORD_FIELDS)[number]>): boolean {
  return PASSWORD_FIELDS.some((field) => values[field] !== '')
}

export const emptyPasswordFields = { currentPassword: '', newPassword: '', confirmPassword: '' }

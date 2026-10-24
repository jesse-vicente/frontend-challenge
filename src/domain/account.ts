export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64

export type PasswordIssue = 'too-short' | 'too-long' | 'missing-letter' | 'missing-number'

/** Password policy shared by the forms and the simulated API. */
export function passwordIssues(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = []
  if (password.length < PASSWORD_MIN_LENGTH) issues.push('too-short')
  if (password.length > PASSWORD_MAX_LENGTH) issues.push('too-long')
  if (!/\p{L}/u.test(password)) issues.push('missing-letter')
  if (!/\d/.test(password)) issues.push('missing-number')
  return issues
}

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Referral codes: 4–12 letters or digits. */
export const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9]{4,12}$/

/** ENS name without the suffix, e.g. "nova.kurio" for "nova.kurio.eth". */
export const ENS_LABEL_PATTERN = /^[a-z0-9-]{3,}(\.[a-z0-9-]+)*$/
export const ENS_SUFFIXES = ['.eth'] as const
export type EnsSuffix = (typeof ENS_SUFFIXES)[number]

export function splitEnsName(name: string | null): { label: string; suffix: EnsSuffix } {
  const suffix = ENS_SUFFIXES.find((candidate) => name?.endsWith(candidate)) ?? '.eth'
  return { label: name ? name.slice(0, name.length - suffix.length) : '', suffix }
}

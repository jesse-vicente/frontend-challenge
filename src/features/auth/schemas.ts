import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, type PasswordIssue, passwordIssues, USERNAME_PATTERN } from '@/domain/account'

export const PASSWORD_ISSUE_MESSAGES: Record<PasswordIssue, string> = {
  'too-short': 'A senha deve ter pelo menos 8 caracteres.',
  'too-long': `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  'missing-letter': 'A senha deve conter ao menos uma letra.',
  'missing-number': 'A senha deve conter ao menos um número.',
}

const emailField = z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.'))

/** Password policy from the domain, shared with the simulated API. */
export const newPasswordField = z.string().superRefine((value, context) => {
  const [issue] = passwordIssues(value)
  if (issue) context.addIssue({ code: 'custom', message: PASSWORD_ISSUE_MESSAGES[issue] })
})

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>

export const registerFormSchema = z
  .object({
    username: z.string().trim().regex(USERNAME_PATTERN, 'Use de 3 a 20 caracteres: letras minúsculas, números ou _.'),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
export type RegisterFormValues = z.infer<typeof registerFormSchema>

import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import facebookIcon from '@/assets/icons/brand-facebook.svg'
import googleIcon from '@/assets/icons/brand-google.svg'
import { PasswordField, TextField } from '@/shared/components/text-field'
import { cn } from '@/shared/lib/cn'
import { notifyComingSoon } from '@/shared/lib/coming-soon'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { sessionStore, useSession } from '@/shared/session/session-store'
import { Button } from '@/shared/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { useLogin, useRegister } from '../queries'
import { type LoginFormValues, loginFormSchema, type RegisterFormValues, registerFormSchema } from '../schemas'

export type AuthMode = 'login' | 'register'

interface AuthPanelProps {
  mode: AuthMode
  redirect: string | undefined
  /** Desktop modal shows the "Entrar | Criar conta" switch; mobile uses its own heading. */
  layout: 'modal' | 'page'
}

const COPY = {
  login: { subtitle: 'Entre para gerenciar sua carteira, coleção e perfil de criador.', cta: 'Entrar' },
  register: { subtitle: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.', cta: 'Criar conta' },
} as const

function FormAlert({ message }: { message: string | null }) {
  return message ? (
    <p
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null
}

function useAfterSignIn(redirect: string | undefined) {
  const navigate = useNavigate()
  return () => {
    // `redirect` is validated as an in-app path by the route search schema.
    void navigate({ to: redirect ?? '/' })
  }
}

function LoginForm({ redirect }: { redirect: string | undefined }) {
  const login = useLogin()
  const done = useAfterSignIn(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      done()
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['email', 'password']))
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <FormAlert message={formError} />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <TextField type="email" autoComplete="email" placeholder="contato@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl>
                <PasswordField autoComplete="current-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button
          type="button"
          onClick={() => notifyComingSoon('A recuperação de senha')}
          className="self-end text-[13px] text-amber hover:underline"
        >
          Esqueceu a senha?
        </button>
        <Button
          type="submit"
          className="mt-6 h-[45px] w-full max-md:h-[60px] max-md:rounded-xl"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Form>
  )
}

function RegisterForm({ redirect }: { redirect: string | undefined }) {
  const register = useRegister()
  const done = useAfterSignIn(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const submit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    setFormError(null)
    try {
      await register.mutateAsync(values)
      done()
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['username', 'email', 'password']))
    }
  })

  const fields = [
    { name: 'username', label: 'Nome de usuário', placeholder: 'Nome de usuário', autoComplete: 'username' },
    { name: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', autoComplete: 'email', type: 'email' },
  ] as const

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <FormAlert message={formError} />
        {fields.map((item) => (
          <FormField
            key={item.name}
            control={form.control}
            name={item.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">{item.label}</FormLabel>
                <FormControl>
                  <TextField
                    type={'type' in item ? item.type : 'text'}
                    autoComplete={item.autoComplete}
                    placeholder={item.placeholder}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl>
                <PasswordField autoComplete="new-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Confirmar senha</FormLabel>
              <FormControl>
                <PasswordField autoComplete="new-password" placeholder="Confirmar senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="mt-6 h-[45px] w-full max-md:h-[60px] max-md:rounded-xl"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </Form>
  )
}

function SocialSignIn() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[13px] text-foreground">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      {[
        { label: 'Google', icon: googleIcon, size: 'size-4' },
        { label: 'Facebook', icon: facebookIcon, size: 'h-4 w-2.5' },
      ].map((provider) => (
        <button
          key={provider.label}
          type="button"
          onClick={() => notifyComingSoon(`O login com ${provider.label}`)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border-soft text-xs text-sand hover:border-primary"
        >
          <img src={provider.icon} alt="" width={16} height={16} className={provider.size} />
          Continuar com {provider.label}
        </button>
      ))}
    </div>
  )
}

/** Sign-in / sign-up content of the "Sign In Modal" and the mobile auth screens. */
export function AuthPanel({ mode, redirect, layout }: AuthPanelProps) {
  const { endReason } = useSession()
  const search = redirect ? { redirect } : {}

  return (
    <div className="flex flex-col gap-6">
      {layout === 'modal' ? (
        <nav aria-label="Acesso à conta" className="flex items-center justify-center gap-2 text-base font-bold">
          <Link
            to="/login"
            search={search}
            aria-current={mode === 'login' ? 'page' : undefined}
            className={cn('px-1', mode === 'login' ? 'text-amber' : 'text-foreground hover:text-amber')}
          >
            Entrar
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-primary" />
          <Link
            to="/register"
            search={search}
            aria-current={mode === 'register' ? 'page' : undefined}
            className={cn('px-1', mode === 'register' ? 'text-amber' : 'text-foreground hover:text-amber')}
          >
            Criar conta
          </Link>
        </nav>
      ) : null}
      <p className="text-center text-[13px] leading-4 text-foreground max-md:hidden">{COPY[mode].subtitle}</p>

      {endReason === 'expired' ? (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-md border border-warning/60 px-3 py-2 text-sm text-warning"
        >
          Sua sessão expirou. Entre novamente para continuar de onde parou.
          <button type="button" className="shrink-0 underline" onClick={() => sessionStore.clearEndReason()}>
            Ok
          </button>
        </div>
      ) : null}

      {mode === 'login' ? <LoginForm redirect={redirect} /> : <RegisterForm redirect={redirect} />}
      <SocialSignIn />

      {layout === 'page' ? (
        <p className="text-center text-sm text-sand">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem conta? '}
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            search={search}
            className="text-sand underline-offset-4 hover:text-amber hover:underline"
          >
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
      ) : null}
    </div>
  )
}

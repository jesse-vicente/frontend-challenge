import { type ReactNode } from 'react'
import { isApiError } from '../api/errors'
import { cn } from '../lib/cn'
import { Button } from '../ui/button'

/** Human message for any error leaving the API layer. */
export function describeError(error: unknown): string {
  if (!isApiError(error)) return 'Algo deu errado. Tente novamente.'
  if (error.kind === 'network') return 'Sem conexão com o servidor. Verifique sua rede e tente novamente.'
  if (error.kind === 'timeout') return 'O servidor demorou para responder. Tente novamente.'
  if (error.isTransient) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  return error.message
}

interface StateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 rounded-lg bg-surface px-6 py-14 text-center', className)}>
      <p className="text-lg font-bold text-foreground">{title}</p>
      {description ? <p className="max-w-md text-sm leading-6 text-sand">{description}</p> : null}
      {action}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  retrying = false,
  title = 'Não foi possível carregar',
  className,
}: {
  error: unknown
  onRetry?: () => void
  retrying?: boolean
  title?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-4 rounded-lg border border-destructive/40 bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="max-w-md text-sm leading-6 text-sand">{describeError(error)}</p>
      {onRetry ? (
        <Button onClick={onRetry} disabled={retrying} aria-disabled={retrying}>
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </Button>
      ) : null}
    </div>
  )
}

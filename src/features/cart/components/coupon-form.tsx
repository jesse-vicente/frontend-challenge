import { type FormEvent, useId, useState } from 'react'
import { isApiError } from '@/shared/api/errors'
import { describeError } from '@/shared/components/feedback-states'
import { cn } from '@/shared/lib/cn'
import { useApplyCoupon, useRemoveCoupon } from '../queries'

/** "Código promocional" field: invalid or expired codes are reported next to the input. */
export function CouponForm({ appliedCode, rejection }: { appliedCode: string | null; rejection: string | null }) {
  const [code, setCode] = useState('')
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const inputId = useId()
  const errorId = useId()

  const error = apply.isError
    ? isApiError(apply.error) && apply.error.fields?.code
      ? apply.error.fields.code
      : describeError(apply.error)
    : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!code.trim()) return
    apply.mutate(code.trim(), { onSuccess: () => setCode('') })
  }

  if (appliedCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">Código promocional</p>
        <div className="flex items-center justify-between rounded-md border border-primary bg-surface-dark px-3 py-2">
          <span className="text-sm font-bold text-amber">
            {appliedCode} <span className="font-normal text-sand">aplicado</span>
          </span>
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="text-sm text-amber underline disabled:opacity-50"
          >
            Remover<span className="sr-only"> cupom {appliedCode}</span>
          </button>
        </div>
        {rejection ? (
          <p role="status" className="text-xs text-warning">
            O cupom não é mais válido para este carrinho e não foi aplicado aos valores.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={inputId} className="text-sm font-bold text-foreground max-md:sr-only">
        Código promocional
      </label>
      <div
        className={cn(
          'flex h-[45px] items-center rounded-md border border-primary max-md:h-[50px] max-md:rounded-full max-md:border-border-soft max-md:bg-surface-dark',
          error && 'border-destructive',
        )}
      >
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          maxLength={32}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-sand max-md:px-4 max-md:text-sm"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="h-full w-[100px] shrink-0 rounded-r-[5px] bg-primary text-sm font-bold text-ink hover:bg-amber disabled:opacity-60 max-md:rounded-full max-md:bg-[linear-gradient(90deg,#d28a4c,#a86d3b)]"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}

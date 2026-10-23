import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, forwardRef, useState } from 'react'
import { cn } from '../lib/cn'

/** Input of the Kurio forms: dark field, soft border, primary border on focus or error. */
export const textFieldClass =
  'h-10 w-full rounded-md border border-border-soft bg-ink px-4 text-foreground text-sm outline-none transition-colors placeholder:text-tan focus:border-primary aria-[invalid=true]:border-destructive max-md:h-[50px] max-md:rounded-xl'

export const TextField = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function TextField(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(textFieldClass, className)} {...props} />
})

/** Password field with the show/hide toggle of the layout. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<ComponentProps<'input'>, 'type'>>(function PasswordField(
  { className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(textFieldClass, 'pr-12', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-2 grid w-9 place-items-center rounded-md text-tan hover:text-amber"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  )
})

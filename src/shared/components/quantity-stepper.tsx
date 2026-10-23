import { Minus, Plus } from 'lucide-react'
import { cn } from '../lib/cn'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Accessible name of the item whose quantity changes. */
  label: string
  size?: 'md' | 'sm'
  disabled?: boolean
  className?: string
}

/**
 * Quantity control of the layout (orange pill buttons around the number).
 * The value is an integer clamped to [min, max]; limits are announced.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  size = 'md',
  disabled = false,
  className,
}: QuantityStepperProps) {
  const buttonClass = cn(
    'grid place-items-center rounded-full bg-primary text-ink transition-colors hover:bg-amber disabled:cursor-not-allowed disabled:opacity-40',
    size === 'md' ? 'h-[50px] w-[30px]' : 'size-[22px] md:h-7 md:w-[18px] md:rounded-md',
  )
  const iconClass = size === 'md' ? 'size-5 stroke-[2.5]' : 'size-3.5 stroke-[2.5]'

  return (
    <fieldset className={cn('m-0 flex min-w-0 items-center gap-3 border-0 p-0', className)}>
      <legend className="sr-only">Quantidade de {label}</legend>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus aria-hidden="true" className={iconClass} />
      </button>
      <output
        aria-live="polite"
        aria-label={`${value} ${value === 1 ? 'unidade' : 'unidades'}`}
        className={cn('min-w-6 text-center text-foreground', size === 'md' ? 'text-lg' : 'text-base')}
      >
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={value >= max ? `Aumentar quantidade (máximo ${max})` : 'Aumentar quantidade'}
      >
        <Plus aria-hidden="true" className={iconClass} />
      </button>
    </fieldset>
  )
}

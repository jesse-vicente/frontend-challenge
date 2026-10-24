import { Star } from 'lucide-react'
import { cn } from '../lib/cn'

/** Five-star rating in the accent color; the value is exposed as text for assistive tech. */
export function StarRating({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value)
  return (
    <span role="img" aria-label={`Nota ${value.toLocaleString('pt-BR')} de 5`} className={cn('flex gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn('size-3.5', star <= rounded ? 'fill-primary text-primary' : 'fill-sand/60 text-sand/60')}
        />
      ))}
    </span>
  )
}

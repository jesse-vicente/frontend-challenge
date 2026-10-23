import { useId } from 'react'
import { isPurchasable } from '@/domain/nft'
import { type EditionDto } from '@/shared/api/dtos/nft'
import { cn } from '@/shared/lib/cn'

/** "Edição" chips; sold-out editions stay visible but cannot be chosen. */
export function EditionChips({
  editions,
  selectedId,
  onSelect,
}: {
  editions: readonly EditionDto[]
  selectedId: string
  onSelect: (editionId: string) => void
}) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-3">
      <p id={labelId} className="text-sm leading-4 font-bold text-foreground">
        Edição:
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {editions.map((edition) => {
          const selected = edition.id === selectedId
          const available = isPurchasable(edition)
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled chip acting as a radio option
            <button
              key={edition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!available}
              onClick={() => available && onSelect(edition.id)}
              title={available ? `${edition.available} disponíveis` : 'Edição esgotada'}
              className={cn(
                'h-7 rounded-full border border-border-soft px-1.5 text-sm leading-4 text-sand transition-colors hover:border-primary',
                selected && 'border-2 border-primary font-bold text-amber',
                !available && 'cursor-not-allowed text-sand/50 line-through hover:border-border-soft',
              )}
            >
              {edition.label.toUpperCase()}
              {!available ? <span className="sr-only"> (esgotada)</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

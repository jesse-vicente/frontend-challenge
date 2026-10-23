import chevronDown from '@/assets/icons/chevron-down.svg'
import tabUnderline from '@/assets/icons/tab-underline.svg'
import { type NftSegment, type NftSort, nftSegmentSchema, nftSortSchema } from '@/shared/api/dtos/nft'
import { cn } from '@/shared/lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { SEGMENT_LABELS, SORT_LABELS } from '../labels'

interface SegmentTabsProps {
  segment: NftSegment
  onChange: (segment: NftSegment) => void
  className?: string
}

/**
 * Catalog tabs ("Todos os NFTs / Novos lançamentos / Em alta"). They filter the
 * same listing, so they are toggle buttons (aria-pressed) rather than ARIA tabs.
 */
export function SegmentTabs({ segment, onChange, className }: SegmentTabsProps) {
  return (
    <fieldset className={cn('m-0 flex min-w-0 items-start gap-3 border-0 p-0 md:gap-5', className)}>
      <legend className="sr-only">Segmento do catálogo</legend>
      {nftSegmentSchema.options.map((option) => {
        const active = option === segment
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              'flex flex-col gap-[5px] rounded-sm text-sm leading-4 font-medium whitespace-nowrap text-foreground transition-colors hover:text-amber md:text-[15px]',
              active && 'text-amber',
            )}
          >
            {SEGMENT_LABELS[option]}
            <img
              src={tabUnderline}
              alt=""
              aria-hidden="true"
              height={2}
              className={cn('h-0.5 w-full', !active && 'invisible')}
            />
          </button>
        )
      })}
    </fieldset>
  )
}

export function SortMenu({ sort, onChange }: { sort: NftSort; onChange: (sort: NftSort) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm text-[15px] text-foreground hover:text-amber">
        <span className="hidden sm:inline">Ordenar por:</span>
        <span>{SORT_LABELS[sort]}</span>
        <img src={chevronDown} alt="" aria-hidden="true" width={11} height={6} className="h-1.5 w-[11px]" />
        <span className="sr-only">, alterar ordenação</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-surface text-foreground">
        <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onChange(nftSortSchema.parse(value))}>
          {nftSortSchema.options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {SORT_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

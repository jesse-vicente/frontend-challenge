import { useState } from 'react'
import chevronRight from '@/assets/icons/chevron-right.svg'
import { cn } from '@/shared/lib/cn'

const WINDOW = 4
/** Size of a number (size-[35px]) and the gap-2 between numbers. */
const SQUARE = 35
const GAP = 8
/** Room around the clipped row for the 2px focus outline (outline-offset-2). */
const FOCUS_ROOM = 4

const lastStart = (totalPages: number) => Math.max(1, totalPages - WINDOW + 1)

/** First of the numbers shown around a page, as many as the layout shows (4). */
export function windowStart(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page - 1, lastStart(totalPages)))
}

const pageClass =
  'grid size-[35px] place-items-center rounded-sm border border-border text-lg text-foreground leading-4 transition-colors hover:border-primary'
const arrowClass = cn(
  pageClass,
  'aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:border-border',
)

/**
 * "Pagination" frame: numbered squares, the current page filled, and arrows. The arrows slide the
 * numbers without changing the page; they stay in place (disabled at the ends), so repeated clicks
 * and keyboard focus are not lost when the row would otherwise shift.
 */
export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const [view, setView] = useState({ page, totalPages, start: windowStart(page, totalPages) })
  // A page change from elsewhere (history, filters) brings its number into view.
  if (view.page !== page || view.totalPages !== totalPages) {
    const start = Math.min(view.start, lastStart(totalPages))
    const visible = page >= start && page < start + WINDOW
    setView({ page, totalPages, start: visible ? start : windowStart(page, totalPages) })
  }

  if (totalPages <= 1) return null

  const { start } = view
  const numbers = Array.from({ length: totalPages }, (_, index) => index + 1)
  const shown = Math.min(WINDOW, totalPages)
  const slide = (step: number) => {
    const next = start + step
    if (next >= 1 && next <= lastStart(totalPages)) setView({ ...view, start: next })
  }
  const scrollable = totalPages > WINDOW

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center gap-2">
      {scrollable ? (
        <button
          type="button"
          className={arrowClass}
          onClick={() => slide(-1)}
          aria-disabled={start === 1 || undefined}
          aria-label="Páginas anteriores"
        >
          <img src={chevronRight} alt="" width={12} height={7} className="h-[7px] w-3 rotate-90" />
        </button>
      ) : null}
      {/* Every number sits on one track that slides under a window of four. The ones outside turn
          invisible (out of the tab order and the accessibility tree) once they have slid away. */}
      <div
        className="overflow-hidden"
        style={{
          width: shown * SQUARE + (shown - 1) * GAP + 2 * FOCUS_ROOM,
          margin: -FOCUS_ROOM,
          padding: FOCUS_ROOM,
        }}
      >
        <div
          className="flex gap-2 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${(start - 1) * (SQUARE + GAP)}px)` }}
        >
          {numbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => onPageChange(number)}
              aria-label={`Página ${number}`}
              aria-current={number === page ? 'page' : undefined}
              className={cn(
                pageClass,
                'shrink-0 transition-[color,background-color,border-color,visibility] duration-300',
                number === page && 'border-primary bg-primary font-bold text-ink',
                (number < start || number >= start + WINDOW) && 'invisible',
              )}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
      {scrollable ? (
        <button
          type="button"
          className={arrowClass}
          onClick={() => slide(1)}
          aria-disabled={start === lastStart(totalPages) || undefined}
          aria-label="Próximas páginas"
        >
          <img src={chevronRight} alt="" width={12} height={7} className="h-[7px] w-3 -rotate-90" />
        </button>
      ) : null}
    </nav>
  )
}

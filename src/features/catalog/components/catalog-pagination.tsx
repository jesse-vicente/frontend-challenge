import chevronRight from '@/assets/icons/chevron-right.svg'
import { cn } from '@/shared/lib/cn'

const WINDOW = 4

/** Pages around the current one, as many as the layout shows (4). */
export function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 1, totalPages - WINDOW + 1))
  return Array.from({ length: Math.min(WINDOW, totalPages) }, (_, index) => start + index)
}

const pageClass =
  'grid size-[35px] place-items-center rounded-sm border border-border text-lg text-foreground leading-4 transition-colors hover:border-primary'

/** "Pagination" frame: numbered squares, the current page filled, and a next arrow. */
export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center gap-2">
      {page > 1 ? (
        <button type="button" className={pageClass} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
          <img src={chevronRight} alt="" width={12} height={7} className="h-[7px] w-3 rotate-90" />
        </button>
      ) : null}
      {pageWindow(page, totalPages).map((number) => (
        <button
          key={number}
          type="button"
          onClick={() => onPageChange(number)}
          aria-label={`Página ${number}`}
          aria-current={number === page ? 'page' : undefined}
          className={cn(pageClass, number === page && 'border-primary bg-primary font-bold text-ink')}
        >
          {number}
        </button>
      ))}
      {page < totalPages ? (
        <button type="button" className={pageClass} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
          <img src={chevronRight} alt="" width={12} height={7} className="h-[7px] w-3 -rotate-90" />
        </button>
      ) : null}
    </nav>
  )
}

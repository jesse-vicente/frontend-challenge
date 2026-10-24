import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import searchIcon from '@/assets/icons/search-mobile.svg'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'
import { nftListQuery } from '../queries'
import { type CatalogSearch, toListParams } from '../search'
import { CatalogFilters } from './catalog-filters'
import { type CatalogSectionProps } from './catalog-section'
import { SortMenu } from './catalog-toolbar'

const SEARCH_DEBOUNCE_MS = 350

function activeFilterCount(search: CatalogSearch): number {
  return (
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.priceMin || search.priceMax ? 1 : 0) +
    (search.sort ? 1 : 0)
  )
}

/** Mobile "Search Bar" frame: live search plus the filters drawer. */
export function MobileCatalogBar({ search, onSearchChange }: CatalogSectionProps) {
  const [query, setQuery] = useState(search.q ?? '')
  const inputId = useId()
  // Same query options as the grid: facets come from the shared cache entry.
  const { data } = useQuery(nftListQuery(toListParams(search)))
  const filters = activeFilterCount(search)
  const [sheetOpen, setSheetOpen] = useState(false)
  const showResults = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /** Slides the sheet away; once it is gone, the page glides to the updated results. */
  const closeToResults = () => {
    showResults.current = true
    setSheetOpen(false)
  }
  const applyAndClose = (patch: Partial<CatalogSearch>) => {
    onSearchChange(patch, { resetPage: true })
    closeToResults()
  }

  // URL → input (history navigation).
  useEffect(() => setQuery(search.q ?? ''), [search.q])

  // Input → URL, debounced; stale responses are discarded by the query key.
  useEffect(() => {
    const next = query.trim() || undefined
    if (next === search.q) return
    const timer = setTimeout(() => onSearchChange({ q: next }, { resetPage: true }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, search.q, onSearchChange])

  return (
    <search className="flex items-center gap-2 md:hidden">
      <div className="flex h-[45px] flex-1 items-center gap-2 rounded-[10px] bg-surface px-3">
        <img src={searchIcon} alt="" aria-hidden="true" width={22} height={22} className="size-[22px]" />
        <label htmlFor={inputId} className="sr-only">
          Buscar NFTs
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Explorar coleções"
          maxLength={80}
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-sm leading-4 font-bold text-foreground outline-none placeholder:text-tan"
        />
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          ref={triggerRef}
          aria-label={filters > 0 ? `Filtros, ${filters} ativos` : 'Filtros'}
          className="relative grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgba(210,138,76,0.45)_24.6%,#d28a4c_100%)]"
        >
          <img src={filterIcon} alt="" aria-hidden="true" width={16} height={16} className="size-4" />
          {filters > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-ink bg-amber text-[10px] font-bold text-ink"
            >
              {filters}
            </span>
          ) : null}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-border bg-ink"
          onCloseAutoFocus={(event) => {
            if (!showResults.current) return
            showResults.current = false
            // Focus goes back to the trigger without scrolling up to it.
            event.preventDefault()
            triggerRef.current?.focus({ preventScroll: true })
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            document.getElementById('market')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
          }}
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription className="text-sand">Os resultados são atualizados a cada alteração.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-4">
            <SortMenu
              sort={search.sort ?? 'newest'}
              onChange={(sort) => applyAndClose({ sort: sort === 'newest' ? undefined : sort })}
            />
            <CatalogFilters
              search={search}
              facets={data?.facets}
              // One-shot actions (the price "Aplicar") close the sheet; checkboxes stay for multi-select.
              onChange={(patch) =>
                'priceMin' in patch ? applyAndClose(patch) : onSearchChange(patch, { resetPage: true })
              }
              className="rounded-lg"
            />
          </div>
          <div className="sticky bottom-0 bg-ink px-4 pt-3 pb-6 shadow-[0_-12px_20px_rgba(20,13,10,0.9)]">
            <Button className="h-11 w-full" onClick={closeToResults}>
              {data ? `Ver ${data.total} ${data.total === 1 ? 'NFT' : 'NFTs'}` : 'Ver resultados'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </search>
  )
}

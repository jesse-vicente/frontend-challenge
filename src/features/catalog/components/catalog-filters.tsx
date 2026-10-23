import { useEffect, useId, useState } from 'react'
import { type Network, networkSchema } from '@/shared/api/dtos/network'
import { type FacetCounts, type NftCategory, nftCategorySchema } from '@/shared/api/dtos/nft'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'
import { CATEGORY_LABELS, NETWORK_LABELS } from '../labels'
import { type CatalogSearch } from '../search'

export interface CatalogFiltersProps {
  search: CatalogSearch
  facets: FacetCounts | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

function toggle<T>(list: readonly T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length > 0 ? next : undefined
}

function FilterOption({
  label,
  count,
  checked,
  onToggle,
  boldCount = true,
}: {
  label: string
  count: number | undefined
  checked: boolean
  onToggle: () => void
  boldCount?: boolean
}) {
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer items-start justify-between text-[15px] leading-10 text-sand transition-colors hover:text-amber',
          'rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
          checked && 'text-amber',
        )}
      >
        <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
        {/* Selection is also signalled by the underline, not by color alone. */}
        <span className={cn(checked && 'underline decoration-2 underline-offset-4')}>{label}</span>
        <span className={cn('text-right', boldCount && 'font-bold')}>
          <span aria-hidden="true">({count ?? 0})</span>
          <span className="sr-only">{count ?? 0} NFTs</span>
        </span>
      </label>
    </li>
  )
}

const formatPrice = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function PriceFilter({ search, facets, onChange }: Omit<CatalogFiltersProps, 'className'>) {
  const bounds: [number, number] = [
    Number(facets?.priceRange.min ?? 0),
    Math.max(Number(facets?.priceRange.max ?? 0), Number(facets?.priceRange.min ?? 0) + 0.01),
  ]
  const fromSearch: [number, number] = [
    search.priceMin ? Number(search.priceMin) : bounds[0],
    search.priceMax ? Number(search.priceMax) : bounds[1],
  ]
  const [range, setRange] = useState<[number, number]>(fromSearch)
  const headingId = useId()

  // Follow back/forward navigation and facet changes.
  const [searchMin, searchMax] = fromSearch
  useEffect(() => setRange([searchMin, searchMax]), [searchMin, searchMax])

  const apply = () => {
    const [min, max] = range
    onChange({
      // Values at the bounds mean "no limit": keeps URLs short and cache keys shared.
      priceMin: min > bounds[0] ? min.toFixed(2) : undefined,
      priceMax: max < bounds[1] ? max.toFixed(2) : undefined,
    })
  }

  return (
    <section aria-labelledby={headingId} className="flex w-full flex-col gap-3">
      <h3 id={headingId} className="text-lg leading-4 font-bold text-foreground">
        Faixa de preço
      </h3>
      <div className="flex w-full flex-col items-start gap-3 pl-3">
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={0.01}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(value) => setRange([value[0] ?? bounds[0], value[1] ?? bounds[1]])}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          aria-valuetext={`${formatPrice(range[0])} a ${formatPrice(range[1])} ETH`}
        />
        <p className="text-[15px] text-foreground" aria-live="polite">
          Preço: {formatPrice(range[0])} - {formatPrice(range[1])} ETH
        </p>
        <Button size="sm" onClick={apply}>
          Aplicar
        </Button>
      </div>
    </section>
  )
}

/** "Filters" panel of the layout: categories, price range and network, all combinable. */
export function CatalogFilters({ search, facets, onChange, className }: CatalogFiltersProps) {
  const categoriesId = useId()
  const networksId = useId()

  return (
    <div className={cn('flex flex-col gap-10 bg-surface p-5', className)}>
      <section aria-labelledby={categoriesId} className="flex w-full flex-col gap-3">
        <h3 id={categoriesId} className="text-lg leading-4 font-bold text-foreground">
          Coleções
        </h3>
        <ul className="flex flex-col px-3">
          {nftCategorySchema.options.map((category: NftCategory) => (
            <FilterOption
              key={category}
              label={CATEGORY_LABELS[category]}
              count={facets?.categories[category]}
              checked={search.categories?.includes(category) ?? false}
              onToggle={() => onChange({ categories: toggle(search.categories, category) })}
            />
          ))}
        </ul>
      </section>

      <PriceFilter search={search} facets={facets} onChange={onChange} />

      <section aria-labelledby={networksId} className="flex w-full flex-col gap-3">
        <h3 id={networksId} className="text-lg leading-4 font-bold text-foreground">
          Rede
        </h3>
        <ul className="flex flex-col pl-3">
          {networkSchema.options.map((network: Network) => (
            <FilterOption
              key={network}
              label={NETWORK_LABELS[network]}
              count={facets?.networks[network]}
              checked={search.networks?.includes(network) ?? false}
              boldCount={false}
              onToggle={() => onChange({ networks: toggle(search.networks, network) })}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}

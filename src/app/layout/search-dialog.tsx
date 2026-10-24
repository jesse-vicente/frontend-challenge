import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useId, useState } from 'react'
import searchIcon from '@/assets/icons/search-mobile.svg'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

/** Global search: submits to the catalog, whose URL owns the query. */
export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onOpenChange(false)
    void navigate({ to: '/', search: { q: query.trim() || undefined }, hash: 'market' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keeps the base side margins on phones (a plain max-w-lg would replace them). */}
      <DialogContent className="border-border bg-surface max-sm:px-5">
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription className="text-sand">Pesquise por nome, criador, coleção ou atributo.</DialogDescription>
        </DialogHeader>
        <search>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <label htmlFor={inputId} className="sr-only">
              Termo de busca
            </label>
            <div className="flex h-[45px] items-center gap-2 rounded-[10px] bg-ink px-3 sm:flex-1">
              <img src={searchIcon} alt="" width={22} height={22} className="size-[22px]" />
              <input
                id={inputId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Explorar coleções"
                maxLength={80}
                className="w-full min-w-0 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-tan"
              />
            </div>
            <Button type="submit" className="h-[45px]">
              Buscar
            </Button>
          </form>
        </search>
      </DialogContent>
    </Dialog>
  )
}

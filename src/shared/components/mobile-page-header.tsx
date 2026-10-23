import { useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

/** Mobile frames: back button and centered screen title. */
export function MobilePageHeader({ title, fallback = '/' }: { title: string; fallback?: string }) {
  const router = useRouter()
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? router.history.back() : void navigate({ to: fallback }))

  return (
    <div className="relative flex items-center justify-center py-2 md:hidden">
      <button
        type="button"
        onClick={goBack}
        aria-label="Voltar"
        className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-surface-dark text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
    </div>
  )
}

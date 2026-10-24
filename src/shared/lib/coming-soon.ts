import { toast } from 'sonner'

/**
 * Out-of-scope areas (editorial pages, support, activity...) are visible in the
 * layout but must not pretend to work: they explain they are not available yet.
 */
export function notifyComingSoon(feature: string): void {
  toast.info(`${feature} estará disponível em breve.`, { id: `coming-soon-${feature}` })
}

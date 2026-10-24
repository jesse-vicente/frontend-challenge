import { cn } from '../lib/cn'

/** Trash can of the layout (cart rows). Strokes in `currentColor`; decorative by default. */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-6', className)}
    >
      <path d="M18.8894 9.55409C18.8894 17.5731 20.0437 21.1979 12.2799 21.1979C4.51515 21.1979 5.69324 17.5731 5.69324 9.55409" />
      <path d="M20.3653 6.47981H4.21484" />
      <path d="M15.7148 6.47981C15.7148 6.47981 16.2434 2.7141 12.2891 2.7141C8.33578 2.7141 8.86435 6.47981 8.86435 6.47981" />
    </svg>
  )
}

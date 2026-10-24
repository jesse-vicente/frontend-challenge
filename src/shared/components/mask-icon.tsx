import { type CSSProperties } from 'react'
import { cn } from '../lib/cn'

/**
 * Renders a Figma SVG asset as a CSS mask so it inherits `currentColor`.
 * The geometry stays exactly as exported; only the paint follows the state
 * (active, hover, disabled) of the surrounding control.
 */
export function MaskIcon({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        ...style,
      }}
    />
  )
}

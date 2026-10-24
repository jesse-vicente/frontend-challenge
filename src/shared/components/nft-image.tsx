import { preload } from 'react-dom'
import { type ImageDto } from '../api/dtos/common'
import { cn } from '../lib/cn'

/** Artwork renditions follow the `<name>.webp` (800px) / `<name>-400.webp` convention. */
export function srcSetFor(url: string): string | undefined {
  if (!url.endsWith('.webp')) return undefined
  return `${url.replace(/\.webp$/, '-400.webp')} 400w, ${url} 800w`
}

/**
 * Starts the download of an above-the-fold artwork before it renders (e.g. from a route loader,
 * as soon as its URL is known). `sizes` must match the `<img>`'s so both pick the same file.
 */
export function preloadNftImage(url: string, sizes: string): void {
  preload(url, { as: 'image', imageSrcSet: srcSetFor(url), imageSizes: sizes, fetchPriority: 'high' })
}

interface NftImageProps {
  image: Pick<ImageDto, 'url' | 'width' | 'height'> & { alt?: string }
  /** Layout width hint for the browser, e.g. "(min-width: 768px) 250px, 168px". */
  sizes: string
  /** Above-the-fold artwork: loads eagerly with high priority (LCP). */
  priority?: boolean
  /** Decorative usage (the surrounding link or heading already names it). */
  decorative?: boolean
  className?: string
}

export function NftImage({ image, sizes, priority = false, decorative = false, className }: NftImageProps) {
  return (
    <img
      src={image.url}
      srcSet={srcSetFor(image.url)}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={decorative ? '' : (image.alt ?? '')}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn('object-cover', className)}
    />
  )
}

import { Slider as SliderPrimitive } from 'radix-ui'
import * as React from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * Range slider styled after the "Faixa de preço" control: 4px primary track and
 * 15px primary thumbs with an ink ring (values from the Figma slider assets).
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  thumbValueTexts,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels?: readonly string[]
  /** Spoken value of each thumb (aria-valuetext belongs to the sliders, not the root). */
  thumbValueTexts?: readonly string[]
}) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      // Radix sets aria-disabled on the root, which needs a role that allows it.
      role="group"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
        'h-[15px]',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-1 w-full grow overflow-hidden bg-primary">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          // biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positional and never reorder
          key={index}
          aria-label={thumbLabels?.[index]}
          aria-valuetext={thumbValueTexts?.[index]}
          className="block size-[15px] shrink-0 cursor-grab rounded-full border-[3px] border-ink bg-primary outline-offset-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }

import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/shared/lib/cn'

/** Buttons follow the Kurio layout: primary fill with ink text, 6px radius, Roboto Mono bold. */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md font-bold whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: 'bg-primary text-ink hover:bg-amber',
        outline: 'border border-primary bg-transparent font-medium text-amber hover:bg-surface-dark',
        secondary: 'border border-border bg-surface text-foreground hover:border-primary',
        ghost: 'text-foreground hover:bg-surface-dark hover:text-amber',
        link: 'text-amber underline-offset-4 hover:underline',
        destructive: 'border border-destructive bg-transparent text-destructive hover:bg-destructive/10',
      },
      size: {
        default: 'h-10 px-7 text-base leading-5',
        sm: 'h-[35px] px-3 text-base leading-5',
        xs: 'h-8 px-3 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'size-10',
        'icon-sm': 'size-[35px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

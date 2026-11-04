import { cva, type VariantProps } from 'class-variance-authority'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const avatarVariants = cva(
  'relative inline-flex shrink-0 overflow-hidden bg-muted font-medium text-muted-foreground select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-12 text-base',
        xl: 'size-16 text-lg',
      },
      shape: {
        circle: 'rounded-pill',
        square: 'rounded-md',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
  },
)

export interface AvatarProps
  extends ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {
  /** Accessible name, announced whether the image or the fallback is showing. */
  alt: string
  /** Shown while the image loads, if it fails, or when there is no image. */
  fallback: ReactNode
  src?: string | undefined
}

export function Avatar({ alt, className, fallback, shape, size, src, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      aria-label={alt}
      className={cn(avatarVariants({ shape, size }), className)}
      role="img"
      {...props}
    >
      {src ? <AvatarPrimitive.Image alt="" className="size-full object-cover" src={src} /> : null}
      <AvatarPrimitive.Fallback
        aria-hidden="true"
        className="flex size-full items-center justify-center"
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

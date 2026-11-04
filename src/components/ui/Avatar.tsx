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
        square: 'rounded-lg',
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
  /**
   * Accessible name, announced whether the image or the fallback is showing. Pass an empty
   * string when a visible name sits beside the avatar, and it is hidden as decoration.
   */
  alt: string
  /** Shown while the image loads, if it fails, or when there is no image. */
  fallback: ReactNode
  src?: string | undefined
}

export function Avatar({ alt, className, fallback, shape, size, src, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      className={cn(avatarVariants({ shape, size }), className)}
      role={alt ? 'img' : undefined}
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

import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Sits on the corner of an avatar. Set its size, and a border color matching the surface. */
export function OnlineDot({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('absolute right-0 bottom-0 rounded-pill border-2 bg-success', className)}
      {...props}
    />
  )
}

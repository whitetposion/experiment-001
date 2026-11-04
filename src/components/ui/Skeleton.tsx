import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Decorative. Mark the region it fills with aria-busy and an accessible label. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      {...props}
    />
  )
}

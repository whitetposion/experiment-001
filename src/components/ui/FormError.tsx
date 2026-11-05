import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Announces why an action failed, next to the control that started it. */
export function FormError({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-destructive', className)} role="alert" {...props} />
}

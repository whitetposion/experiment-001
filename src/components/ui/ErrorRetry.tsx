import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { GENERIC_ERROR_MESSAGE } from '@/lib/failureMessage'

export interface ErrorRetryProps extends ComponentProps<'div'> {
  message?: string | undefined
  onRetry: () => void
}

/** Says why something could not load, and offers to load it again. */
export function ErrorRetry({
  className,
  message = GENERIC_ERROR_MESSAGE,
  onRetry,
  ...props
}: ErrorRetryProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="alert" {...props}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} size="sm" variant="secondary">
        Try again
      </Button>
    </div>
  )
}

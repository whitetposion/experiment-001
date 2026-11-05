import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

export function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

export function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

const dialogContentVariants = cva(
  [
    'fixed z-50 flex flex-col gap-4 overflow-y-auto border bg-surface-elevated p-panel',
    'text-surface-elevated-foreground shadow-lg backdrop-blur-panel',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
      },
      placement: {
        center: [
          'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-scale-in rounded-panel',
          'max-h-[calc(100dvh-2*var(--ds-spacing-gutter))] w-[calc(100%-2*var(--ds-spacing-gutter))]',
        ],
        // Full screen on a phone, and a sheet along the right edge from there up.
        right: [
          'top-0 right-0 bottom-0 w-full max-w-full animate-slide-in border-y-0 border-r-0',
          'pt-[max(var(--ds-panel-padding),env(safe-area-inset-top))]',
          'pb-[max(var(--ds-panel-padding),env(safe-area-inset-bottom))] sm:max-w-sm',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      placement: 'center',
    },
  },
)

export interface DialogContentProps
  extends
    ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  closeLabel?: string
  hideClose?: boolean
}

export function DialogContent({
  children,
  className,
  closeLabel = 'Close',
  hideClose = false,
  placement,
  size,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-overlay backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(dialogContentVariants({ placement, size }), className)}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close asChild>
            <IconButton className="absolute top-3 right-3" label={closeLabel} size="sm">
              <X aria-hidden="true" />
            </IconButton>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('font-heading text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider {...props} />
}

export interface TooltipProps
  extends
    ComponentProps<typeof TooltipPrimitive.Root>,
    Pick<ComponentProps<typeof TooltipPrimitive.Content>, 'align' | 'side'> {
  /** The focusable element that triggers the tooltip. */
  children: ReactElement
  className?: string
  content: ReactNode
}

export function Tooltip({ align, children, className, content, side, ...props }: TooltipProps) {
  const position = { ...(align ? { align } : {}), ...(side ? { side } : {}) }

  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={cn(
            'z-50 max-w-xs animate-fade-in rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md',
            className,
          )}
          collisionPadding={8}
          sideOffset={6}
          {...position}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

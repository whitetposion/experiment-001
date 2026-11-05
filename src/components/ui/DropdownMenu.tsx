import { cva, type VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root {...props} />
}

export function DropdownMenuTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger {...props} />
}

export function DropdownMenuGroup(props: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group {...props} />
}

export function DropdownMenuRadioGroup(
  props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return <DropdownMenuPrimitive.RadioGroup {...props} />
}

export function DropdownMenuContent({
  className,
  collisionPadding = 8,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-48 animate-scale-in overflow-y-auto',
          'rounded-lg border bg-surface-elevated p-1.5 text-surface-elevated-foreground shadow-lg backdrop-blur-panel',
          className,
        )}
        collisionPadding={collisionPadding}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

const itemClasses = [
  'relative flex min-h-control-sm cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none select-none',
  'data-disabled:pointer-events-none data-disabled:opacity-disabled',
  '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
]

const menuItemVariants = cva(itemClasses, {
  variants: {
    variant: {
      default: 'data-highlighted:bg-muted',
      destructive: 'text-destructive data-highlighted:bg-destructive/subtle',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface DropdownMenuItemProps
  extends
    ComponentProps<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof menuItemVariants> {}

export function DropdownMenuItem({ className, variant, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(menuItemVariants({ variant }), className)}
      {...props}
    />
  )
}

const indicatorClasses = 'absolute left-3 flex size-4 items-center justify-center'

export function DropdownMenuCheckboxItem({
  children,
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(itemClasses, 'pl-9 data-highlighted:bg-muted', className)}
      {...props}
    >
      <span className={indicatorClasses}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

/** A compact on-off item with no indicator column, such as an emoji in a row of reactions. */
export function DropdownMenuToggleItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        'flex size-9 cursor-default items-center justify-center rounded-md text-lg outline-none select-none',
        'data-highlighted:bg-muted data-[state=checked]:bg-secondary',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuRadioItem({
  children,
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(itemClasses, 'pl-9 data-highlighted:bg-muted', className)}
      {...props}
    >
      <span className={indicatorClasses}>
        <DropdownMenuPrimitive.ItemIndicator>
          <span className="block size-2 rounded-pill bg-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2 py-1 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('ml-auto text-xs text-muted-foreground', className)} {...props} />
}

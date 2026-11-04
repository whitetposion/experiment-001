import type { VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, MouseEvent } from 'react'
import { buttonVariants } from '@/components/ui/Button.variants'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Renders the single child element instead of a button, for example a link. */
  asChild?: boolean
  /** Shows a spinner and blocks activation while keeping keyboard focus on the button. */
  loading?: boolean
}

export function Button({
  asChild = false,
  children,
  className,
  disabled,
  loading = false,
  onClick,
  size,
  type = 'button',
  variant,
  ...props
}: ButtonProps) {
  // The native disabled attribute would drop focus mid-action, so loading uses
  // aria-disabled. Elements rendered through asChild have no disabled attribute either.
  const ariaDisabled = loading || (asChild && disabled) ? true : undefined

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (ariaDisabled) {
      event.preventDefault()
      return
    }

    onClick?.(event)
  }

  const sharedProps = {
    'aria-busy': loading ? true : undefined,
    'aria-disabled': ariaDisabled,
    className: cn(buttonVariants({ size, variant }), className),
    onClick: handleClick,
    ...props,
  }

  if (asChild) {
    return <Slot.Root {...sharedProps}>{children}</Slot.Root>
  }

  return (
    <button disabled={disabled} type={type} {...sharedProps}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

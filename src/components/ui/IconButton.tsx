import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'asChild'> {
  /** Accessible name. Required because the button has no visible text. */
  label: string
}

export function IconButton({
  children,
  className,
  label,
  loading = false,
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn('aspect-square px-0', className)}
      loading={loading}
      variant={variant}
      {...props}
    >
      {loading ? null : children}
    </Button>
  )
}

import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

const cardVariants = cva('flex flex-col gap-4 rounded-panel p-panel backdrop-blur-panel', {
  variants: {
    variant: {
      surface: 'border bg-surface text-surface-foreground shadow-panel',
      elevated: 'bg-surface-elevated text-surface-elevated-foreground shadow-lg',
      outline: 'border text-foreground',
    },
  },
  defaultVariants: {
    variant: 'surface',
  },
})

export interface CardProps extends ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />
}

export interface CardTitleProps extends ComponentProps<'h3'> {
  /** Heading level, so the card fits the surrounding document outline. */
  as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({ as: Heading = 'h3', className, ...props }: CardTitleProps) {
  return <Heading className={cn('font-heading text-lg font-semibold', className)} {...props} />
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-sm', className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
}

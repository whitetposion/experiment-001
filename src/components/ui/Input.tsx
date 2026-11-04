import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { fieldClasses } from '@/components/ui/field.variants'
import { cn } from '@/lib/cn'

const inputVariants = cva(fieldClasses, {
  variants: {
    size: {
      sm: 'h-control-sm px-3',
      md: 'h-control px-control-x',
      lg: 'h-control-lg px-control-x',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface InputProps
  extends Omit<ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {}

export function Input({ className, size, ...props }: InputProps) {
  return <input className={cn(inputVariants({ size }), className)} {...props} />
}

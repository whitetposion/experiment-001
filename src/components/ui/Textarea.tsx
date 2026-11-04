import type { ComponentProps } from 'react'
import { fieldClasses } from '@/components/ui/field.variants'
import { cn } from '@/lib/cn'

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Grows with the content instead of showing a manual resize handle. */
  autoResize?: boolean
}

export function Textarea({ autoResize = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        fieldClasses,
        'min-h-control px-control-x py-2',
        autoResize ? 'field-sizing-content resize-none' : 'resize-y',
        className,
      )}
      {...props}
    />
  )
}

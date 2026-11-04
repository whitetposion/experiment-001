import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows default scales. Registering the design tokens lets a
// className such as rounded-md replace rounded-control instead of sitting beside it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      blur: ['surface', 'panel'],
      ease: ['standard', 'emphasized'],
      radius: ['pill', 'control', 'panel'],
      shadow: ['panel'],
      spacing: ['gutter', 'section', 'control-sm', 'control', 'control-lg', 'control-x', 'panel'],
    },
    classGroups: {
      duration: [{ duration: ['fast', 'normal', 'slow'] }],
      opacity: [{ opacity: ['disabled', 'subtle'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

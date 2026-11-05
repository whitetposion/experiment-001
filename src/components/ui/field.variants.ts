// Shared by Input and Textarea. Text stays at 16px on small screens because iOS Safari
// zooms the page when a focused field is smaller.
export const fieldClasses = [
  'w-full min-w-0 rounded-control border border-border-strong bg-surface text-base text-surface-foreground shadow-sm md:text-sm',
  'transition-colors duration-fast placeholder:text-muted-foreground',
  'focus-visible:border-ring focus-visible:outline-3 focus-visible:outline-ring/25',
  'disabled:cursor-not-allowed disabled:opacity-disabled',
  'aria-invalid:border-destructive aria-invalid:outline-destructive',
]

import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface AppShellProps {
  /** The page heading. It stays available when a phone hides either panel. */
  title: string
  sidebar: ReactNode
  main: ReactNode
  /** The accessible name of the main panel. */
  mainLabel: string
  /** Which panel fills the screen when there is only room for one. */
  isMainActive: boolean
}

/**
 * Two panels side by side from tablet width up, and one at a time on a phone. The shell uses
 * overflow-clip, not overflow-hidden: a hidden box can still be scrolled by focus() and
 * scrollIntoView(), which pushes the whole app off screen.
 */
export function AppShell({ isMainActive, main, mainLabel, sidebar, title }: AppShellProps) {
  return (
    <main className="grid h-dvh overflow-clip pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[24rem_minmax(0,1fr)]">
      <h1 className="sr-only">{title}</h1>
      <div className={cn('min-h-0 min-w-0 md:block', isMainActive && 'hidden')}>{sidebar}</div>
      <section
        aria-label={mainLabel}
        className={cn('min-h-0 min-w-0 md:block', !isMainActive && 'hidden')}
      >
        {main}
      </section>
    </main>
  )
}

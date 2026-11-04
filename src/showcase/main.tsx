import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Showcase } from '@/showcase/Showcase'
import { applyTheme, isShowcaseTheme } from '@/showcase/theme'
import '@/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root not found')
}

// ?theme=dark opens the page on a theme, which keeps visual checks repeatable.
const requestedTheme = new URLSearchParams(window.location.search).get('theme')
const initialTheme = isShowcaseTheme(requestedTheme) ? requestedTheme : 'light'

applyTheme(initialTheme)

createRoot(container).render(
  <StrictMode>
    <TooltipProvider>
      <Showcase initialTheme={initialTheme} />
    </TooltipProvider>
  </StrictMode>,
)

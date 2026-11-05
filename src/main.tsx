import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { bootstrapApp } from '@/app/bootstrap'
import { AppProviders } from '@/app/providers'
import { makeStore } from '@/app/store'
import { createSimulatedChatApi } from '@/services/simulation/createSimulatedChatApi'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root not found')
}

// The one place that chooses the backend. A real API replaces the mock here.
const store = makeStore({ api: createSimulatedChatApi() })

void store.dispatch(bootstrapApp())

createRoot(container).render(
  <StrictMode>
    <AppProviders store={store}>
      <App />
    </AppProviders>
  </StrictMode>,
)

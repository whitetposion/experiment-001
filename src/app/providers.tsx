import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import type { AppStore } from './store'

interface AppProvidersProps {
  children: ReactNode
  store: AppStore
}

export function AppProviders({ children, store }: AppProvidersProps) {
  return <Provider store={store}>{children}</Provider>
}

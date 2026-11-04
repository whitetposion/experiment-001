import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('renders the main landmark inside the app providers', () => {
    const { store } = renderWithProviders(<App />)

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(store.getState()).toEqual({})
  })
})

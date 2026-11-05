import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderLoaded } from '@/test/render'
import { App } from './App'

const renderApp = () => renderLoaded(<App />)

const sidebarPanel = () => screen.getByRole('navigation', { name: 'Chats' }).parentElement
const conversationPanel = () => screen.getByRole('region', { name: 'Conversation' })

describe('App', () => {
  // jsdom has no layout, so these guard the two rules that keep the app on screen. Without
  // them, opening a long chat scrolled the whole shell away and cut off the header.
  it('cannot be scrolled out of place by focus or scrollIntoView', async () => {
    await renderApp()

    expect(screen.getByRole('main')).toHaveClass('overflow-clip')
    expect(screen.getByRole('main')).not.toHaveClass('overflow-hidden')
  })

  it('keeps screen reader text inside its scrolling list', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: /Rohan Desai/ }))

    expect(screen.getByRole('log')).toHaveClass('relative', 'overflow-y-auto')
    expect(document.querySelector('[data-list-item]')?.closest('.overflow-y-auto')).toHaveClass(
      'relative',
    )
  })

  it('keeps the main landmark and page heading around both panels', async () => {
    await renderApp()
    const main = screen.getByRole('main')

    expect(main).not.toHaveClass('hidden')
    expect(within(main).getByRole('heading', { level: 1, name: 'Chats' })).toBeInTheDocument()
    expect(main).toContainElement(screen.getByRole('navigation', { name: 'Chats' }))
    expect(main).toContainElement(conversationPanel())
    expect(conversationPanel()).toHaveTextContent('Select a chat to start messaging.')
  })

  it('shows only the sidebar on a phone until a chat is opened', async () => {
    await renderApp()

    expect(sidebarPanel()).not.toHaveClass('hidden')
    expect(conversationPanel()).toHaveClass('hidden')
  })

  it('swaps panels when a chat opens, and back again, keeping the landmark', async () => {
    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: /Rohan Desai/ }))

    expect(sidebarPanel()).toHaveClass('hidden')
    expect(conversationPanel()).not.toHaveClass('hidden')
    expect(screen.getByRole('main')).not.toHaveClass('hidden')
    expect(
      within(conversationPanel()).getByRole('heading', { name: 'Rohan Desai' }),
    ).toBeInTheDocument()

    await user.click(within(conversationPanel()).getByRole('button', { name: 'Back to chats' }))

    expect(conversationPanel()).toHaveClass('hidden')
    expect(sidebarPanel()).not.toHaveClass('hidden')
  })

  it('closes the chat on system back instead of leaving the app', async () => {
    const { user } = await renderApp()
    const row = screen.getByRole('button', { name: /Rohan Desai/ })

    await user.click(row)
    await within(conversationPanel()).findByRole('heading', { name: 'Rohan Desai' })

    history.back()

    await waitFor(() => {
      expect(conversationPanel()).toHaveClass('hidden')
    })
    expect(row).toHaveFocus()
  })
})

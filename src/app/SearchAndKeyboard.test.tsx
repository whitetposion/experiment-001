import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openConversation, selectUnreadCount } from '@/features/conversations'
import { deleteMessage, editMessage, selectThreadMessageIds } from '@/features/messages'
import type { MessageSearchResponse } from '@/services/chatApi'
import { renderLoaded } from '@/test/render'
import { toConversationId, toMessageId } from '@/types/ids'
import { App } from './App'

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')

const renderApp = () => renderLoaded(<App />)

const searchBox = () => screen.getByRole('searchbox')
const chatRow = (name: RegExp) => screen.getByRole('button', { name })
const messagesSection = () => screen.findByRole('region', { name: 'Messages' })
const composer = () => screen.getByRole('textbox', { name: 'Message' })

function setPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: coarse,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('debounced search', () => {
  it('leaves Redux alone while typing, then sends one search', async () => {
    const { api, store, user } = await renderApp()
    const search = vi.spyOn(api, 'searchMessages')
    const before = store.getState().conversations

    await user.type(searchBox(), 'payments')

    expect(store.getState().conversations).toBe(before)
    expect(search).not.toHaveBeenCalled()
    expect(searchBox()).toHaveValue('payments')

    await messagesSection()
    await waitFor(() => {
      expect(search).toHaveBeenCalledOnce()
    })
    expect(search.mock.calls[0]?.[0]).toBe('payments')
  })

  it('does not search messages for a single character', async () => {
    const { api, user } = await renderApp()
    const search = vi.spyOn(api, 'searchMessages')

    await user.type(searchBox(), 'p')
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)))

    expect(search).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Messages' })).not.toBeInTheDocument()
  })

  it('ignores a slower, older response', async () => {
    const { api, store, user } = await renderApp()
    const resolvers: ((value: MessageSearchResponse) => void)[] = []
    const signals: (AbortSignal | undefined)[] = []
    vi.spyOn(api, 'searchMessages').mockImplementation(
      (_query, options) =>
        new Promise((resolve) => {
          signals.push(options?.signal)
          resolvers.push(resolve)
        }),
    )
    const messageFor = (id: string, text: string) => ({
      ...(store.getState().messages.entities[toMessageId('message-rohan-4')] ?? {}),
      id,
      text,
      state: 'active',
    })

    await user.type(searchBox(), 'old')
    await waitFor(() => {
      expect(resolvers).toHaveLength(1)
    })
    await user.clear(searchBox())
    await user.type(searchBox(), 'new')
    await waitFor(() => {
      expect(resolvers).toHaveLength(2)
    })

    expect(signals[0]?.aborted).toBe(true)

    await act(async () => {
      resolvers[1]?.({ messages: [messageFor('m-new', 'the new one')] } as never)
      await Promise.resolve()
    })
    await act(async () => {
      resolvers[0]?.({ messages: [messageFor('m-old', 'the old one')] } as never)
      await Promise.resolve()
    })

    const section = await messagesSection()
    await within(section).findByText(/the/)
    expect(section).toHaveTextContent('the new one')
    expect(section).not.toHaveTextContent('the old one')
  })
})

describe('message search', () => {
  it('finds messages in direct and group conversations and names both', async () => {
    const { user } = await renderApp()

    await user.type(searchBox(), 'the test devices')

    const section = await messagesSection()
    const results = await within(section).findAllByRole('button')
    expect(results.map((result) => result.textContent)).toEqual([
      expect.stringMatching(/^Launch Crew.*Dev: I will bring the test devices/),
      expect.stringMatching(/^Dev Malhotra.*You: Did the test devices arrive\?/),
    ])
  })

  it('highlights the matching words', async () => {
    const { user } = await renderApp()

    await user.type(searchBox(), 'PAYMENTS PASSED')

    const section = await messagesSection()
    const mark = await within(section).findByText('Payments passed', { selector: 'mark' })
    expect(mark).toBeInTheDocument()
  })

  it('reads each result as separate parts', async () => {
    const { user } = await renderApp()

    await user.type(searchBox(), 'payments passed')

    const section = await messagesSection()
    const [result] = await within(section).findAllByRole('button')
    expect(result).toHaveAccessibleName(/^Launch Crew,.*,\s*Arjun: Payments passed review$/)
  })

  it('announces how many were found, and says when nothing matches', async () => {
    const { user } = await renderApp()

    await user.type(searchBox(), 'zzzzz')

    const section = await messagesSection()
    expect(await within(section).findByText('No messages match "zzzzz"')).toBeInTheDocument()
    expect(within(section).getByRole('status')).toHaveTextContent('0 messages found')
  })

  it('shows an error and retries', async () => {
    const { api, user } = await renderApp()
    api.failNextRequest()

    await user.type(searchBox(), 'payments')

    const section = await messagesSection()
    expect(await within(section).findByRole('alert')).toHaveTextContent('Check your connection')

    await user.click(within(section).getByRole('button', { name: 'Try again' }))

    expect((await within(section).findAllByText('Payments')).length).toBeGreaterThan(0)
  })

  it('drops a deleted message and updates an edited one', async () => {
    const { store, user } = await renderApp()
    const own = toMessageId('message-priya-2')
    await user.type(searchBox(), 'icon')
    const section = await messagesSection()
    await within(section).findByText(/still needs work/)

    await act(() => store.dispatch(editMessage({ messageId: own, text: 'The icon is fixed' })))
    expect(await within(section).findByText(/is fixed/)).toBeInTheDocument()

    await act(() => store.dispatch(deleteMessage(own)))
    await waitFor(() => {
      expect(section).not.toHaveTextContent('is fixed')
    })
  })

  it('goes away when the search is cleared', async () => {
    const { user } = await renderApp()
    await user.type(searchBox(), 'payments')
    await messagesSection()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('region', { name: 'Messages' })).not.toBeInTheDocument()
  })
})

describe('opening a result', () => {
  it('loads older pages to reach the message, then highlights and focuses it', async () => {
    const { store, user } = await renderApp()
    await user.type(searchBox(), 'Two weeks to launch')
    const section = await messagesSection()

    await user.click(await within(section).findByRole('button', { name: /Launch Crew/ }))

    const message = await waitFor(() => {
      const item = document.querySelector<HTMLElement>('[data-message-id="message-launch-1"]')
      expect(item).toHaveClass('bg-primary/subtle')
      return item
    })
    expect(selectThreadMessageIds(store.getState(), launch)).toHaveLength(34)
    expect(message).toHaveFocus()
  })

  it('ends the highlight on its own', async () => {
    const { user } = await renderApp()
    await user.type(searchBox(), 'payments passed')
    const section = await messagesSection()
    await user.click(await within(section).findByRole('button', { name: /Launch Crew/ }))
    const item = await waitFor(() => {
      const found = document.querySelector('[data-message-id="message-launch-19"]')
      expect(found).toHaveClass('bg-primary/subtle')
      return found
    })

    await waitFor(
      () => {
        expect(item).not.toHaveClass('bg-primary/subtle')
      },
      { timeout: 3000 },
    )
  })

  it('keeps the chat usable when an older page fails', async () => {
    const { api, user } = await renderApp()
    await user.type(searchBox(), 'Two weeks to launch')
    const section = await messagesSection()
    const result = await within(section).findByRole('button', { name: /Launch Crew/ })
    const original = api.getMessages.bind(api)
    let calls = 0
    vi.spyOn(api, 'getMessages').mockImplementation((...args) => {
      calls += 1
      return calls === 2 ? Promise.reject(new Error('Offline')) : original(...args)
    })

    await user.click(result)

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument()
  })
})

describe('search box keys', () => {
  it('clears with Escape, including text not yet searched', async () => {
    const { store, user } = await renderApp()
    await user.type(searchBox(), 'trek')

    await user.keyboard('{Escape}')
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)))

    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
    expect(store.getState().conversations.searchQuery).toBe('')
  })

  it('shows a query cleared from elsewhere', async () => {
    const { user } = await renderApp()
    await user.type(searchBox(), 'nobody here')
    await screen.findByText('No chats match "nobody here"')

    const [, emptyStateButton] = screen.getAllByRole('button', { name: 'Clear search' })
    await user.click(emptyStateButton ?? document.body)

    expect(searchBox()).toHaveValue('')
  })
})

describe('list keys', () => {
  it('moves from search into the list and through it', async () => {
    const { user } = await renderApp()
    searchBox().focus()

    await user.keyboard('{ArrowDown}')
    expect(chatRow(/Launch Crew/)).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(chatRow(/Rohan Desai/)).toHaveFocus()

    await user.keyboard('{End}')
    expect(document.activeElement).toBe([...document.querySelectorAll('[data-list-item]')].at(-1))

    await user.keyboard('{Home}')
    expect(chatRow(/Launch Crew/)).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(searchBox()).toHaveFocus()
  })

  it('continues from chats into message results', async () => {
    const { user } = await renderApp()
    await user.type(searchBox(), 'launch')
    const section = await messagesSection()
    await within(section).findAllByRole('button')
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Rohan Desai/ })).not.toBeInTheDocument()
    })

    await user.keyboard('{ArrowDown}{ArrowDown}')

    expect(section).toContainElement(document.activeElement as HTMLElement)
  })

  it('leaves Tab alone', async () => {
    const { user } = await renderApp()
    chatRow(/Launch Crew/).focus()

    await user.tab()

    expect(chatRow(/Rohan Desai/)).toHaveFocus()
  })
})

describe('global shortcuts', () => {
  it.each([
    ['Control', '{Control>}k{/Control}'],
    ['Command', '{Meta>}k{/Meta}'],
  ])('focuses search with %s K, even from a text field', async (_name, keys) => {
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))
    composer().focus()

    await user.keyboard(keys)

    expect(searchBox()).toHaveFocus()
    expect(composer()).toHaveValue('')
  })

  it('focuses search with slash outside a text field', async () => {
    const { user } = await renderApp()
    chatRow(/Launch Crew/).focus()

    await user.keyboard('/')

    expect(searchBox()).toHaveFocus()
    expect(searchBox()).toHaveValue('')
  })

  it('types a normal slash in the composer and search box', async () => {
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))

    await user.type(composer(), 'and/or')
    expect(composer()).toHaveValue('and/or')
    expect(composer()).toHaveFocus()

    await user.type(searchBox(), 'a/b')
    expect(searchBox()).toHaveValue('a/b')
  })

  it('stays out of the way of plain K and other combinations', async () => {
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))
    composer().focus()

    await user.keyboard('k{Control>}{Shift>}k{/Shift}{/Control}')

    expect(composer()).toHaveFocus()
    expect(composer()).toHaveValue('k')
  })

  it('does nothing while a dialog or menu is open', async () => {
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(launch)))
    await user.click(screen.getByRole('button', { name: 'Group info' }))
    const dialog = await screen.findByRole('dialog')
    const active = document.activeElement

    await user.keyboard('{Control>}k{/Control}')

    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(active)

    // fireEvent returns false if something consumed the key, which must not happen here.
    expect(fireEvent.keyDown(dialog, { key: 'k', ctrlKey: true })).toBe(true)
    expect(fireEvent.keyDown(dialog, { key: '/' })).toBe(true)
  })

  it('ignores keys while an input method is composing', async () => {
    await renderApp()
    chatRow(/Launch Crew/).focus()

    fireEvent.keyDown(chatRow(/Launch Crew/), { key: '/', isComposing: true })

    expect(searchBox()).not.toHaveFocus()
  })

  it('removes its listener on unmount', async () => {
    const { unmount } = await renderApp()
    const remove = vi.spyOn(document, 'removeEventListener')

    unmount()

    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})

describe('sending with the keyboard', () => {
  it('sends with Enter on a keyboard', async () => {
    setPointer(false)
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))

    await user.type(composer(), 'Hello{Enter}')

    expect(await within(screen.getByRole('log')).findByText('Hello')).toBeInTheDocument()
  })

  it('adds a line with Enter on a touch screen, and sends with the button', async () => {
    setPointer(true)
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))

    await user.type(composer(), 'One{Enter}Two')
    expect(composer()).toHaveValue('One\nTwo')

    await user.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(composer()).toHaveValue('')
    })
  })
})

describe('focus when moving around', () => {
  it('is ready to type after opening a chat', async () => {
    setPointer(false)
    const { user } = await renderApp()

    await user.click(chatRow(/Rohan Desai/))

    await waitFor(() => {
      expect(composer()).toHaveFocus()
    })
  })

  it('does not pop up the keyboard on a touch screen', async () => {
    setPointer(true)
    const { user } = await renderApp()

    await user.click(chatRow(/Rohan Desai/))

    await screen.findByRole('textbox', { name: 'Message' })
    expect(composer()).not.toHaveFocus()
  })

  it('returns to the chat row after going back', async () => {
    const { store, user } = await renderApp()
    await act(() => store.dispatch(openConversation(rohan)))

    await user.click(screen.getByRole('button', { name: 'Back to chats' }))

    expect(chatRow(/Rohan Desai/)).toHaveFocus()
  })
})

describe('unread indicators', () => {
  it('marks where unread messages begin, even though opening clears the count', async () => {
    const { store, user } = await renderApp()

    await user.click(chatRow(/Rohan Desai/))

    const divider = await screen.findByText('Unread messages')
    expect(divider.closest('li')).toHaveAttribute('data-message-id', 'message-rohan-5')
    await waitFor(() => {
      expect(selectUnreadCount(store.getState(), rohan)).toBe(0)
    })
    expect(screen.getByText('Unread messages')).toBeInTheDocument()
  })

  it('shows no divider without unread messages, or when coming back', async () => {
    const { store, user } = await renderApp()
    await user.click(chatRow(/Rohan Desai/))
    await screen.findByText('Unread messages')

    await user.click(chatRow(/Priya Nair/))
    await within(screen.getByRole('log')).findByText(/Figma library/)
    expect(screen.queryByText('Unread messages')).not.toBeInTheDocument()

    await act(() => store.dispatch(openConversation(rohan)))
    await within(screen.getByRole('log')).findByText(/sign us both up/)
    expect(screen.queryByText('Unread messages')).not.toBeInTheDocument()
  })

  it('shows the unread total in the page title', async () => {
    const { store } = await renderApp()
    expect(document.title).toBe('(6) Chats')

    await act(() => store.dispatch(openConversation(rohan)))

    await waitFor(() => {
      expect(document.title).toBe('(4) Chats')
    })
  })
})

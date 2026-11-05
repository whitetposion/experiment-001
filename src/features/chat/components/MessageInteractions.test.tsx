import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { bootstrapApp } from '@/app/bootstrap'
import {
  conversationSelected,
  openConversation,
  selectConversationPreview,
} from '@/features/conversations'
import { selectMessageById, selectThreadMessageIds, sendMessage } from '@/features/messages'
import { selectComposerTarget } from '@/features/ui'
import { renderWithProviders } from '@/test/render'
import { createTestStore } from '@/test/store'
import { toConversationId, toMessageId, type ConversationId } from '@/types/ids'
import { ChatWindow } from './ChatWindow'

const rohan = toConversationId('conversation-rohan')
const priya = toConversationId('conversation-priya')
const trek = toConversationId('conversation-trek')

const OWN_TEXT = 'Deal. 5k it is'
const OTHER_TEXT = 'Want me to sign us both up?'
const ownMessage = toMessageId('message-rohan-4')

async function renderChat(conversationId: ConversationId = rohan) {
  const context = createTestStore()
  await context.store.dispatch(bootstrapApp())
  await context.store.dispatch(openConversation(conversationId))
  renderWithProviders(<ChatWindow />, { store: context.store })
  return { ...context, user: userEvent.setup() }
}

type User = ReturnType<typeof userEvent.setup>

const log = () => screen.getByRole('log')
const bubble = (text: string) =>
  within(log())
    .getByText(text, { selector: 'p.whitespace-pre-wrap, p.italic' })
    .closest('li') as HTMLElement
const actionsButton = (text: string) =>
  within(bubble(text)).getByRole('button', { name: /^Actions for message from/ })
const input = () => screen.getByRole<HTMLTextAreaElement>('textbox')

async function openMenu(user: User, text: string) {
  await user.click(actionsButton(text))
  return screen.findByRole('menu')
}

async function chooseAction(user: User, text: string, action: string) {
  await openMenu(user, text)
  await user.click(screen.getByRole('menuitem', { name: action }))
}

async function startDelete(user: User, text: string) {
  await chooseAction(user, text, 'Delete')
  return screen.findByRole('dialog', { name: 'Delete this message?' })
}

async function confirmDelete(user: User, text: string) {
  const dialog = await startDelete(user, text)
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}

describe('action menu', () => {
  it('offers every action on the user’s own message', async () => {
    const { user } = await renderChat()

    await openMenu(user, OWN_TEXT)

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'Reply',
      'Copy',
      'Edit',
      'Delete',
    ])
    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(6)
  })

  it('leaves out edit and delete on someone else’s message', async () => {
    const { user } = await renderChat()

    await openMenu(user, OTHER_TEXT)

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'Reply',
      'Copy',
    ])
  })

  it('names the sender on each menu button', async () => {
    await renderChat()

    expect(actionsButton(OTHER_TEXT)).toHaveAccessibleName('Actions for message from Rohan Desai')
    expect(actionsButton(OWN_TEXT)).toHaveAccessibleName('Actions for message from You')
  })

  it('has no actions on a deleted message', async () => {
    await renderChat(trek)

    expect(within(bubble('You deleted this message')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('works from the keyboard and returns focus on Escape', async () => {
    const { user } = await renderChat()
    actionsButton(OTHER_TEXT).focus()

    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemcheckbox', { name: 'React with heart' })).toHaveFocus()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(actionsButton(OTHER_TEXT)).toHaveFocus()
    })
  })
})

describe('copying', () => {
  it('copies the text and confirms it', async () => {
    const { user } = await renderChat()

    await chooseAction(user, OTHER_TEXT, 'Copy')

    expect(await screen.findByText('Message copied')).toBeInTheDocument()
    await expect(navigator.clipboard.readText()).resolves.toBe(OTHER_TEXT)
  })

  it('says so when the browser refuses', async () => {
    const { user } = await renderChat()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'))

    await chooseAction(user, OTHER_TEXT, 'Copy')

    expect(await screen.findByText('Could not copy this message')).toBeInTheDocument()
  })
})

describe('reactions', () => {
  const chip = (text: string, name: RegExp) => within(bubble(text)).findByRole('button', { name })

  async function react(user: User, text: string, name: string) {
    await openMenu(user, text)
    await user.click(screen.getByRole('menuitemcheckbox', { name }))
  }

  it('adds a reaction from the menu', async () => {
    const { user } = await renderChat()

    await react(user, OTHER_TEXT, 'React with thumbs up')

    const added = await chip(OTHER_TEXT, /👍 1 reaction/)
    expect(added).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the current reaction as checked, and removes it from the menu', async () => {
    const { user } = await renderChat()
    await react(user, OTHER_TEXT, 'React with heart')
    await chip(OTHER_TEXT, /❤️ 1/)

    await openMenu(user, OTHER_TEXT)
    const item = screen.getByRole('menuitemcheckbox', { name: 'React with heart' })
    expect(item).toBeChecked()
    await user.click(item)

    await waitFor(() => {
      expect(within(bubble(OTHER_TEXT)).queryByRole('button', { name: /❤️/ })).toBeNull()
    })
  })

  it('replaces the user’s reaction when they choose another', async () => {
    const { user } = await renderChat()
    await react(user, OTHER_TEXT, 'React with thumbs up')
    await chip(OTHER_TEXT, /👍 1/)

    await react(user, OTHER_TEXT, 'React with heart')

    await chip(OTHER_TEXT, /❤️ 1/)
    expect(within(bubble(OTHER_TEXT)).queryByRole('button', { name: /👍/ })).toBeNull()

    await openMenu(user, OTHER_TEXT)
    expect(screen.getByRole('menuitemcheckbox', { name: 'React with heart' })).toBeChecked()
    expect(screen.getByRole('menuitemcheckbox', { name: 'React with thumbs up' })).not.toBeChecked()
  })

  it('moves the user’s reaction when they join someone else’s', async () => {
    const { user } = await renderChat()
    await react(user, OWN_TEXT, 'React with thumbs up')
    await chip(OWN_TEXT, /👍 1/)

    await user.click(await chip(OWN_TEXT, /🙌 1/))

    await chip(OWN_TEXT, /🙌 2/)
    expect(within(bubble(OWN_TEXT)).queryByRole('button', { name: /👍/ })).toBeNull()
  })

  it('removes the user’s reaction from its chip', async () => {
    const { user } = await renderChat()
    await react(user, OTHER_TEXT, 'React with sad')

    await user.click(await chip(OTHER_TEXT, /😢 1/))

    await waitFor(() => {
      expect(within(bubble(OTHER_TEXT)).queryByRole('button', { name: /😢/ })).toBeNull()
    })
  })

  it('joins someone else’s reaction from its chip', async () => {
    const { user } = await renderChat()
    const existing = await chip(OWN_TEXT, /🙌 1 reaction/)
    expect(existing).toHaveAttribute('aria-pressed', 'false')

    await user.click(existing)

    const joined = await chip(OWN_TEXT, /🙌 2 reactions/)
    expect(joined).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps other people’s reactions when the user removes theirs', async () => {
    const { user } = await renderChat()
    await user.click(await chip(OWN_TEXT, /🙌 1/))
    await user.click(await chip(OWN_TEXT, /🙌 2/))

    const remaining = await chip(OWN_TEXT, /🙌 1/)
    expect(remaining).toHaveAttribute('aria-pressed', 'false')
  })

  it('explains a failure and leaves the reactions alone', async () => {
    const { api, user } = await renderChat()
    const existing = await chip(OWN_TEXT, /🙌 1/)
    api.failNextRequest()

    await user.click(existing)

    expect(await screen.findByText(/Check your connection/)).toBeInTheDocument()
    expect(await chip(OWN_TEXT, /🙌 1/)).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('editing', () => {
  it('opens the message in the composer with focus', async () => {
    const { user } = await renderChat()

    await chooseAction(user, OWN_TEXT, 'Edit')

    expect(await screen.findByText('Editing message')).toBeInTheDocument()
    expect(input()).toHaveValue(OWN_TEXT)
    expect(input()).toHaveAccessibleName('Edit message')
    await waitFor(() => {
      expect(input()).toHaveFocus()
    })
  })

  it('saves the change, marks it edited, and returns to an empty composer', async () => {
    const { user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    await user.clear(input())
    await user.type(input(), 'Deal, 5k it is!{Enter}')

    const edited = await within(log()).findByText('Deal, 5k it is!')
    expect(edited.closest('li')).toHaveTextContent('Edited')
    await waitFor(() => {
      expect(screen.queryByText('Editing message')).not.toBeInTheDocument()
    })
    expect(input()).toHaveValue('')
  })

  it('brings back an unsent draft after editing', async () => {
    const { user } = await renderChat()
    await user.type(input(), 'My unsent draft')

    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')
    expect(input()).toHaveValue(OWN_TEXT)

    await user.click(screen.getByRole('button', { name: 'Cancel edit' }))

    expect(input()).toHaveValue('My unsent draft')
  })

  it('cancels with Escape and discards the changes', async () => {
    const { store, user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')
    await user.type(input(), ' changed')

    await user.keyboard('{Escape}')

    expect(selectComposerTarget(store.getState())).toBeNull()
    expect(selectMessageById(store.getState(), ownMessage)).toMatchObject({ text: OWN_TEXT })
    expect(bubble(OWN_TEXT)).not.toHaveTextContent('Edited')
  })

  it('starts fresh when a cancelled message is edited again', async () => {
    const { user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')
    await user.type(input(), ' discarded')
    await user.keyboard('{Escape}')

    await chooseAction(user, OWN_TEXT, 'Edit')

    await screen.findByText('Editing message')
    expect(input()).toHaveValue(OWN_TEXT)
  })

  it('does not mark a message edited when nothing changed', async () => {
    const { api, user } = await renderChat()
    const edit = vi.spyOn(api, 'editMessage')
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    await user.click(screen.getByRole('button', { name: 'Save edit' }))

    await waitFor(() => {
      expect(screen.queryByText('Editing message')).not.toBeInTheDocument()
    })
    expect(edit).not.toHaveBeenCalled()
  })

  it('cannot save empty text', async () => {
    const { user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    await user.clear(input())

    expect(screen.getByRole('button', { name: 'Save edit' })).toBeDisabled()
  })

  it('keeps the edit open and explains when saving fails', async () => {
    const { api, user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')
    await user.type(input(), '!')
    api.failNextRequest()

    await user.keyboard('{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection')
    expect(input()).toHaveValue(`${OWN_TEXT}!`)
    expect(screen.getByText('Editing message')).toBeInTheDocument()
  })

  it('switches cleanly from one edit to another', async () => {
    const { user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')
    await user.type(input(), ' extra')

    await chooseAction(user, 'Thinking about it. My knee is still sore.', 'Edit')

    await waitFor(() => {
      expect(input()).toHaveValue('Thinking about it. My knee is still sore.')
    })
  })

  it('ends when the user changes conversation', async () => {
    const { store, user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    store.dispatch(conversationSelected(priya))
    await store.dispatch(openConversation(priya))

    await waitFor(() => {
      expect(screen.queryByText('Editing message')).not.toBeInTheDocument()
    })
    expect(input()).toHaveValue('')
  })
})

describe('deleting', () => {
  it('asks first, and cancelling changes nothing', async () => {
    const { store, user } = await renderChat()
    const dialog = await startDelete(user, OWN_TEXT)

    expect(dialog).toHaveAccessibleDescription(/removed for everyone/)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(selectMessageById(store.getState(), ownMessage)?.state).toBe('active')
    expect(bubble(OWN_TEXT)).toBeInTheDocument()
  })

  it('returns focus to the message after cancelling', async () => {
    const { user } = await renderChat()
    await startDelete(user, OWN_TEXT)

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(actionsButton(OWN_TEXT)).toHaveFocus()
    })
  })

  it('replaces the content but keeps the message in place', async () => {
    const { store, user } = await renderChat()
    const ids = selectThreadMessageIds(store.getState(), rohan)

    await confirmDelete(user, OWN_TEXT)

    expect(within(log()).queryByText(OWN_TEXT)).not.toBeInTheDocument()
    expect(bubble('You deleted this message')).toBeInTheDocument()
    expect(selectThreadMessageIds(store.getState(), rohan)).toEqual(ids)
  })

  it('moves focus to the message list, because the button is gone', async () => {
    const { user } = await renderChat()

    await confirmDelete(user, OWN_TEXT)

    await waitFor(() => {
      expect(log()).toHaveFocus()
    })
  })

  it('removes reactions along with the content', async () => {
    const { user } = await renderChat()

    await confirmDelete(user, OWN_TEXT)

    expect(within(log()).queryByRole('button', { name: /🙌/ })).not.toBeInTheDocument()
  })

  it('stays open and explains when it fails, and can be retried', async () => {
    const { api, store, user } = await renderChat()
    const dialog = await startDelete(user, OWN_TEXT)
    api.failNextRequest()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Check your connection')
    expect(selectMessageById(store.getState(), ownMessage)?.state).toBe('active')

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(selectMessageById(store.getState(), ownMessage)?.state).toBe('deleted')
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('updates the sidebar preview when the latest message is deleted', async () => {
    const { store, user } = await renderChat(priya)

    await confirmDelete(user, 'Done, it is in the Figma library')

    expect(selectConversationPreview(store.getState(), priya)).toMatchObject({
      isDeleted: true,
      text: 'You deleted this message',
    })
  })
})

describe('message relationships', () => {
  async function renderWithReply() {
    const context = await renderChat()
    const reply = await context.store
      .dispatch(
        sendMessage({ conversationId: rohan, text: 'My reply', replyToMessageId: ownMessage }),
      )
      .unwrap()
    await within(log()).findByText('My reply')
    return { ...context, reply }
  }

  it('keeps a reply when its original is deleted, and says so', async () => {
    const { reply, store, user } = await renderWithReply()

    await confirmDelete(user, OWN_TEXT)

    expect(bubble('My reply')).toHaveTextContent('This message was deleted')
    expect(bubble('My reply')).not.toHaveTextContent(OWN_TEXT)
    expect(selectMessageById(store.getState(), reply.id)?.replyToMessageId).toBe(ownMessage)
  })

  it('updates a reply’s quote when its original is edited', async () => {
    const { user } = await renderWithReply()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    await user.clear(input())
    await user.type(input(), 'New wording{Enter}')

    await waitFor(() => {
      expect(bubble('My reply')).toHaveTextContent('New wording')
    })
  })

  it('keeps a message’s reply link and reactions when it is edited', async () => {
    const { reply, store, user } = await renderWithReply()
    await user.click(await within(bubble(OWN_TEXT)).findByRole('button', { name: /🙌 1/ }))
    await within(bubble(OWN_TEXT)).findByRole('button', { name: /🙌 2/ })

    await chooseAction(user, 'My reply', 'Edit')
    await screen.findByText('Editing message')
    await user.type(input(), ' updated{Enter}')
    await within(log()).findByText('My reply updated')

    expect(selectMessageById(store.getState(), reply.id)?.replyToMessageId).toBe(ownMessage)
    expect(selectMessageById(store.getState(), ownMessage)).toMatchObject({
      reactions: expect.arrayContaining([expect.objectContaining({ emoji: '🙌' })]) as unknown,
    })
  })

  it('shows no quote on a deleted reply, while keeping the link', async () => {
    const { reply, store, user } = await renderWithReply()

    await confirmDelete(user, 'My reply')

    const deleted = bubble('You deleted this message')
    expect(deleted).not.toHaveTextContent(OWN_TEXT)
    expect(selectMessageById(store.getState(), reply.id)?.replyToMessageId).toBe(ownMessage)
  })

  it('cancels a reply in progress when its target is deleted', async () => {
    const { store, user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Reply')
    await screen.findByText('Replying to You')

    await confirmDelete(user, OWN_TEXT)

    expect(selectComposerTarget(store.getState())).toBeNull()
    expect(screen.queryByText('Replying to You')).not.toBeInTheDocument()
  })

  it('cancels an edit in progress when that message is deleted', async () => {
    const { user } = await renderChat()
    await chooseAction(user, OWN_TEXT, 'Edit')
    await screen.findByText('Editing message')

    await confirmDelete(user, OWN_TEXT)

    expect(screen.queryByText('Editing message')).not.toBeInTheDocument()
    expect(input()).toHaveValue('')
  })
})

describe('date groups', () => {
  it('puts one divider above each day, and none between same-day messages', async () => {
    await renderChat()
    const items = within(log()).getAllByRole('listitem')
    const withDivider = items.filter((item) => item.querySelector('div > span.rounded-pill'))

    expect(withDivider).toHaveLength(2)
    expect(items[0]).toBe(withDivider[0])
    expect(items[4]).toBe(withDivider[1])
    expect(items[4]).toHaveTextContent('Today')
  })
})

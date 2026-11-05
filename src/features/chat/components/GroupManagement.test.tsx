import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { bootstrapApp } from '@/app/bootstrap'
import {
  conversationSelected,
  openConversation,
  selectConversationById,
  selectParticipants,
} from '@/features/conversations'
import { selectThreadMessageIds } from '@/features/messages'
import { selectIsDetailsPanelOpen } from '@/features/ui'
import { createMockSeed } from '@/services/mock-api/seed'
import { renderWithProviders } from '@/test/render'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toUserId, type ConversationId } from '@/types/ids'
import { ChatWindow } from './ChatWindow'

const rohan = toConversationId('conversation-rohan')
const launch = toConversationId('conversation-launch')
const trek = toConversationId('conversation-trek')
const flat = toConversationId('conversation-flat')

async function renderPanel(
  conversationId: ConversationId,
  options: Parameters<typeof createTestStore>[0] = {},
) {
  const context = createTestStore(options)
  await context.store.dispatch(bootstrapApp())
  await context.store.dispatch(openConversation(conversationId))
  renderWithProviders(<ChatWindow />, { store: context.store })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Group info' }))
  return { ...context, panel: await screen.findByRole('dialog', { name: 'Group info' }), user }
}

const memberRow = (panel: HTMLElement, name: RegExp) =>
  within(panel).getByText(name).closest('li') as HTMLElement
const memberNames = (panel: HTMLElement) =>
  within(within(panel).getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent)
const addButton = (panel: HTMLElement) => within(panel).getByRole('button', { name: 'Add members' })

async function confirmRemoval(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: `Remove ${name}` }))
  const dialog = await screen.findByRole('dialog', { name: `Remove ${name}?` })
  await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: `Remove ${name}?` })).not.toBeInTheDocument()
  })
}

describe('opening the panel', () => {
  it('is offered for groups only', async () => {
    const { store } = createTestStore()
    await store.dispatch(bootstrapApp())
    await store.dispatch(openConversation(rohan))
    renderWithProviders(<ChatWindow />, { store })

    expect(screen.queryByRole('button', { name: 'Group info' })).not.toBeInTheDocument()
  })

  it('closes with Escape, the close button, and returns focus', async () => {
    const { store, user } = await renderPanel(launch)

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(selectIsDetailsPanelOpen(store.getState())).toBe(false)
    expect(screen.getByRole('button', { name: 'Group info' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Group info' }))
    await user.click(await screen.findByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes when the conversation changes', async () => {
    const { store } = await renderPanel(launch)

    store.dispatch(conversationSelected(trek))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('sits on top of the same chat components', async () => {
    const { store } = await renderPanel(launch)

    expect(selectThreadMessageIds(store.getState(), launch).length).toBeGreaterThan(0)
    expect(screen.getByRole('log', { hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { hidden: true, name: 'Message' })).toBeInTheDocument()
  })
})

describe('group details', () => {
  it('shows the name, description and group icon', async () => {
    const { panel } = await renderPanel(launch)

    expect(within(panel).getByRole('heading', { name: 'Launch Crew' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('Everything for the Northwind mobile launch on the 14th.')
    expect(panel.querySelector('.lucide-users')).toBeInTheDocument()
  })

  it('says so when there is no description', async () => {
    const { panel } = await renderPanel(flat)

    expect(panel).toHaveTextContent('No description')
  })

  it('shows who created the group, and when', async () => {
    const owned = await renderPanel(launch)
    expect(owned.panel).toHaveTextContent(/Created by you on .*2026/)
  })

  it('names another person as creator', async () => {
    const { panel } = await renderPanel(trek)

    expect(panel).toHaveTextContent(/Created by Sara Thomas on /)
  })
})

describe('member list', () => {
  it('lists the owner, then admins, then members by name', async () => {
    const { panel } = await renderPanel(launch)

    expect(memberNames(panel)).toEqual([
      'Maya Iyer (you)',
      'Ananya Rao',
      'Arjun Menon',
      'Dev Malhotra',
      'Priya Nair',
    ])
    expect(panel).toHaveTextContent('5 members')
  })

  it('shows roles', async () => {
    const { panel } = await renderPanel(launch)

    expect(memberRow(panel, /Maya Iyer/)).toHaveTextContent('Owner')
    expect(memberRow(panel, /Ananya Rao/)).toHaveTextContent('Admin')
    expect(memberRow(panel, /Priya Nair/)).not.toHaveTextContent('Admin')
  })

  it('states online and offline status in words', async () => {
    const { panel } = await renderPanel(launch)

    expect(memberRow(panel, /Priya Nair/)).toHaveTextContent('Online')
    expect(memberRow(panel, /Arjun Menon/)).toHaveTextContent('Last seen')
  })
})

describe('permissions', () => {
  it('lets an owner manage everyone but themselves', async () => {
    const { panel } = await renderPanel(launch)

    expect(addButton(panel)).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Remove Ananya Rao' })).toBeInTheDocument()
    expect(within(memberRow(panel, /Maya Iyer/)).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a regular member no management controls', async () => {
    const { panel } = await renderPanel(trek)

    expect(within(panel).queryByRole('button', { name: 'Add members' })).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
  })

  it('lets an admin manage members but not the owner', async () => {
    const seed = createMockSeed(TEST_NOW)
    const { panel } = await renderPanel(trek, {
      seed: {
        ...seed,
        participants: seed.participants.map((participant) =>
          participant.conversationId === trek && participant.userId === toUserId('user-maya')
            ? { ...participant, role: 'admin' }
            : participant,
        ),
      },
    })

    expect(addButton(panel)).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Remove Rohan Desai' })).toBeInTheDocument()
    expect(
      within(panel).queryByRole('button', { name: 'Remove Sara Thomas' }),
    ).not.toBeInTheDocument()
    expect(within(memberRow(panel, /Maya Iyer/)).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('adding members', () => {
  it('offers only people outside the group, and requires a choice', async () => {
    const { panel, user } = await renderPanel(launch)

    await user.click(addButton(panel))

    const boxes = within(panel).getAllByRole('checkbox')
    expect(boxes).toHaveLength(5)
    expect(within(panel).queryByRole('checkbox', { name: 'Priya Nair' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(boxes[0]).toHaveFocus()
  })

  it('adds one person everywhere that shows membership', async () => {
    const { panel, store, user } = await renderPanel(launch)
    await user.click(addButton(panel))

    await user.click(within(panel).getByRole('checkbox', { name: 'Sara Thomas' }))
    await user.click(within(panel).getByRole('button', { name: 'Add' }))

    await within(panel).findByText('Sara Thomas')
    expect(panel).toHaveTextContent('6 members')
    expect(screen.getByRole('banner', { hidden: true })).toHaveTextContent('6 members')
    expect(selectConversationById(store.getState(), launch)?.participantIds).toContain(
      toUserId('user-sara'),
    )
    expect(selectParticipants(store.getState(), launch)).toHaveLength(6)
    await waitFor(() => {
      expect(addButton(panel)).toHaveFocus()
    })
  })

  it('adds several people at once', async () => {
    const { panel, user } = await renderPanel(launch)
    await user.click(addButton(panel))

    await user.click(within(panel).getByRole('checkbox', { name: 'Sara Thomas' }))
    await user.click(within(panel).getByRole('checkbox', { name: 'Rohan Desai' }))
    await user.click(within(panel).getByRole('button', { name: 'Add 2 people' }))

    await within(panel).findByText('Rohan Desai')
    expect(panel).toHaveTextContent('7 members')
  })

  it('can be cancelled', async () => {
    const { panel, store, user } = await renderPanel(launch)
    await user.click(addButton(panel))
    await user.click(within(panel).getByRole('checkbox', { name: 'Sara Thomas' }))

    await user.click(within(panel).getByRole('button', { name: 'Cancel' }))

    expect(selectParticipants(store.getState(), launch)).toHaveLength(5)
    expect(memberNames(panel)).toHaveLength(5)
  })

  it('keeps the choice and explains when adding fails', async () => {
    const { api, panel, user } = await renderPanel(launch)
    await user.click(addButton(panel))
    await user.click(within(panel).getByRole('checkbox', { name: 'Sara Thomas' }))
    api.failNextRequest()

    await user.click(within(panel).getByRole('button', { name: 'Add' }))

    expect(await within(panel).findByRole('alert')).toHaveTextContent('Check your connection')
    expect(within(panel).getByRole('checkbox', { name: 'Sara Thomas' })).toBeChecked()
  })

  it('says when there is nobody left to add', async () => {
    const seed = createMockSeed(TEST_NOW)
    const { panel, user } = await renderPanel(launch, {
      seed: {
        ...seed,
        users: seed.users.filter(({ id }) =>
          ['user-maya', 'user-ananya', 'user-priya', 'user-arjun', 'user-dev'].includes(id),
        ),
      },
    })

    await user.click(addButton(panel))

    expect(panel).toHaveTextContent('Everyone you know is already in this group.')
    await user.click(within(panel).getByRole('button', { name: 'Back to members' }))
    expect(memberNames(panel)).toHaveLength(5)
  })
})

describe('removing members', () => {
  it('asks first, and cancelling keeps the member and focus', async () => {
    const { panel, store, user } = await renderPanel(launch)
    const button = within(panel).getByRole('button', { name: 'Remove Priya Nair' })

    await user.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Remove Priya Nair?' })
    expect(dialog).toHaveTextContent('Their earlier messages stay in the chat')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Remove Priya Nair?' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: 'Group info' })).toBeInTheDocument()
    expect(selectParticipants(store.getState(), launch)).toHaveLength(5)
    await waitFor(() => {
      expect(button).toHaveFocus()
    })
  })

  it('removes the member everywhere, and keeps their messages', async () => {
    const { panel, store, user } = await renderPanel(launch)
    const messages = selectThreadMessageIds(store.getState(), launch)

    await confirmRemoval(user, 'Priya Nair')

    expect(within(panel).queryByText('Priya Nair')).not.toBeInTheDocument()
    expect(panel).toHaveTextContent('4 members')
    expect(screen.getByRole('banner', { hidden: true })).toHaveTextContent('4 members')
    expect(selectThreadMessageIds(store.getState(), launch)).toEqual(messages)
    await waitFor(() => {
      expect(addButton(panel)).toHaveFocus()
    })
  })

  it('stays open and explains when removal fails', async () => {
    const { api, store, user } = await renderPanel(launch)
    await user.click(screen.getByRole('button', { name: 'Remove Priya Nair' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Priya Nair?' })
    api.failNextRequest()

    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Check your connection')
    expect(selectParticipants(store.getState(), launch)).toHaveLength(5)
  })

  it('offers a removed person for adding back', async () => {
    const { panel, user } = await renderPanel(launch)

    await confirmRemoval(user, 'Priya Nair')
    await user.click(addButton(panel))

    expect(within(panel).getByRole('checkbox', { name: 'Priya Nair' })).toBeInTheDocument()
  })
})

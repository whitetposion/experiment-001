import { describe, expect, it } from 'vitest'
import {
  fetchMessages,
  messageReceived,
  deleteMessage,
  editMessage,
  selectThreadMessageIds,
  sendMessage,
} from '@/features/messages'
import { fetchDirectory, presenceChanged, typingStarted } from '@/features/presence'
import { TEST_NOW, createTestStore } from '@/test/store'
import { toConversationId, toMessageId, toUserId, type ConversationId } from '@/types/ids'
import type { ActiveMessage } from '@/types/message'
import {
  selectAllConversations,
  selectCanManageMembers,
  selectConversationById,
  selectConversationPreview,
  selectConversationsError,
  selectConversationsStatus,
  selectConversationTitle,
  selectIsDirectContactOnline,
  selectParticipants,
  selectSelectedConversation,
  selectSelectedConversationId,
  selectTotalUnreadCount,
  selectUnreadCount,
  selectVisibleConversationIds,
} from './selectors'
import { conversationSelected, filterChanged, searchQueryChanged } from './slice'
import {
  addGroupMembers,
  fetchConversations,
  markConversationRead,
  removeGroupMember,
} from './thunks'
import { leaveGroup, openConversation } from './workflows'

const rohan = toConversationId('conversation-rohan')
const priya = toConversationId('conversation-priya')
const kabir = toConversationId('conversation-kabir')
const empty = toConversationId('conversation-vikram')
const launch = toConversationId('conversation-launch')
const trek = toConversationId('conversation-trek')

async function loaded() {
  const context = createTestStore()
  await context.store.dispatch(fetchDirectory())
  await context.store.dispatch(fetchConversations())
  return context
}

function incoming(conversationId: ConversationId, id: string, createdAt = TEST_NOW): ActiveMessage {
  return {
    id: toMessageId(id),
    conversationId,
    senderId: toUserId('user-rohan'),
    createdAt: createdAt.toISOString(),
    replyToMessageId: null,
    deliveryStatus: 'delivered',
    state: 'active',
    text: 'Incoming',
    editedAt: null,
    reactions: [],
    attachments: [],
  }
}

describe('loading', () => {
  it('stores direct and group conversations together, most recent first', async () => {
    const { store } = await loaded()
    const conversations = selectAllConversations(store.getState())
    const times = conversations.map(({ updatedAt }) => updatedAt)

    expect(selectConversationsStatus(store.getState())).toBe('succeeded')
    expect(new Set(conversations.map(({ type }) => type))).toEqual(new Set(['direct', 'group']))
    expect(times).toEqual(times.toSorted().reverse())
  })

  it('records a failure', async () => {
    const { api, store } = createTestStore()
    api.failNextRequest()

    await store.dispatch(fetchConversations())

    expect(selectConversationsStatus(store.getState())).toBe('failed')
    expect(selectConversationsError(store.getState())?.code).toBe('network')
  })

  it('has every preview available as soon as conversations load', async () => {
    const { store } = await loaded()

    for (const { id, lastMessageId } of selectAllConversations(store.getState())) {
      expect(selectConversationPreview(store.getState(), id) === null).toBe(!lastMessageId)
    }
  })
})

describe('selection, search and filters', () => {
  it('selects and clears a conversation', async () => {
    const { store } = await loaded()

    store.dispatch(conversationSelected(trek))
    expect(selectSelectedConversation(store.getState())?.id).toBe(trek)

    store.dispatch(conversationSelected(null))
    expect(selectSelectedConversation(store.getState())).toBeUndefined()
  })

  it('filters by unread and groups', async () => {
    const { store } = await loaded()

    store.dispatch(filterChanged('unread'))
    expect(new Set(selectVisibleConversationIds(store.getState()))).toEqual(
      new Set([launch, rohan, trek]),
    )

    store.dispatch(filterChanged('groups'))
    const groups = selectVisibleConversationIds(store.getState())
    expect(groups).toHaveLength(3)
    expect(groups).toContain(launch)

    store.dispatch(filterChanged('all'))
    expect(selectVisibleConversationIds(store.getState())).toHaveLength(9)
  })

  it('searches group names and direct contact names, ignoring case and spaces', async () => {
    const { store } = await loaded()

    store.dispatch(searchQueryChanged('  LAUNCH '))
    expect(selectVisibleConversationIds(store.getState())).toEqual([launch])

    store.dispatch(searchQueryChanged('rohan'))
    expect(selectVisibleConversationIds(store.getState())).toEqual([rohan])

    store.dispatch(searchQueryChanged('nothing matches this'))
    expect(selectVisibleConversationIds(store.getState())).toEqual([])
  })

  it('combines search with a filter', async () => {
    const { store } = await loaded()

    store.dispatch(filterChanged('groups'))
    store.dispatch(searchQueryChanged('rohan'))

    expect(selectVisibleConversationIds(store.getState())).toEqual([])
  })
})

describe('derived data', () => {
  it('titles a group by its name and a direct conversation by the other person', async () => {
    const { store } = await loaded()

    expect(selectConversationTitle(store.getState(), launch)).toBe('Launch Crew')
    expect(selectConversationTitle(store.getState(), rohan)).toBe('Rohan Desai')
  })

  it('shows a fallback title before people have loaded', async () => {
    const { store } = createTestStore()
    await store.dispatch(fetchConversations())

    expect(selectConversationTitle(store.getState(), rohan)).toBe('Unknown contact')
  })

  it('adds up unread counts', async () => {
    const { store } = await loaded()

    expect(selectTotalUnreadCount(store.getState())).toBe(6)
  })

  it('labels previews by who sent them', async () => {
    const { store } = await loaded()

    expect(selectConversationPreview(store.getState(), rohan)).toMatchObject({
      senderLabel: null,
      deliveryStatus: null,
    })
    expect(selectConversationPreview(store.getState(), launch)).toMatchObject({
      senderLabel: 'Dev',
      text: 'I will bring the test devices',
    })
    expect(selectConversationPreview(store.getState(), priya)).toMatchObject({
      senderLabel: 'You',
      deliveryStatus: 'read',
    })
  })

  it('describes a deleted last message without its text', async () => {
    const { store } = await loaded()

    expect(selectConversationPreview(store.getState(), kabir)).toMatchObject({
      text: 'You deleted this message',
      isDeleted: true,
      senderLabel: null,
    })
  })

  it('has no preview for an empty conversation', async () => {
    const { store } = await loaded()

    expect(selectConversationPreview(store.getState(), empty)).toBeNull()
  })

  it('updates the preview from an edit or delete, with no conversation change', async () => {
    const { store } = await loaded()
    const messageId = toMessageId('message-priya-4')
    const conversation = selectConversationById(store.getState(), priya)

    await store.dispatch(editMessage({ messageId, text: 'Edited text' }))
    expect(selectConversationPreview(store.getState(), priya)?.text).toBe('Edited text')

    await store.dispatch(deleteMessage(messageId))
    expect(selectConversationPreview(store.getState(), priya)?.isDeleted).toBe(true)
    expect(selectConversationById(store.getState(), priya)).toBe(conversation)
  })

  it('reports presence for direct conversations only', async () => {
    const { store } = await loaded()

    expect(selectIsDirectContactOnline(store.getState(), rohan)).toBe(true)
    expect(selectIsDirectContactOnline(store.getState(), kabir)).toBe(false)
    expect(selectIsDirectContactOnline(store.getState(), launch)).toBe(false)
  })

  it('knows who can manage members', async () => {
    const { store } = await loaded()

    expect(selectCanManageMembers(store.getState(), launch)).toBe(true)
    expect(selectCanManageMembers(store.getState(), trek)).toBe(false)
    expect(selectCanManageMembers(store.getState(), rohan)).toBe(false)
  })
})

describe('reacting to messages', () => {
  it('moves a conversation to the top when the user sends a message', async () => {
    const { store } = await loaded()

    const sent = await store.dispatch(sendMessage({ conversationId: empty, text: 'Hi' })).unwrap()

    expect(selectVisibleConversationIds(store.getState())[0]).toBe(empty)
    expect(selectConversationById(store.getState(), empty)?.lastMessageId).toBe(sent.id)
  })

  it('counts an incoming message as unread in a closed conversation', async () => {
    const { store } = await loaded()

    store.dispatch(messageReceived(incoming(priya, 'message-new')))

    expect(selectVisibleConversationIds(store.getState())[0]).toBe(priya)
    expect(selectConversationById(store.getState(), priya)?.unread).toEqual({
      count: 1,
      firstUnreadMessageId: 'message-new',
    })
  })

  it('keeps the first unread position as more messages arrive', async () => {
    const { store } = await loaded()

    store.dispatch(messageReceived(incoming(priya, 'message-a')))
    store.dispatch(messageReceived(incoming(priya, 'message-b')))

    expect(selectConversationById(store.getState(), priya)?.unread).toEqual({
      count: 2,
      firstUnreadMessageId: 'message-a',
    })
  })

  it('does not count an incoming message in the open conversation', async () => {
    const { store } = await loaded()
    store.dispatch(conversationSelected(priya))

    store.dispatch(messageReceived(incoming(priya, 'message-new')))

    expect(selectUnreadCount(store.getState(), priya)).toBe(0)
    expect(selectConversationById(store.getState(), priya)?.lastMessageId).toBe('message-new')
  })

  it('ignores a message for a conversation it does not know', async () => {
    const { store } = await loaded()
    const before = store.getState().conversations

    store.dispatch(messageReceived(incoming(toConversationId('missing'), 'message-new')))

    expect(store.getState().conversations).toBe(before)
  })
})

describe('opening a conversation', () => {
  it('selects it, loads its messages and clears unread', async () => {
    const { store } = await loaded()

    await store.dispatch(openConversation(rohan))

    expect(selectSelectedConversationId(store.getState())).toBe(rohan)
    expect(selectThreadMessageIds(store.getState(), rohan)).toHaveLength(6)
    expect(selectUnreadCount(store.getState(), rohan)).toBe(0)
  })

  it('does not reload a thread it already has', async () => {
    const { api, store } = await loaded()
    await store.dispatch(openConversation(rohan))
    api.failNextRequest()

    await store.dispatch(openConversation(rohan))

    expect(selectThreadMessageIds(store.getState(), rohan)).toHaveLength(6)
  })

  it('retries a thread that failed to load', async () => {
    const { api, store } = await loaded()
    api.failNextRequest()
    await store.dispatch(fetchMessages({ conversationId: priya }))

    await store.dispatch(openConversation(priya))

    expect(selectThreadMessageIds(store.getState(), priya)).toHaveLength(4)
  })

  it('does not lose a newer message to a slower read response', async () => {
    const { store } = await loaded()
    const read = store.dispatch(markConversationRead(rohan))
    store.dispatch(messageReceived(incoming(rohan, 'message-newer')))

    await read

    expect(selectConversationById(store.getState(), rohan)?.lastMessageId).toBe('message-newer')
  })
})

describe('group members', () => {
  const sara = toUserId('user-sara')
  const ananya = toUserId('user-ananya')

  it('updates the shared conversation and its participants together', async () => {
    const { store } = await loaded()

    await store.dispatch(addGroupMembers({ conversationId: launch, userIds: [sara] }))

    const members = selectParticipants(store.getState(), launch).map(({ userId }) => userId)
    expect(selectConversationById(store.getState(), launch)?.participantIds).toEqual(members)
    expect(members).toContain(sara)
  })

  it('removes a member from both places', async () => {
    const { store } = await loaded()

    await store.dispatch(removeGroupMember({ conversationId: launch, userId: ananya }))

    const members = selectParticipants(store.getState(), launch).map(({ userId }) => userId)
    expect(members).not.toContain(ananya)
    expect(selectConversationById(store.getState(), launch)?.participantIds).toEqual(members)
  })

  it('leaves other conversations alone', async () => {
    const { store } = await loaded()
    const before = selectParticipants(store.getState(), trek)

    await store.dispatch(removeGroupMember({ conversationId: launch, userId: ananya }))

    expect(selectParticipants(store.getState(), trek)).toEqual(before)
  })

  it('leaves state unchanged when the request is refused', async () => {
    const { store } = await loaded()
    const before = store.getState().conversations

    await store.dispatch(addGroupMembers({ conversationId: trek, userIds: [toUserId('user-dev')] }))

    expect(store.getState().conversations).toBe(before)
  })

  it('removes the conversation and selection after leaving', async () => {
    const { store } = await loaded()
    store.dispatch(conversationSelected(trek))

    await store.dispatch(leaveGroup(trek))

    expect(selectConversationById(store.getState(), trek)).toBeUndefined()
    expect(selectSelectedConversationId(store.getState())).toBeNull()
    expect(selectParticipants(store.getState(), trek)).toEqual([])
  })

  it('reports why leaving failed and keeps the group', async () => {
    const { store } = await loaded()

    await expect(store.dispatch(leaveGroup(launch))).rejects.toMatchObject({ code: 'conflict' })
    expect(selectConversationById(store.getState(), launch)).toBeDefined()
  })
})

describe('selector stability', () => {
  const typing = {
    conversationId: rohan,
    userId: toUserId('user-rohan'),
    startedAt: TEST_NOW.toISOString(),
    expiresAt: TEST_NOW.toISOString(),
  }

  it('keeps the visible IDs when something unrelated changes', async () => {
    const { store } = await loaded()
    const before = selectVisibleConversationIds(store.getState())

    store.dispatch(typingStarted(typing))
    store.dispatch(
      presenceChanged({ userId: toUserId('user-rohan'), status: 'offline', lastSeenAt: null }),
    )

    expect(selectVisibleConversationIds(store.getState())).toBe(before)
  })

  it('keeps the visible IDs when a conversation changes without moving', async () => {
    const { store } = await loaded()
    const before = selectVisibleConversationIds(store.getState())

    await store.dispatch(markConversationRead(priya))
    await store.dispatch(markConversationRead(rohan))

    expect(selectVisibleConversationIds(store.getState())).toBe(before)
  })

  it('returns new visible IDs when the order changes', async () => {
    const { store } = await loaded()
    const before = selectVisibleConversationIds(store.getState())

    store.dispatch(messageReceived(incoming(priya, 'message-new')))

    expect(selectVisibleConversationIds(store.getState())).not.toBe(before)
  })

  it('keeps each preview when another conversation changes', async () => {
    const { store } = await loaded()
    const before = selectConversationPreview(store.getState(), rohan)

    store.dispatch(messageReceived(incoming(priya, 'message-new')))

    expect(selectConversationPreview(store.getState(), rohan)).toBe(before)
  })

  it('keeps participants when another conversation changes', async () => {
    const { store } = await loaded()
    const before = selectParticipants(store.getState(), trek)

    await store.dispatch(markConversationRead(rohan))

    expect(selectParticipants(store.getState(), trek)).toBe(before)
  })
})

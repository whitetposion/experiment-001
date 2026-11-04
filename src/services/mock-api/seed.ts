import type { Conversation, ConversationParticipant, ParticipantRole } from '@/types/conversation'
import {
  toConversationId,
  toMessageId,
  toUserId,
  type ConversationId,
  type IsoTimestamp,
  type MessageId,
  type UserId,
} from '@/types/ids'
import type { Message, MessageDeliveryStatus, MessageReaction } from '@/types/message'
import type { UserPresence } from '@/types/presence'
import type { User } from '@/types/user'

export interface MockSeed {
  readonly currentUserId: UserId
  readonly users: readonly User[]
  readonly presence: readonly UserPresence[]
  readonly conversations: readonly Conversation[]
  readonly participants: readonly ConversationParticipant[]
  readonly messages: readonly Message[]
}

const HOUR = 60
const DAY = 24 * HOUR

const USERS = {
  maya: { displayName: 'Maya Iyer', about: 'Product designer. Coffee first.' },
  rohan: { displayName: 'Rohan Desai', about: 'Probably on a run.' },
  priya: { displayName: 'Priya Nair', about: 'Frontend engineer' },
  kabir: { displayName: 'Kabir Shah', about: null },
  ananya: { displayName: 'Ananya Rao', about: 'Product manager at Northwind' },
  vikram: { displayName: 'Vikram Joshi', about: 'Available' },
  sara: { displayName: 'Sara Thomas', about: 'Photographer' },
  dev: { displayName: 'Dev Malhotra', about: 'At the gym' },
  neha: { displayName: 'Neha Kapoor', about: null },
  arjun: { displayName: 'Arjun Menon', about: 'Backend engineer' },
} as const

type UserKey = keyof typeof USERS

const CURRENT_USER: UserKey = 'maya'

/** Minutes since each user was last seen. Zero means online now. */
const LAST_SEEN: Record<UserKey, number> = {
  maya: 0,
  rohan: 0,
  priya: 0,
  kabir: 3 * HOUR,
  ananya: 0,
  vikram: 2 * DAY,
  sara: 25,
  dev: 0,
  neha: 9 * HOUR,
  arjun: 40,
}

interface Line {
  from: UserKey
  minutesAgo: number
  text: string
  /** The 1-based position of the replied-to line in the same script. */
  replyTo?: number
  editedMinutesAgo?: number
  deletedMinutesAgo?: number
  reactions?: readonly (readonly [UserKey, string])[]
  status?: MessageDeliveryStatus
}

interface ScriptBase {
  key: string
  creator: UserKey
  createdDaysAgo: number
  /** How many of the latest lines the current user has not read. */
  unread?: number
  lines: readonly Line[]
}

interface DirectScript extends ScriptBase {
  type: 'direct'
  members: readonly [UserKey, UserKey]
}

interface GroupScript extends ScriptBase {
  type: 'group'
  members: readonly UserKey[]
  admins: readonly UserKey[]
  name: string
  description: string | null
}

const SCRIPTS: readonly (DirectScript | GroupScript)[] = [
  {
    key: 'rohan',
    type: 'direct',
    members: ['maya', 'rohan'],
    creator: 'rohan',
    createdDaysAgo: 60,
    unread: 2,
    lines: [
      { from: 'rohan', minutesAgo: 2 * DAY + 40, text: 'Are you doing the 10k on Sunday?' },
      { from: 'maya', minutesAgo: 2 * DAY + 32, text: 'Thinking about it. My knee is still sore.' },
      { from: 'rohan', minutesAgo: 2 * DAY + 30, text: 'We can do the 5k instead, no pressure' },
      {
        from: 'maya',
        minutesAgo: 2 * DAY + 12,
        text: 'Deal. 5k it is',
        reactions: [['rohan', '🙌']],
      },
      { from: 'rohan', minutesAgo: 22, text: 'Registration closes tonight, by the way' },
      { from: 'rohan', minutesAgo: 21, text: 'Want me to sign us both up?' },
    ],
  },
  {
    key: 'launch',
    type: 'group',
    name: 'Launch Crew',
    description: 'Everything for the Northwind mobile launch on the 14th.',
    members: ['maya', 'ananya', 'priya', 'arjun', 'dev'],
    admins: ['ananya'],
    creator: 'maya',
    createdDaysAgo: 21,
    unread: 3,
    lines: [
      {
        from: 'ananya',
        minutesAgo: 3 * DAY + 300,
        text: 'Morning all. Two weeks to launch, so here is where we stand.',
      },
      {
        from: 'ananya',
        minutesAgo: 3 * DAY + 298,
        text: 'Onboarding is done, payments are in review, notifications are still open.',
      },
      { from: 'arjun', minutesAgo: 3 * DAY + 280, text: 'Payments review should finish tomorrow' },
      {
        from: 'priya',
        minutesAgo: 3 * DAY + 274,
        text: 'Notifications are blocked on the final copy',
      },
      { from: 'maya', minutesAgo: 3 * DAY + 260, text: 'I can get copy to you by end of day' },
      {
        from: 'priya',
        minutesAgo: 3 * DAY + 255,
        text: 'Perfect, thank you',
        reactions: [['maya', '👍']],
      },
      { from: 'dev', minutesAgo: 3 * DAY + 200, text: 'QA build is up on the staging link' },
      {
        from: 'dev',
        minutesAgo: 3 * DAY + 198,
        text: 'Found one crash on older Android versions, looking at it now',
      },
      { from: 'arjun', minutesAgo: 3 * DAY + 180, text: 'Is that the image picker one?' },
      { from: 'dev', minutesAgo: 3 * DAY + 176, text: 'Yes, same stack trace', replyTo: 9 },
      { from: 'priya', minutesAgo: 3 * DAY + 90, text: 'I have a fix. PR is up.' },
      {
        from: 'dev',
        minutesAgo: 3 * DAY + 60,
        text: 'Confirmed, no more crash',
        reactions: [
          ['priya', '🎉'],
          ['ananya', '🎉'],
        ],
      },
      { from: 'maya', minutesAgo: 2 * DAY + 400, text: 'Notification copy is in the shared doc' },
      { from: 'priya', minutesAgo: 2 * DAY + 380, text: 'Got it, wiring it up today' },
      {
        from: 'ananya',
        minutesAgo: 2 * DAY + 300,
        text: 'Marketing wants final screenshots by Thursday',
      },
      {
        from: 'maya',
        minutesAgo: 2 * DAY + 290,
        text: 'Which device sizes do they need?',
        editedMinutesAgo: 2 * DAY + 288,
      },
      {
        from: 'ananya',
        minutesAgo: 2 * DAY + 284,
        text: '6.7 inch and 5.5 inch for the store listing',
      },
      { from: 'maya', minutesAgo: 2 * DAY + 270, text: 'I will export both from the design file' },
      {
        from: 'arjun',
        minutesAgo: 2 * DAY + 120,
        text: 'Payments passed review',
        reactions: [
          ['ananya', '🚀'],
          ['maya', '🚀'],
          ['dev', '🚀'],
        ],
      },
      { from: 'ananya', minutesAgo: 2 * DAY + 110, text: 'That was the big one. Nice work.' },
      { from: 'dev', minutesAgo: 1 * DAY + 500, text: 'Regression run is at 92 percent passing' },
      {
        from: 'dev',
        minutesAgo: 1 * DAY + 498,
        text: 'The remaining failures are all in the settings screen',
      },
      { from: 'priya', minutesAgo: 1 * DAY + 470, text: 'That is my area, I will take them' },
      { from: 'maya', minutesAgo: 1 * DAY + 400, text: 'Screenshots are uploaded for both sizes' },
      {
        from: 'ananya',
        minutesAgo: 1 * DAY + 390,
        text: 'Thanks Maya, sending them over',
        replyTo: 24,
      },
      {
        from: 'arjun',
        minutesAgo: 1 * DAY + 200,
        text: 'Heads up, the staging database restarts at 6',
      },
      { from: 'priya', minutesAgo: 1 * DAY + 120, text: 'Settings fixes are merged' },
      {
        from: 'dev',
        minutesAgo: 1 * DAY + 60,
        text: 'Rerun is at 100 percent',
        reactions: [
          ['maya', '🎉'],
          ['priya', '❤️'],
        ],
      },
      { from: 'ananya', minutesAgo: 8 * HOUR, text: 'Release candidate goes out tomorrow morning' },
      { from: 'maya', minutesAgo: 7 * HOUR, text: 'Can we do a quick walkthrough before it goes?' },
      { from: 'ananya', minutesAgo: 6 * HOUR, text: 'Good idea. 10:30 in the design room?' },
      { from: 'priya', minutesAgo: 95, text: 'Works for me' },
      { from: 'arjun', minutesAgo: 80, text: 'Same here' },
      {
        from: 'dev',
        minutesAgo: 12,
        text: 'I will bring the test devices',
        reactions: [['priya', '👍']],
      },
    ],
  },
  {
    key: 'priya',
    type: 'direct',
    members: ['maya', 'priya'],
    creator: 'maya',
    createdDaysAgo: 120,
    lines: [
      { from: 'priya', minutesAgo: 5 * HOUR, text: 'Is the new icon set final?' },
      {
        from: 'maya',
        minutesAgo: 4 * HOUR + 50,
        text: 'Almost. The search icon still needs work.',
      },
      { from: 'priya', minutesAgo: 4 * HOUR + 45, text: 'No rush, I can use the old one for now' },
      {
        from: 'maya',
        minutesAgo: 3 * HOUR,
        text: 'Done, it is in the Figma library',
        reactions: [['priya', '❤️']],
      },
    ],
  },
  {
    key: 'trek',
    type: 'group',
    name: 'Weekend Trek',
    description: 'Lohagad, Saturday. Leaving at 5:30 sharp.',
    members: ['sara', 'maya', 'rohan', 'neha', 'kabir'],
    admins: [],
    creator: 'sara',
    createdDaysAgo: 9,
    unread: 1,
    lines: [
      { from: 'sara', minutesAgo: 1 * DAY + 200, text: 'Who is confirmed for Saturday?' },
      { from: 'rohan', minutesAgo: 1 * DAY + 180, text: 'Me' },
      { from: 'maya', minutesAgo: 1 * DAY + 170, text: 'Me too' },
      {
        from: 'neha',
        minutesAgo: 1 * DAY + 90,
        text: 'I can drive if someone shares fuel',
        reactions: [
          ['sara', '🙌'],
          ['maya', '👍'],
        ],
      },
      { from: 'kabir', minutesAgo: 1 * DAY + 80, text: 'Happy to split it' },
      {
        from: 'maya',
        minutesAgo: 1 * DAY + 40,
        text: 'Should we start earlier to beat the heat?',
        deletedMinutesAgo: 1 * DAY + 38,
      },
      {
        from: 'sara',
        minutesAgo: 1 * DAY + 20,
        text: 'Packing list: water, torch, and proper shoes please',
      },
      {
        from: 'rohan',
        minutesAgo: 1 * DAY + 10,
        text: 'Torch at 5:30 in the morning, fair',
        replyTo: 7,
      },
      { from: 'sara', minutesAgo: 47, text: 'Rain is forecast, so bring a jacket as well' },
    ],
  },
  {
    key: 'ananya',
    type: 'direct',
    members: ['maya', 'ananya'],
    creator: 'ananya',
    createdDaysAgo: 34,
    lines: [
      { from: 'ananya', minutesAgo: 1 * DAY + 300, text: 'Can you review the pricing page today?' },
      { from: 'maya', minutesAgo: 1 * DAY + 280, text: 'Sure. Is the annual toggle staying?' },
      {
        from: 'ananya',
        minutesAgo: 1 * DAY + 275,
        text: 'Yes, and it should default to annual',
        editedMinutesAgo: 1 * DAY + 274,
      },
      {
        from: 'maya',
        minutesAgo: 1 * DAY + 200,
        text: 'Left my comments in the doc',
        status: 'delivered',
      },
    ],
  },
  {
    key: 'flat',
    type: 'group',
    name: 'Flat 4B',
    description: null,
    members: ['neha', 'maya', 'sara'],
    admins: [],
    creator: 'neha',
    createdDaysAgo: 200,
    lines: [
      { from: 'neha', minutesAgo: 3 * DAY, text: 'Electricity bill is due on Friday' },
      { from: 'sara', minutesAgo: 3 * DAY - 30, text: 'Paid it, I will share the amount' },
      { from: 'maya', minutesAgo: 2 * DAY + 600, text: 'Thanks, sending my share now' },
      {
        from: 'neha',
        minutesAgo: 2 * DAY + 590,
        text: 'Also the plumber is coming at 11 tomorrow',
        reactions: [
          ['maya', '👍'],
          ['sara', '👍'],
        ],
      },
    ],
  },
  {
    key: 'kabir',
    type: 'direct',
    members: ['maya', 'kabir'],
    creator: 'kabir',
    createdDaysAgo: 15,
    lines: [
      {
        from: 'kabir',
        minutesAgo: 6 * DAY,
        text: 'Do you still have the contact for that framer?',
      },
      { from: 'maya', minutesAgo: 6 * DAY - 45, text: 'Yes, sending it over' },
      {
        from: 'maya',
        minutesAgo: 6 * DAY - 46,
        text: 'Wrong number, sorry',
        deletedMinutesAgo: 6 * DAY - 47,
      },
    ],
  },
  {
    key: 'dev',
    type: 'direct',
    members: ['maya', 'dev'],
    creator: 'maya',
    createdDaysAgo: 2,
    lines: [
      { from: 'maya', minutesAgo: 2 * DAY, text: 'Did the test devices arrive?', status: 'failed' },
    ],
  },
  {
    key: 'vikram',
    type: 'direct',
    members: ['maya', 'vikram'],
    creator: 'vikram',
    createdDaysAgo: 1,
    lines: [],
  },
]

const userId = (key: UserKey) => toUserId(`user-${key}`)
const conversationId = (key: string) => toConversationId(`conversation-${key}`)
const messageId = (key: string, position: number) =>
  toMessageId(`message-${key}-${String(position)}`)

function roleOf(script: DirectScript | GroupScript, member: UserKey): ParticipantRole {
  if (script.type === 'direct') {
    return 'member'
  }

  if (member === script.creator) {
    return 'owner'
  }

  return script.admins.includes(member) ? 'admin' : 'member'
}

/** Builds the mock data relative to a moment, so "yesterday" stays true whenever it runs. */
export function createMockSeed(now: Date): MockSeed {
  const ago = (minutes: number): IsoTimestamp =>
    new Date(now.getTime() - minutes * 60_000).toISOString()

  const conversations: Conversation[] = []
  const participants: ConversationParticipant[] = []
  const messages: Message[] = []

  for (const script of SCRIPTS) {
    const id: ConversationId = conversationId(script.key)
    const unreadCount = script.unread ?? 0
    const firstUnreadPosition = script.lines.length - unreadCount + 1

    // Lines are written in reading order, so the last one is the newest.
    const scriptMessages = script.lines.map((line, index) =>
      createMessage(script, id, line, index + 1, firstUnreadPosition, ago),
    )
    messages.push(...scriptMessages)

    const lastMessage = scriptMessages.at(-1) ?? null
    const base = {
      id,
      creatorId: userId(script.creator),
      createdAt: ago(script.createdDaysAgo * DAY),
      updatedAt: lastMessage?.createdAt ?? ago(script.createdDaysAgo * DAY),
      lastMessageId: lastMessage?.id ?? null,
      unread: {
        count: unreadCount,
        firstUnreadMessageId: unreadCount > 0 ? messageId(script.key, firstUnreadPosition) : null,
      },
    }

    conversations.push(
      script.type === 'direct'
        ? {
            ...base,
            type: 'direct',
            participantIds: [userId(script.members[0]), userId(script.members[1])],
          }
        : {
            ...base,
            type: 'group',
            participantIds: script.members.map(userId),
            name: script.name,
            description: script.description,
            avatarUrl: null,
          },
    )

    for (const member of script.members) {
      participants.push({
        conversationId: id,
        userId: userId(member),
        role: roleOf(script, member),
        joinedAt: ago(script.createdDaysAgo * DAY),
        lastReadMessageId: lastReadBy(member, scriptMessages, unreadCount),
      })
    }
  }

  return {
    currentUserId: userId(CURRENT_USER),
    users: (Object.keys(USERS) as UserKey[]).map((key) => ({
      id: userId(key),
      displayName: USERS[key].displayName,
      about: USERS[key].about,
      avatarUrl: null,
    })),
    presence: (Object.keys(LAST_SEEN) as UserKey[]).map((key) => ({
      userId: userId(key),
      status: LAST_SEEN[key] === 0 ? 'online' : 'offline',
      lastSeenAt: ago(LAST_SEEN[key]),
    })),
    conversations,
    participants,
    messages,
  }
}

function createMessage(
  script: DirectScript | GroupScript,
  id: ConversationId,
  line: Line,
  position: number,
  firstUnreadPosition: number,
  ago: (minutes: number) => IsoTimestamp,
): Message {
  const base = {
    id: messageId(script.key, position),
    conversationId: id,
    senderId: userId(line.from),
    createdAt: ago(line.minutesAgo),
    replyToMessageId: line.replyTo === undefined ? null : messageId(script.key, line.replyTo),
    deliveryStatus: line.status ?? (position >= firstUnreadPosition ? 'delivered' : 'read'),
  }

  if (line.deletedMinutesAgo !== undefined) {
    return { ...base, state: 'deleted', deletedAt: ago(line.deletedMinutesAgo) }
  }

  const reactions: MessageReaction[] = (line.reactions ?? []).map(([member, emoji]) => ({
    emoji,
    userId: userId(member),
    reactedAt: ago(line.minutesAgo - 1),
  }))

  return {
    ...base,
    state: 'active',
    text: line.text,
    editedAt: line.editedMinutesAgo === undefined ? null : ago(line.editedMinutesAgo),
    reactions,
    attachments: [],
  }
}

function lastReadBy(
  member: UserKey,
  messages: readonly Message[],
  unreadCount: number,
): MessageId | null {
  // The current user stops before their unread messages. Everyone else has read up to
  // the newest message that reached the read state.
  const read =
    member === CURRENT_USER
      ? messages.slice(0, messages.length - unreadCount)
      : messages.filter(({ deliveryStatus }) => deliveryStatus === 'read')

  return read.at(-1)?.id ?? null
}

# State management

Redux Toolkit holds the state that several parts of the app share. Each feature keeps its state in a
`state` folder, split the same way:

| File           | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `slice.ts`     | State shape and reducers. Pure, with no API calls                  |
| `thunks.ts`    | One asynchronous operation per API call                            |
| `selectors.ts` | All reads and derived data                                         |
| `workflows.ts` | Operations that coordinate several actions, such as opening a chat |

Components import from a feature's `index.ts`, never from these files.

## State domains

```
conversations   conversation entities, participants, selection, search, filter
messages        message entities, and per-conversation threads of ordered IDs
presence        users, the current user, online status, typing
ui              details panel and composer target
```

There is no group domain. Group operations are thunks in `conversations`, and they update the same
conversation entity that direct conversations use.

### What stays out of Redux

| State                         | Where it lives | Why                                              |
| ----------------------------- | -------------- | ------------------------------------------------ |
| Text being typed              | Component      | Changes on every key and nothing else reads it   |
| Open menus, tooltips, dialogs | Component      | Only that component cares                        |
| Whether a send is in progress | Component      | `unwrap()` on the dispatch reports it            |
| Theme                         | Theme provider | Applies before and outside the store             |
| Reply or edit target          | `ui` slice     | Message actions set it and the composer reads it |

## How data flows

```
Component ──dispatch──▶ thunk ──▶ ChatApi ──▶ mock or real backend
    ▲                     │
    │                     ▼ fulfilled or rejected action
    │                  reducers in every interested slice
    │                     │
    └──── selectors ◀──── store
```

One action can update several slices, and each slice owns its own response. Sending a message shows
this:

1. A component dispatches `sendMessage`.
2. The thunk calls `api.sendMessage`. The API comes from the thunk's `extra` argument, so slices and
   components never know which backend is running.
3. `sendMessage.fulfilled` reaches every slice:
   - `messages` stores the entity and appends its ID to the thread.
   - `conversations` updates `lastMessageId`, and the adapter re-sorts the list.
   - `ui` clears the reply target.
4. Components whose selected values changed re-render.

No slice copies another slice's data. The sidebar preview reads the message through
`lastMessageId`, so an edit reaches it without any conversation update.

Failures become plain `ApiFailure` objects in `action.error`, because Redux state must stay
serializable. Loading status lives beside the data it describes: one status for the conversation
list, and one per thread.

## Feature dependencies

Features import each other in one direction only, and `import-x/no-cycle` enforces it:

```
chat ──▶ ui ──▶ conversations ──▶ messages ──▶ presence
```

`chat` holds no state. It composes the chat window from the features below it, which is why
`ChatWindow` and `MessageComposer` live there and not in `messages`.

`conversations` reacts to message actions, so it imports `messages`. That rules out the reverse, so
`fetchConversations` dispatches `messagesReceived` to hand over its preview messages.

Thunk types leave out `RootState` and `AppDispatch`. Slices depend on thunk types, so naming the
store's types there would make the types refer to themselves. Thunks that need `getState` are
written as `AppThunk` in `workflows.ts`, which no slice imports.

## How selectors prevent unnecessary updates

`useAppSelector` re-renders a component only when the selected value changes by reference. The rules
below keep values stable, and `src/app/rendering.test.tsx` measures the result by counting renders.

| Update                                 | List renders | Row renders |
| -------------------------------------- | ------------ | ----------- |
| New message, order unchanged           | 0            | 1, that row |
| New message, conversation moves to top | 1            | 1, that row |
| Presence or typing change              | 0            | 0           |

**Lists select IDs, and rows select their own data.** `selectVisibleConversationIds` returns IDs, and
each row selects by its ID. A change to one conversation reaches one row.

**Result equality keeps arrays stable.** A recompute creates a new array even when the contents match.
`resultEqualityCheck: shallowEqual` returns the previous array in that case, which is how an unread
change leaves the list alone.

**Primitives need no memoization.** `selectConversationTitle` and `selectIsUserOnline` return a string
and a boolean, and those compare by value. Plain functions are enough, so `createSelector` is used
only where a selector builds a new object or array.

**Selectors take an ID directly.** Reselect 5 caches by argument, so one
`selectConversationPreview` serves every row without a factory per component.

**Fallbacks are shared constants.** An unloaded thread returns the same `EMPTY_THREAD`, and messages
with no reactions share `NO_REACTIONS`. A fresh `[]` would look like a change on every update.

**Each bubble has one subscription.** `selectMessageView` gathers everything a bubble renders, and
returns a new object only when that message, the one before it, or the one it replies to changes.
`MessageBubble` is wrapped in `memo`, because the list re-renders for each new message. Its props are
IDs and one stable callback, so only the new bubble renders. `MessageList.test.tsx` counts this.

**Derived data is not stored.** Titles, previews, reaction counts and filtered lists are computed by
selectors, so there is nothing to keep in sync.

`unread` is the one stored summary, because older messages may not be loaded. The list order is
also kept in state by the adapter's `sortComparer`, so it is calculated when data changes and not on
every read.

## Concurrency

Responses can arrive after newer changes, so reducers are written to tolerate that:

- A first page merges with the thread, because a message sent while it loads is not in the response.
- `markConversationRead` and member operations update only the fields they own. Replacing the whole
  conversation could undo a newer `lastMessageId`.
- `messageStatusChanged` only moves forward, because status events can arrive out of order.
- A cancelled request returns the status to `idle` and records no error.

## Message interactions

Business changes go through Redux. Short-lived presentation stays in components.

| Interaction              | State                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| Reply, edit              | `composerTarget` in `ui`, because a bubble sets it and the composer reads it |
| Edit text, draft         | `MessageComposer`. The unsent draft survives an edit                         |
| Reactions                | `toggleReaction` decides between adding and removing                         |
| Delete                   | `deleteMessage`. `MessageList` owns the single confirmation dialog           |
| Open menus, copy notices | Local to the component                                                       |

Menu actions that move focus run after the menu has closed. The menu returns focus to its button as
it closes, which would otherwise take focus back from the composer or a dialog.

Messages keep their relationships through these changes:

- A deleted message stays in place, so replies keep a valid `replyToMessageId` and show that the
  original was deleted.
- A quote is read from the original, so an edit reaches every reply.
- A deleted reply keeps its link but shows no quote, because it shows none of its content.
- Deleting a message clears any reply or edit that targets it.
- Editing changes only the text and `editedAt`, so reactions, replies and position are unaffected.

## Entity adapters

`createEntityAdapter` is used wherever data is keyed by ID: conversations, participants, messages,
users, presence and typing. Participants and typing have composite keys, because they join two IDs.

A thread is not an adapter. It holds an ordered list of IDs, and the order comes from paging, which
an adapter's sort would not reflect.

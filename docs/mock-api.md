# Mock API

There is no backend. The application talks to the `ChatApi` interface, and an in-memory mock
implements it.

| File                                         | Purpose                                          |
| -------------------------------------------- | ------------------------------------------------ |
| `src/services/chatApi.ts`                    | The contract. It knows nothing about the mock    |
| `src/services/apiError.ts`                   | The error type every implementation rejects with |
| `src/services/mock-api/createMockChatApi.ts` | The in-memory implementation and its rules       |
| `src/services/mock-api/seed.ts`              | The sample users, conversations and messages     |
| `src/services/mock-api/delay.ts`             | Cancellable simulated latency                    |

## Usage

```ts
const api = createMockChatApi()

const { conversations } = await api.getConversations()
const { messages, hasMore } = await api.getMessages(conversationId)
const message = await api.sendMessage({ conversationId, text: 'Hello' })
```

Message methods take a conversation or message ID, so direct and group conversations use the same
calls. `addGroupMembers` and `removeGroupMember` reject a direct conversation with a `validation`
error.

## Simulating loading and errors

```ts
createMockChatApi({ latencyMs: { min: 2000, max: 2000 } }) // hold loading states on screen
createMockChatApi({ failureRate: 0.2 }) // fail one request in five
createMockChatApi({ latencyMs: { min: 0, max: 0 } }) // fast tests

api.failNextRequest() // fail exactly the next request
api.failNextRequest(new ApiError('forbidden', 'Not allowed')) // with a chosen error
```

Failures happen before any change is applied, so a failed write leaves the data as it was.

Read methods accept an `AbortSignal`. Aborting clears the timer and rejects with an `aborted` error.

## Errors

Every failure is an `ApiError`. `message` is written for people, so the UI can show it directly.

| Code         | Meaning                                          | Retryable |
| ------------ | ------------------------------------------------ | --------- |
| `network`    | The server could not be reached                  | Yes       |
| `validation` | The request is invalid, such as an empty message | No        |
| `forbidden`  | The user may not do this                         | No        |
| `not-found`  | The item is missing, or the user cannot see it   | No        |
| `conflict`   | The current state prevents this                  | No        |
| `aborted`    | The caller cancelled the request                 | No        |

## Rules the mock enforces

- Users can only edit or delete their own messages.
- Deleted messages cannot be edited, and deleting one again succeeds so retries are safe.
- A reply must target a message in the same conversation.
- Owners and admins manage members. Anyone can leave, except a group's only owner.
- Owners cannot be removed by someone else.
- A conversation the user is not in is reported as missing.

## Design notes

**Each instance owns its data.** `createMockChatApi` is a factory, so tests never share state. The
application will create one instance where the store is set up.

**Responses are copies.** A real network never shares objects with its caller, so the mock does not
either. Code that changes a response cannot change the backend's data, which would hide bugs until
a real API replaced the mock.

**The seed is TypeScript, not JSON.** The compiler checks it against the domain types, which JSON
cannot do, and branded IDs need constructors. It is written as short scripts that expand into
normalized records, and `seed.test.ts` verifies every reference.

**Timestamps are relative to now.** Sample data always has messages from today, yesterday and
earlier, whenever the app is opened.

**Data lasts until the page reloads.** Saving it is the job of `services/storage`.

## Replacing the mock

Write a class or factory that implements `ChatApi`, reject failures with `ApiError`, and change the
one place that creates the instance. Nothing else depends on the mock.

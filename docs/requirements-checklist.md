# Requirement checklist

Every requirement in [project-context.md](project-context.md), mapped to its implementation and the
evidence for it. The original take-home document is not in this repository, so this list is based on
that brief. Compare it with the original before submitting.

## How this was verified

Verified on commit `bcd8c0b`, on 5 November 2026, from a fresh `git clone` with Node 22.16.0.

| Evidence    | Meaning                                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser** | Driven in headless Chrome 156 with mouse, keyboard and touch input, and checked by script or by eye. Feature flows and the width matrix ran on the production build, and keyboard, 320px and landscape checks on the development server |
| **Forced**  | Same, on the development server, with the mock forced to stall or fail                                                                                                                                                                  |
| **Tests**   | Covered by the named test file in `npm run test:run`                                                                                                                                                                                    |
| **Code**    | Implementation read, with no behavior check possible here                                                                                                                                                                               |

| Status            | Meaning                                              |
| ----------------- | ---------------------------------------------------- |
| **Done**          | Implemented, and shown working by the evidence given |
| **Partly**        | Works, with a gap the notes describe                 |
| **Not on device** | Implemented, but only a real device can prove it     |

The browser run was a one-off script and is not part of this repository. It finished with 56 of 56
checks passing, and `npm ci`, typecheck, lint, format check, 595 tests and the build all passed.

## Mandatory requirements

### Conversation sidebar

| Requirement                        | Status | Implementation                                     | Evidence                                |
| ---------------------------------- | ------ | -------------------------------------------------- | --------------------------------------- |
| Direct and group chats in one list | Done   | `ConversationList`, `selectVisibleConversationIds` | Browser, `ConversationSidebar.test.tsx` |
| Avatars and online status          | Done   | `ConversationAvatar`, `OnlineDot`                  | Browser, `ConversationSidebar.test.tsx` |
| Last message preview and timestamp | Done   | `selectConversationPreview`, `ConversationItem`    | Browser, `conversations.test.ts`        |
| Unread counts                      | Done   | `ConversationItem`, `selectUnreadCount`            | Browser, `conversations.test.ts`        |
| Search conversations               | Done   | `ConversationSearch`                               | Browser, `ConversationSidebar.test.tsx` |
| Filter by All, Unread and Groups   | Done   | `ConversationFilters`                              | Browser, `ConversationSidebar.test.tsx` |

### Chat window

| Requirement                           | Status | Implementation                                | Evidence                                |
| ------------------------------------- | ------ | --------------------------------------------- | --------------------------------------- |
| Messages for the selected chat        | Done   | `ChatWindow`, `MessageList`                   | Browser, `ChatWindow.test.tsx`          |
| Send text messages                    | Done   | `MessageComposer`, `sendMessage`              | Browser, `ChatWindow.test.tsx`          |
| Simulate receiving messages           | Done   | `createChatSimulation`, `connectChatEvents`   | Browser, `createChatSimulation.test.ts` |
| Timestamps                            | Done   | `MessageTimestamp`                            | Browser, `MessageList.test.tsx`         |
| Delivery and read indicators          | Done   | `MessageStatusIndicator`, `deliveryStatus.ts` | Browser, `messages.test.ts`             |
| Reply to a specific message           | Done   | `composerTarget`, `ReplyQuote`                | Browser, `MessageInteractions.test.tsx` |
| Scroll to the latest when appropriate | Done   | `useChatScroll`                               | Browser, `useChatScroll.test.tsx`       |
| Typing indicators                     | Done   | `selectTypingLabel`, `connectChatEvents`      | Browser, `TypingIndicators.test.tsx`    |

### Message interactions

| Requirement              | Status | Implementation                          | Evidence                                |
| ------------------------ | ------ | --------------------------------------- | --------------------------------------- |
| Edit sent messages       | Done   | `editMessage`, `MessageComposer`        | Browser, `MessageInteractions.test.tsx` |
| Delete messages          | Done   | `deleteMessage`, `DeleteMessageDialog`  | Browser, `MessageInteractions.test.tsx` |
| Copy message content     | Done   | `MessageActions`                        | Browser, `MessageInteractions.test.tsx` |
| Add and remove reactions | Done   | `toggleReaction`, `useToggleReaction`   | Browser, `MessageInteractions.test.tsx` |
| Group messages by date   | Done   | `selectMessageView`, `formatMessageDay` | Browser, `MessageInteractions.test.tsx` |

### Group conversations

| Requirement                            | Status | Implementation                                        | Evidence                            |
| -------------------------------------- | ------ | ----------------------------------------------------- | ----------------------------------- |
| Group information and members          | Done   | `GroupInfoPanel`, `selectGroupMembers`                | Browser, `GroupManagement.test.tsx` |
| Member online status                   | Done   | `MemberRow`                                           | Browser, `GroupManagement.test.tsx` |
| Add and remove members, using the mock | Done   | `AddMembersForm`, `RemoveMemberDialog`                | Browser, `GroupManagement.test.tsx` |
| No duplicated messaging interface      | Done   | One `ChatWindow`. `showSender` is the only difference | Browser, code                       |

### General experience

| Requirement                        | Status | Implementation                                      | Evidence                                |
| ---------------------------------- | ------ | --------------------------------------------------- | --------------------------------------- |
| Loading states                     | Done   | `ListSkeleton`, `ThreadSkeleton`, `ProfileSkeleton` | Forced, in all three themes             |
| Empty states                       | Done   | `EmptyResults`, `MessageList`, `ChatWindow`         | Browser, `ConversationSidebar.test.tsx` |
| Error states with retry            | Done   | `ErrorRetry`, `ProfileError`, `ConversationList`    | Forced, in all three themes, and tests  |
| Message search                     | Done   | `MessageSearchResults`, `openSearchResult`          | Browser, `SearchAndKeyboard.test.tsx`   |
| Unread indicators                  | Done   | `ConversationItem`, `DocumentTitle`, divider        | Browser, `MessageList.test.tsx`         |
| Keyboard shortcuts for sending     | Done   | `MessageComposer`                                   | Browser, `ChatWindow.test.tsx`          |
| Light, dark and glass themes       | Done   | `src/theme`, `ThemeSwitcher`                        | Browser, `ThemeProvider.test.tsx`       |
| System preference and saved choice | Done   | `ThemeProvider`, `preference.ts`                    | Browser, `ThemeProvider.test.tsx`       |

### Responsive experience

| Requirement                                | Status        | Implementation or note                                                     | Evidence                       |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------- | ------------------------------ |
| 375, 390, 768, 1024 and 1440px widths      | Done          | No overflow, and the composer stays on screen in all three themes          | Browser, 15 of 15 combinations |
| Desktop two-panel layout                   | Done          | `AppShell`, from 768px up                                                  | Browser                        |
| Tablet adapts sidebar and chat widths      | Done          | 20rem sidebar, 24rem from 1024px                                           | Browser                        |
| Tablet navigation transition               | Partly        | Tablet keeps both panels. Narrower screens change panels with no animation | Browser                        |
| Mobile single-screen navigation            | Done          | `AppShell`, below 768px                                                    | Browser, `App.test.tsx`        |
| Accessible back action                     | Done          | `ChatHeader`, and system back through `useConversationBackNavigation`      | Browser, `App.test.tsx`        |
| Composer stays at the bottom               | Done          | `ChatWindow`, capped at 35% of the screen height                           | Browser                        |
| Virtual keyboard does not cover composer   | Not on device | `h-dvh` and `interactive-widget=resizes-content`                           | Code                           |
| Bubbles and headers fit narrow screens     | Done          | Also checked at 320px                                                      | Browser                        |
| Dialogs, menus and search on small screens | Done          | The action menu stays inside a 390px screen                                | Browser                        |
| Mobile group information                   | Done          | `DialogContent` with `placement="right"` fills the phone screen            | Browser                        |
| Touch message actions                      | Done          | Always visible on coarse pointers                                          | Browser, with touch input      |
| Safe-area insets                           | Not on device | `AppShell` and `Dialog` use `env(safe-area-inset-*)`                       | Code                           |
| Dynamic viewport height                    | Not on device | `h-dvh`                                                                    | Code                           |
| Comfortable touch targets                  | Partly        | Main controls are 44px, icon buttons 36px, reaction chips 24px             | Browser                        |
| Portrait and landscape                     | Done          | Checked at 390 by 844 and 844 by 390                                       | Browser                        |

### Design system and theming

| Requirement                                 | Status | Implementation                                                            | Evidence                 |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------- | ------------------------ |
| Deep token coverage                         | Done   | Colors, type, spacing, borders, shadows, gradients, opacity, blur, motion | `tokens.test.ts`, code   |
| Glass as a theme, not duplicated components | Done   | `themes.css` only                                                         | Browser, code            |
| Semantic tokens instead of hardcoded colors | Done   | Enforced by ESLint                                                        | `npm run lint`           |
| Switchable at runtime                       | Done   | `data-theme`                                                              | Browser                  |
| Reusable design-system layer                | Done   | `src/components/ui`, with no chat knowledge                               | `npm run lint`, showcase |
| Built on accessible primitives              | Done   | Radix directly. The shadcn CLI is not used                                | Code                     |

### Architecture and state

| Requirement                                   | Status | Implementation                                 | Evidence                                              |
| --------------------------------------------- | ------ | ---------------------------------------------- | ----------------------------------------------------- |
| Unified conversation model                    | Done   | `src/types/conversation.ts`                    | `domain.test.ts`                                      |
| Redux Toolkit with normalized entities        | Done   | Entity adapters in each slice                  | `store.test.ts`, code                                 |
| Separate reducers, selectors and async work   | Done   | `slice.ts`, `selectors.ts`, `thunks.ts`        | Code                                                  |
| Avoid unnecessary re-renders                  | Done   | IDs in lists, `memo` on bubbles                | `rendering.test.tsx`, `MessageList.test.tsx`          |
| Feature-based structure with clear boundaries | Done   | Import rules in `eslint.config.js`             | `npm run lint`                                        |
| Strict TypeScript                             | Done   | `tsconfig.app.json`                            | `npm run typecheck`                                   |
| Typed mock data and services                  | Partly | Seed is typed TypeScript, not JSON, on purpose | `seed.test.ts`                                        |
| Mock layer replaceable by a real API          | Done   | `ChatApi`, chosen only in `src/main.tsx`       | Code                                                  |
| Simulated delays and failures                 | Done   | `latencyMs`, `failureRate`, `failNextRequest`  | `createMockChatApi.test.ts`, Forced                   |
| Timers and listeners cleaned up               | Done   | `schedule`, `connectChatEvents`                | `createChatSimulation.test.ts`, `chatEvents.test.tsx` |

### Accessibility and quality

| Requirement              | Status | Implementation or note                                                                 | Evidence                              |
| ------------------------ | ------ | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Semantic HTML            | Done   | `main`, `nav`, `header`, `section`, lists and `role="log"`                             | Code, Testing Library roles           |
| Keyboard navigation      | Done   | 30 tab stops, arrow keys in lists, focus returned from dialogs                         | Browser, `SearchAndKeyboard.test.tsx` |
| Visible focus            | Done   | Every one of those 30 stops shows an outline                                           | Browser                               |
| Color contrast           | Done   | 21 token pairs per theme, measured. Lowest is 3.38:1 against a 3:1 target for a border | Browser                               |
| Reduced motion           | Done   | Motion tokens drop to `0ms`, and no message animation runs                             | Browser, `useChatScroll.test.tsx`     |
| Screen reader experience | Partly | Roles, labels and live regions exist, but no screen reader was used                    | Testing Library roles                 |

### Deliverables

| Requirement                                     | Status | Location                                                             |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Working frontend application                    | Done   | Fresh clone installs, builds and runs                                |
| Tests for important components and interactions | Done   | 595 tests in 42 files                                                |
| GitHub repository                               | Done   | <https://github.com/whitetposion/experiment-001>, publicly reachable |
| README with installation and setup              | Done   | [README.md](../README.md#installation)                               |
| Architecture diagram                            | Done   | [README.md](../README.md#architecture)                               |
| State management and key decisions              | Done   | [README.md](../README.md#state-management)                           |
| Assumptions, shortcuts and trade-offs           | Done   | [README.md](../README.md#known-limitations-and-trade-offs)           |

## Optional challenges

| Challenge                            | Status   | Notes                                                |
| ------------------------------------ | -------- | ---------------------------------------------------- |
| Debounced conversation search        | Done     | 250ms, in `ConversationSearch`                       |
| WebSocket-style real-time simulation | Done     | `ChatApi.subscribe` and `createChatSimulation`       |
| Infinite scrolling                   | Partly   | Paging works, through a Load earlier messages button |
| Virtualized list of 10,000+ messages | Not done | Paging limits each load to 30 messages               |
| Optimistic sending                   | Not done | The `sending` status exists but is unused            |
| Message persistence                  | Not done | `services/storage` is an empty placeholder           |
| Offline message queue                | Not done |                                                      |
| Attachment previews                  | Not done | Attachments are modeled in the types only            |

## Incomplete functionality

None of these block a mandatory flow, but each is a real gap:

1. **Real device behavior is unproven.** The virtual keyboard, safe-area insets, dynamic viewport
   height and iOS Safari have not been tried on a device.
2. **Firefox and Safari are untested.** All browser checks used Chrome.
3. **Panels change without a transition on phones,** which is one reading of the brief's navigation
   transition requirement.
4. **Some touch targets are small,** with reaction chips at 24px.
5. **No screen reader pass** has been done.
6. **A failed message cannot be retried** from its bubble.
7. **Leaving a group** exists in state and the mock, with no UI.

See also [Known limitations and trade-offs](../README.md#known-limitations-and-trade-offs).

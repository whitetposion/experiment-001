# Project Context — Modern Chat Application

## 1. Project overview

Build a modern, responsive, frontend-only messaging application inspired by WhatsApp Web and Slack. It is a senior frontend take-home assessment intended to demonstrate frontend architecture, component design, state management, interaction design, responsive implementation, performance awareness, testing, and engineering trade-offs.

There is no backend requirement. Use typed mock JSON data and frontend services to simulate conversations, messages, incoming messages, typing indicators, presence, and message status changes.

This document defines the product vision and engineering principles. The separate milestone plan defines the implementation sequence.

## 2. Product vision

Build a cohesive messaging experience that feels like a usable real-world application, not a static UI prototype.

Users should be able to:

- Browse, search, and filter conversations.
- Switch between direct and group conversations.
- Send and receive text messages.
- See timestamps and delivery/read indicators.
- Reply to, edit, delete, copy, and react to messages.
- See messages grouped by date.
- See online status and typing indicators.
- Search messages and identify unread conversations.
- View group information and manage group members using mock functionality.
- Customize the visual appearance through multiple themes.

The experience must be complete and usable on mobile phones, tablets, laptops, and desktop monitors.

## 3. Core domain concept: unified conversations

A direct conversation and a group conversation are two types of the same domain entity: Conversation.

- A direct conversation normally has two participants.
- A group conversation has multiple participants.
- The distinction is represented by a conversation type, such as direct or group.

Both types must use the same message model and storage, message list and rendering system, composer, message interaction system, state management, and delivery/read status handling.

Do not create a separate group messaging engine, separate group message store, or duplicated chat window.

Group-specific capabilities—such as group name, description, avatar, participant management, and group information panels—extend the shared conversation domain. These capabilities may live in focused feature modules, but they must operate on the unified conversation model.

Keep messages as independent entities associated with a conversationId. Prefer normalized relationships over deeply nested message collections.

## 4. Functional scope

### Conversation sidebar

- Display direct and group conversations in one unified list.
- Show profile/group avatars and relevant online status.
- Show the last message preview and timestamp.
- Show unread message counts.
- Search conversations.
- Filter by All, Unread, and Groups.

### Chat window

- Display messages for the selected conversation.
- Send and simulate receiving text messages.
- Display timestamps and delivery/read indicators.
- Support replies to specific messages.
- Automatically scroll to the latest message when appropriate.
- Display typing indicators.

### Message interactions

- Edit sent messages.
- Delete messages.
- Reply to a specific message.
- Copy message content.
- Add and remove emoji reactions.
- Group messages by date.

### Group conversations

- Display group information and members.
- Show member online status.
- Add and remove members using mock functionality.
- Display group-specific information without duplicating the messaging interface.

### General experience

- Responsive desktop, tablet, and mobile layouts.
- Loading, empty, and error states where relevant.
- Message search and unread indicators.
- Keyboard shortcuts for sending messages.
- Light and dark themes, with glassmorphism as an additional visual theme.

## 5. Mobile-first and responsive experience

Mobile support is a first-class requirement from the beginning. Mobile must not be treated as a compressed desktop layout or postponed until the end.

Design mobile and desktop as intentional experiences that share the same product capabilities and domain logic.

### Desktop

- Show the conversation sidebar and active chat simultaneously where space allows.
- Use a clear two-panel layout.
- Keep conversation navigation accessible while messaging.
- Use available width for comfortable message and information layouts.

### Tablet

- Adapt sidebar and chat widths to available space.
- Preserve readable message layouts.
- Avoid horizontal overflow.
- Use touch-friendly controls.
- Use a navigation transition between conversation list and chat when simultaneous display is constrained.

### Mobile

- Use a single-screen navigation pattern.
- Show the conversation list as the primary screen.
- Selecting a conversation opens a full-screen chat.
- Provide an accessible back action to return to the conversation list.
- Keep the message composer accessible at the bottom.
- Ensure the virtual keyboard does not obstruct the composer or message input.
- Adapt message bubbles and headers to narrow screens.
- Make dialogs, menus, dropdowns, search, and filters usable in a small viewport.
- Present group information in a mobile-friendly screen, drawer, or panel.
- Support touch interactions for message actions.

### Responsive engineering principles

- Follow a mobile-first CSS approach.
- Use Tailwind responsive utilities and consistent breakpoints.
- Prefer flexible Grid and Flexbox layouts over brittle fixed widths.
- Account for mobile safe-area insets.
- Handle dynamic viewport height appropriately.
- Use comfortable touch target sizes.
- Prevent accidental horizontal scrolling.
- Consider portrait and landscape orientations.
- Preserve accessibility and keyboard navigation.

Test at representative viewport widths:

- 375px — small mobile.
- 390px — standard mobile.
- 768px — tablet.
- 1024px — small desktop.
- 1440px — desktop.

Responsive behavior must be verified as each feature is built, followed by a complete responsive audit.

## 6. Design philosophy and deep theming

The interface should be modern, polished, clean, and customizable. Prioritize visual consistency, clear information hierarchy, intuitive interactions, considered spacing and typography, restrained motion, accessible controls, and responsive layouts.

The design system must not be limited to a fixed two-color or three-color palette.

Theme customization should cover:

- Primary, secondary, and accent colors.
- Background and foreground colors.
- Surface and elevated-surface colors.
- Semantic colors: success, warning, destructive, and informational.
- Typography, font families, sizes, weights, and line heights.
- Spacing scales.
- Border colors, widths, and radii.
- Shadows and elevation.
- Gradients.
- Transparency and opacity.
- Backdrop blur.
- Component-specific visual variants.
- Motion, durations, and transitions.

Initial visual themes:

1. Light: clean, minimal surfaces and subtle borders.
2. Dark: balanced dark surfaces with readable contrast.
3. Glassmorphism: translucent surfaces, backdrop blur, layered backgrounds, subtle borders, and appropriate shadows.

Glassmorphism should be a theme or surface treatment, not a separate set of duplicated components.

Use semantic design tokens and CSS custom properties as the foundation. Components should consume semantic tokens rather than hardcoded theme-specific colors. Themes should be switchable at runtime without rewriting component implementations.

Support system preference detection and persistence of the user's theme preference where appropriate.

## 7. Component architecture

Build a reusable design-system layer rather than coupling the application directly to a third-party component library.

Use shadcn/ui and its accessible primitives as a foundation where useful, especially for complex interactions such as dialogs, dropdowns, popovers, and tooltips. The final component APIs, visual styles, variants, and customization capabilities should remain under project control.

Components should be reusable, composable, strongly typed, accessible, theme-aware, configurable through clear props, and independent of chat-specific business logic when generic.

Generic UI components must not know about conversations or messages. Chat-specific components should consume generic UI components and implement domain behavior.

Keep feature-specific components inside their owning feature. For example, message bubbles belong to the messages feature, not the generic UI library.

## 8. State management philosophy

Use Redux Toolkit as the primary application state management solution.

State management must be explicit, predictable, structured, and understandable. Avoid abstractions that hide business logic or make data flow difficult to trace.

Principles:

- Keep shared business state centralized.
- Normalize conversation and message entities.
- Separate reducers, selectors, and asynchronous operations.
- Use selectors for derived data where appropriate.
- Avoid unnecessary duplicated state.
- Keep temporary presentation state local to the components that own it.
- Separate business logic from UI rendering.
- Use typed actions, selectors, and hooks.
- Avoid unnecessary Redux subscriptions and component re-renders.

Likely state domains include conversations, messages, presence, and shared application UI state. Do not create a separate group messaging state domain that duplicates conversation or message data. Group-specific operations should update the shared conversation domain.

Theme preference may be managed by a dedicated theme provider and persisted separately. Not every local input value or open/closed menu belongs in Redux.

## 9. Technical stack

- React
- TypeScript
- Vite
- Tailwind CSS v4
- Redux Toolkit
- React Redux
- React Hook Form
- shadcn/ui primitives where appropriate
- Lucide React
- Vitest
- React Testing Library

Use strict TypeScript settings and a feature-based project structure. Keep clear boundaries between application features, shared components, state management, services, theming, and utilities.

## 10. Mock data and backend simulation

No real backend is required. Use typed mock JSON data and frontend services to simulate:

- Conversation and message loading.
- Sending and receiving messages.
- Typing indicators.
- Online and offline status.
- Delivery and read status transitions.
- Message editing and deletion.
- Group member management.

Keep mock services separate from React components and Redux reducers. Simulate asynchronous delays and relevant loading/error scenarios. The mock service layer should be replaceable by real API integrations later.

Use proper cleanup for timers, subscriptions, and event listeners. Simulations must not introduce memory leaks.

## 11. Performance, accessibility, and engineering quality

Demonstrate awareness of frontend performance and scalable implementation.

Consider:

- Efficient message rendering.
- Normalized Redux state.
- Appropriate selector memoization.
- Avoiding unnecessary component re-renders.
- Proper event listener and timer cleanup.
- Correct scroll behavior.
- Reusable custom hooks.
- Responsive component architecture.
- Strong TypeScript contracts.
- Semantic HTML and accessible controls.
- Keyboard navigation and visible focus states.
- Adequate color contrast across themes.
- Reduced-motion preferences where relevant.

Do not add memoization or abstractions without a reason. Explain meaningful performance decisions.

## 12. Testing and quality

Use Vitest and React Testing Library.

Prioritize tests for important reducers and selectors; conversation filters and search; sending, editing, and deleting messages; reply interactions; reactions; group member management; message status transitions; theme switching; responsive navigation; and other important user interactions.

Test user-visible behavior rather than implementation details. Verify the application at representative mobile, tablet, and desktop viewport sizes.

## 13. Architecture and development principles

Use a feature-based project structure with clear responsibilities:

- app: store, providers, and application configuration.
- components/ui: generic design-system components.
- components/layout: application-level layout components.
- features: domain-specific components, hooks, state, and logic.
- theme: tokens, theme definitions, and theme provider.
- services: mock APIs, simulations, and persistence.
- hooks: cross-feature reusable hooks.
- lib: shared utilities.
- types: shared types.
- docs: architecture and engineering documentation.

Build incrementally. Do not generate the entire application in one step.

For each implementation task:

1. Inspect the existing project before modifying it.
2. Explain the implementation approach briefly.
3. Implement only the requested scope.
4. Respect existing architecture and conventions.
5. Avoid unnecessary dependencies and premature abstractions.
6. Run relevant TypeScript checks, linting, and tests.
7. Report modified files, validation results, and outstanding issues.
8. Suggest a meaningful conventional Git commit message.
9. Stop and wait for the next task.

Do not silently skip requirements from the original take-home assignment. Track mandatory requirements and optional challenges separately. Do not claim functionality is complete unless it has been implemented and verified.

## 14. Optional advanced challenges

After the mandatory core experience is complete, consider:

- Virtualized message list capable of handling 10,000+ messages.
- Optimistic message sending.
- Infinite scrolling to load older messages.
- Message persistence using LocalStorage or IndexedDB.
- Offline message queue simulation.
- Debounced conversation search.
- Attachment previews using local files.
- WebSocket-style real-time simulation.

Prioritize a complete, reliable core experience before optional challenges.

## 15. Final deliverables and definition of done

The final project should include:

- A working frontend application.
- Unified direct and group conversations.
- Functional messaging and message interactions.
- Group information and member management.
- A deeply customizable design system.
- Light, dark, and glassmorphism themes.
- Fully responsive mobile, tablet, and desktop experiences.
- Predictable Redux Toolkit state management.
- Modular feature-based architecture.
- Search, filters, unread indicators, and keyboard shortcuts.
- Loading, empty, and error states.
- Tests for important components and interactions.
- A GitHub repository containing the source code.
- A README with installation and setup instructions.
- An architecture diagram.
- An explanation of state management and key architectural decisions.
- Documented assumptions, shortcuts, limitations, and trade-offs.

The project is complete when mandatory requirements from the take-home assignment have been implemented and verified, the application works across target viewport sizes, and the submission documentation accurately describes the implementation.

# react-app

React, TypeScript and Vite application.

## Requirements

Node 22.16.0, pinned in `.nvmrc`. Run `nvm use` before installing.

## Scripts

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the development server        |
| `npm run build`        | Type-check and build for production |
| `npm run preview`      | Preview the production build        |
| `npm run typecheck`    | Type-check without building         |
| `npm run lint`         | Run ESLint                          |
| `npm run lint:fix`     | Run ESLint and apply fixes          |
| `npm run format`       | Format with Prettier                |
| `npm run format:check` | Check formatting                    |
| `npm test`             | Run Vitest in watch mode            |
| `npm run test:run`     | Run Vitest once                     |

## Project structure

```
src/
  app/           Redux store, providers and application configuration
  components/
    ui/          Generic, reusable design-system components
    layout/      Application-level layout components
  features/      Feature-specific components, hooks, state and business logic
    conversations/
    messages/
    presence/
    search/
  theme/         Design tokens, theme definitions and theme provider
  services/
    mock-api/    Mock APIs
    simulation/  Simulations
    storage/     Persistence
  hooks/         Reusable hooks used by more than one feature
  lib/           Shared utilities
  types/         Shared TypeScript types
  test/          Test setup and utilities
  showcase/      Development-only component showcase
```

Git does not track empty folders, so a folder with no code yet holds a `.gitkeep`. Delete it when
the first real file lands.

## Component showcase

Run `npm run dev` and open <http://localhost:5173/showcase.html> to see every design-system
component and state in the light, dark and glass themes. Add `?theme=dark` or `?theme=glass` to open
on a theme. The page is not part of the production build.

## Design tokens

Components use semantic tokens, never hardcoded colors. See
[docs/design-tokens.md](docs/design-tokens.md).

## Import conventions

ESLint enforces these rules, so `npm run lint` fails on a violation.

- Use `./` for files in the same folder or below it, and `@/` for everything else. `../` is not
  allowed.
- Dependencies only point downwards. Each layer may import only from itself and the layers listed
  here:

| Layer               | May import                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| `app`               | Everything except `test`                                                  |
| `features`          | `components`, `hooks`, `lib`, `services`, `theme`, `types`, `@/app/hooks` |
| `components/layout` | `components/ui`, `hooks`, `lib`, `theme`, `types`                         |
| `components/ui`     | `hooks`, `lib`, `theme`, `types`                                          |
| `hooks`             | `lib`, `theme`, `types`                                                   |
| `services`          | `lib`, `types`                                                            |
| `theme`             | `lib`, `types`                                                            |
| `lib`               | `types`                                                                   |
| `types`             | Nothing                                                                   |

- Each feature exposes its public API from `index.ts`. Other features import
  `@/features/messages`, never `@/features/messages/hooks/useMessages`. Inside its own folder, a
  feature uses its full `@/features/messages/...` path.
- Features read Redux types and typed hooks from `@/app/hooks`, never from `@/app/store`. The store
  imports feature slices, so this keeps the dependency one-way at runtime.
- `app` composes features. If two features need to talk to each other, move the shared part down a
  layer or compose them in `app`. Circular imports fail lint through `import-x/no-cycle`.
- Tests and `src/test` may import from any layer. Production code must not import `@/test`.
- `src/showcase` may import shared UI layers but not features, and nothing may import it.

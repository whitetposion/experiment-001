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
  app/         Application root and app-wide wiring
  features/    One folder per feature, holding its components, hooks and state
  shared/      Code used by more than one feature
    components/
    hooks/
    lib/
    types/
  test/        Test setup
```

Import from `src` with the `@/` alias, for example `@/shared/lib/example`.

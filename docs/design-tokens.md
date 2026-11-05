# Design tokens

CSS custom properties are the source of truth. Components use Tailwind classes that resolve to
those properties, so a new visual identity only has to reassign variables.

## How a token reaches the screen

```
src/theme/tokens.css       --ds-color-primary: oklch(0.5 0.13 155);
        │
src/theme/tailwind.css     @theme inline { --color-primary: var(--ds-color-primary); }
        │
Tailwind generates         .bg-primary { background-color: var(--ds-color-primary); }
        │
Component                  <button className="bg-primary text-primary-foreground" />
        │
Browser                    resolves var(--ds-color-primary) at runtime, per element
```

Tailwind runs at build time, but it only writes a `var()` reference into the CSS. The value is
resolved in the browser, so changing a variable restyles every utility with no rebuild.

## Files

| File                             | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `src/theme/tokens.css`           | Semantic tokens: the contract and the default identity        |
| `src/theme/component-tokens.css` | Component tokens that default to semantic tokens              |
| `src/theme/themes.css`           | The dark and glass themes, which reassign semantic tokens     |
| `src/theme/tailwind.css`         | Maps tokens to Tailwind namespaces and clears default scales  |
| `src/theme/base.css`             | Applies tokens to the document: body, borders, outline colors |
| `src/theme/tokens.test.ts`       | Checks that the contract has no dangling or unused tokens     |

## Key decisions

- **The `--ds-` prefix is required.** Tailwind's namespaces use names like `--font-sans` and
  `--radius-md`. Without a prefix, `--font-sans: var(--font-sans)` would refer to itself.
- **`@theme inline` is required.** It writes `var(--ds-*)` directly into each utility, so overrides
  work on any element. Plain `@theme` routes through a variable resolved on `:root`, which breaks
  scoped themes and per-component overrides.
- **Default scales are cleared.** Classes like `bg-slate-900` and `shadow-2xl` generate nothing, so
  a component cannot opt out of the theme by accident.
- **Tokens live in `@layer theme`.** Tailwind utilities can then override them, including on `html`.
- **Derived tokens are re-declared on `[data-theme]`.** A custom property resolves on the element
  that declares it. Without this, shadows and component tokens would keep `:root` values inside a
  scoped theme.
- **Opacity tokens are percentages.** That makes them valid for both `opacity-disabled` and color
  modifiers such as `bg-primary/subtle`.
- **Breakpoints are not tokens.** Media queries cannot read custom properties, so breakpoints stay
  static across themes.

## Utility reference

| Token group           | Example utilities                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors                | `bg-surface`, `text-muted-foreground`, `border-border-strong`                                                                                     |
| Color with opacity    | `bg-primary/subtle`, `bg-destructive/50`                                                                                                          |
| Typography            | `font-sans`, `font-heading`, `font-semibold`, `text-sm`                                                                                           |
| Spacing               | `p-4` (multiple of the unit), `px-gutter`, `gap-section`                                                                                          |
| Border radius         | `rounded-md`, `rounded-pill`                                                                                                                      |
| Shadows               | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                             |
| Gradients             | `bg-backdrop`                                                                                                                                     |
| Motion                | `duration-fast`, `ease-standard`                                                                                                                  |
| Blur and transparency | `backdrop-blur-md`, `backdrop-blur-surface`, `opacity-disabled`                                                                                   |
| Component tokens      | `h-control`, `h-control-sm`, `h-control-lg`, `px-control-x`, `rounded-control`, `p-panel`, `rounded-panel`, `shadow-panel`, `backdrop-blur-panel` |

## Switching themes

`ThemeProvider` sets `data-theme` on the root element from the user's preference: system, light, dark
or glass. System follows the operating system and updates live. The choice is saved in
`localStorage`, and other open tabs follow it.

A small script in `index.html` applies the saved theme before the first paint, so nobody sees a flash
of the wrong theme. It shares its storage key with `src/theme/preference.ts`.

Components read the current theme with `useTheme`.

## Adding a theme

Add a `[data-theme]` block to `src/theme/themes.css`, reassigning tokens, and add its name to
`THEME_PREFERENCES` and the script in `index.html`. Anything left out keeps
its default. The contract test fails if a theme assigns a token that does not exist.

```css
@layer theme {
  [data-theme='example'] {
    --ds-color-scheme: dark;
    --ds-color-background: oklch(0.15 0.02 260);
    --ds-color-surface: oklch(0.25 0.02 260 / 0.6);
    --ds-surface-blur: 16px;
    --ds-radius-md: 0px;
    --ds-font-sans: Georgia, serif;
  }
}
```

Translucency and blur are ordinary token values, so a glass treatment needs no component changes:
components already use `bg-surface` and `backdrop-blur-surface`.

Foreground tokens must meet 4.5:1 contrast against their paired background, and
`border-strong` and `ring` must meet 3:1.

Shadows are built from `--ds-shadow-color`, `--ds-shadow-edge` and `--ds-shadow-ring`. Black shadows
barely show on dark surfaces, so dark themes also set the edge, a thin top highlight, and the ring,
a faint outline.

## Customizing components

Component tokens exist for families that themes commonly restyle on their own: controls and panels.
Add a new one only when a component needs to vary separately from the semantic tokens.

```tsx
// Consumes component tokens, so every theme can restyle it.
<button className="bg-primary text-primary-foreground h-control px-control-x rounded-control" />

// Override one instance or a subtree. Descendants inherit it.
<div className="[--ds-control-radius:0px]">...</div>
```

## Adding a token

1. Define it in `tokens.css`, or in `component-tokens.css` for a component token.
2. Map it in `tailwind.css` if components need a utility.

The contract test fails on a reference to an undefined token and on a defined token nothing uses.

## Enforcement

ESLint rejects hex and color-function literals, arbitrary color classes, and removed palette classes
in `src/app`, `src/components`, `src/features` and `src/showcase`. Lint matters here because a removed class would
otherwise fail silently.

import { readdirSync } from 'node:fs'
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const LAYERS = [
  'app',
  'components/layout',
  'components/ui',
  'features',
  'hooks',
  'lib',
  'services',
  'test',
  'theme',
  'types',
]

// Each layer lists what it may import. Anything else is an error, so dependencies
// only point downwards. The README documents the same table.
const ALLOWED_IMPORTS = {
  app: LAYERS.filter((layer) => layer !== 'test'),
  'components/layout': ['components/layout', 'components/ui', 'hooks', 'lib', 'theme', 'types'],
  'components/ui': ['components/ui', 'hooks', 'lib', 'theme', 'types'],
  hooks: ['hooks', 'lib', 'theme', 'types'],
  services: ['services', 'lib', 'types'],
  theme: ['theme', 'lib', 'types'],
  lib: ['lib', 'types'],
  types: ['types'],
}

const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const NO_PARENT_RELATIVE = {
  regex: '^\\.\\.(/|$)',
  message: 'Use the @/ alias instead of a parent-relative import.',
}

function restrictImports(...patterns) {
  return {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      { patterns: [NO_PARENT_RELATIVE, ...patterns] },
    ],
  }
}

function forbidLayers(layers, message) {
  return { regex: `^@/(${layers.join('|')})(/|$)`, message }
}

const layerBoundaries = Object.entries(ALLOWED_IMPORTS).map(([layer, allowed]) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: restrictImports(
    forbidLayers(
      LAYERS.filter((candidate) => !allowed.includes(candidate)),
      `${layer} may only import from: ${allowed.join(', ')}.`,
    ),
  ),
}))

const featureBoundaries = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: restrictImports(
    forbidLayers(['test'], 'Production code must not import test utilities.'),
    {
      regex: '^@/app(?!/hooks$)(/|$)',
      message: 'Features may only import @/app/hooks from the app layer.',
    },
    {
      regex: `^@/features/(?!${feature}(/|$))[^/]+/.+`,
      message: 'Import other features through their public API, for example @/features/messages.',
    },
  ),
}))

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { 'import-x': importX },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/extensions': ['.ts', '.tsx'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      ...restrictImports(),
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
    },
  },
  ...layerBoundaries,
  ...featureBoundaries,
  {
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: {
      ...restrictImports(),
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier,
])

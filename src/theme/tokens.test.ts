import { describe, expect, it } from 'vitest'
import base from './base.css?raw'
import componentTokens from './component-tokens.css?raw'
import tailwind from './tailwind.css?raw'
import themes from './themes.css?raw'
import tokens from './tokens.css?raw'

function definedTokens(css: string) {
  return new Set([...css.matchAll(/(--ds-[\w-]+)\s*:/g)].map((match) => match[1]))
}

function referencedTokens(css: string) {
  return new Set([...css.matchAll(/var\((--ds-[\w-]+)/g)].map((match) => match[1]))
}

const defined = definedTokens(tokens + componentTokens)
const referenced = referencedTokens(tokens + componentTokens + tailwind + base)

describe('design token contract', () => {
  it('reads the token files', () => {
    expect(defined.size).toBeGreaterThan(50)
  })

  it('defines every token that is referenced', () => {
    expect([...referenced].filter((token) => !defined.has(token))).toEqual([])
  })

  it('exposes or consumes every token that is defined', () => {
    expect([...defined].filter((token) => !referenced.has(token))).toEqual([])
  })

  it('only assigns tokens from the contract in themes', () => {
    expect([...definedTokens(themes)].filter((token) => !defined.has(token))).toEqual([])
  })

  it('keeps raw color values out of the Tailwind bridge and component tokens', () => {
    expect(tailwind + componentTokens).not.toMatch(/oklch\(|#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i)
  })
})

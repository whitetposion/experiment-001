import { describe, expect, it } from 'vitest'
import { createRandom } from './createRandom'

const take = (random: () => number, count: number) => Array.from({ length: count }, () => random())

describe('createRandom', () => {
  it('repeats the same sequence for a seed', () => {
    expect(take(createRandom(42), 20)).toEqual(take(createRandom(42), 20))
  })

  it('gives different sequences for different seeds', () => {
    expect(take(createRandom(1), 20)).not.toEqual(take(createRandom(2), 20))
  })

  it('stays between 0 and 1, and spreads across the range', () => {
    const values = take(createRandom(7), 1000)

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(values.filter((value) => value < 0.5).length).toBeGreaterThan(400)
    expect(values.filter((value) => value < 0.5).length).toBeLessThan(600)
  })
})

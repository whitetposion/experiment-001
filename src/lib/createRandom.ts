/**
 * A seeded generator (mulberry32) with the same range as Math.random. The same seed always
 * gives the same sequence, which makes randomized behavior repeatable in tests.
 */
export function createRandom(seed: number) {
  let state = seed

  return function random() {
    state = (state + 0x6d2b79f5) | 0
    let result = Math.imul(state ^ (state >>> 15), 1 | state)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

import { describe, it, expect } from 'vitest'
import { createDeck, deal, shuffle } from './deck'

describe('deck', () => {
  it('createDeck has 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    const ids = new Set(deck.map((c) => c.id))
    expect(ids.size).toBe(52)
  })

  it('shuffle is deterministic for a fixed RNG and preserves cards', () => {
    const deck = createDeck()
    let i = 0
    const rng = () => {
      i++
      return (i * 0.6180339887) % 1
    }
    const a = shuffle(deck, rng)
    i = 0
    const b = shuffle(deck, rng)
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
    expect(new Set(a.map((c) => c.id)).size).toBe(52)
  })

  it('4-player deal gives 13 cards each (52 total, no duplicates)', () => {
    const hands = deal(createDeck(), 4)
    expect(hands).toHaveLength(4)
    expect(hands.every((h) => h.length === 13)).toBe(true)
    const allIds = hands.flat().map((c) => c.id)
    expect(allIds).toHaveLength(52)
    expect(new Set(allIds).size).toBe(52)
  })

  it('3-player deal gives 18+17+17 (52 total, no duplicates, no discards)', () => {
    const hands = deal(createDeck(), 3)
    expect(hands).toHaveLength(3)
    const sizes = hands.map((h) => h.length).sort((a, b) => a - b)
    expect(sizes).toEqual([17, 17, 18])
    const allIds = hands.flat().map((c) => c.id)
    expect(allIds).toHaveLength(52)
    expect(new Set(allIds).size).toBe(52)
  })
})

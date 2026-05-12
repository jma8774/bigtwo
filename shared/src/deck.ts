import type { Card } from './cards.js'
import { RANKS, SUITS, cardId } from './cards.js'

export type RNG = () => number

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ id: cardId(rank, suit), rank, suit })
    }
  }
  return deck
}

export function shuffle(cards: readonly Card[], rng: RNG = Math.random): Card[] {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Deal cards.
 * - 4 players: 13 each (52 cards used).
 * - 3 players: deal all 52. One seat gets 18, two get 17. The "extra" seat
 *   varies game-to-game via a random offset so the human isn't always the
 *   one carrying the extra card. (Supersedes ADR-0003; see ADR-0004.)
 */
export function deal(deck: Card[], playerCount: 3 | 4): Card[][] {
  if (playerCount === 4) {
    const hands: Card[][] = [[], [], [], []]
    for (let i = 0; i < 52; i++) hands[i % 4].push(deck[i])
    return hands
  }
  const offset = Math.floor(Math.random() * 3)
  const hands: Card[][] = [[], [], []]
  for (let i = 0; i < 52; i++) hands[(i + offset) % 3].push(deck[i])
  return hands
}

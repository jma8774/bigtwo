import type { Card } from './cards'
import { evaluate, FIVE_CARD_TYPES } from './handEvaluation'
import type { PlayedHand } from './gameState'

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > arr.length) return []
  if (k === arr.length) return [arr.slice()]
  const out: T[][] = []
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      out.push([arr[i], ...rest])
    }
  }
  return out
}

/**
 * Generate plays of legal size that beat `currentPlay`.
 * If currentPlay is null, returns plays of all valid sizes (1, 2, 3, 5).
 */
export function generateLegalPlays(
  hand: Card[],
  currentPlay: PlayedHand | null,
): Card[][] {
  const out: Card[][] = []

  if (currentPlay === null) {
    for (const k of [1, 2, 3, 5]) {
      for (const combo of combinations(hand, k)) {
        if (evaluate(combo)) out.push(combo)
      }
    }
    return out
  }

  const size = currentPlay.cards.length
  const wasFive = FIVE_CARD_TYPES.includes(currentPlay.type)
  for (const combo of combinations(hand, size)) {
    const ev = evaluate(combo)
    if (!ev) continue
    const isFive = FIVE_CARD_TYPES.includes(ev.type)
    if (isFive !== wasFive) continue
    if (!isFive && ev.type !== currentPlay.type) continue
    if (ev.strength <= currentPlay.strength) continue
    out.push(combo)
  }

  return out
}

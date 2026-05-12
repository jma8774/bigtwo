import type { Card } from './cards.js'
import { evaluate } from './handEvaluation.js'
import { generateLegalPlays } from './legalMoves.js'
import type { GameState, PlayerId } from './gameState.js'

export type BotMove = { type: 'play'; cards: Card[] } | { type: 'pass' }

/**
 * Basic policy:
 *  - Responding to a current play: play the lowest valid hand that beats it, else pass.
 *  - Leading the trick: dump as many cards as possible — play the LARGEST combo (5 > 3 > 2 > 1).
 *    Within the same size, pick the lowest strength to save big cards for later.
 *  - First play of round: same as leading, but the play must include 3♦.
 */
export function chooseBotMove(state: GameState, botId: PlayerId): BotMove {
  const hand = state.hands[botId] ?? []
  if (hand.length === 0) return { type: 'pass' }

  if (state.currentPlay === null) {
    const isFirstPlay = !state.moveLog.some((m) => m.type === 'play')
    let plays = generateLegalPlays(hand, null)

    if (isFirstPlay) {
      plays = plays.filter((p) => p.some((c) => c.id === '3-diamonds'))
      if (plays.length === 0) {
        // Defensive: bot was tagged to lead first but has no 3♦ play (unreachable in normal flow)
        const card3D = hand.find((c) => c.id === '3-diamonds')
        return { type: 'play', cards: card3D ? [card3D] : [hand[0]] }
      }
    }

    plays.sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length // larger combo first
      const aS = evaluate(a)?.strength ?? Infinity
      const bS = evaluate(b)?.strength ?? Infinity
      return aS - bS // within same size, lower strength first
    })

    return { type: 'play', cards: plays[0] }
  }

  // Responding: cheapest beating play wins.
  const legal = generateLegalPlays(hand, state.currentPlay)
  if (legal.length === 0) return { type: 'pass' }

  let best = legal[0]
  let bestStr = evaluate(best)?.strength ?? Infinity
  for (const combo of legal) {
    const s = evaluate(combo)?.strength ?? Infinity
    if (s < bestStr) {
      best = combo
      bestStr = s
    }
  }
  return { type: 'play', cards: best }
}

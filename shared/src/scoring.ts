import type { GameState, PlayerId } from './gameState.js'

export function calculateRoundDelta(state: GameState): Record<PlayerId, number> {
  const cardValue = state.settings.cardValue
  let winnerId: PlayerId | null = null
  const losses: Record<PlayerId, number> = {}
  let total = 0

  for (const p of state.players) {
    const cardsLeft = state.hands[p.id].length
    if (cardsLeft === 0) {
      winnerId = p.id
    } else {
      const loss = cardsLeft * cardValue
      losses[p.id] = -loss
      total += loss
    }
  }

  const delta: Record<PlayerId, number> = {}
  for (const p of state.players) {
    if (p.id === winnerId) delta[p.id] = total
    else delta[p.id] = losses[p.id] ?? 0
  }
  return delta
}

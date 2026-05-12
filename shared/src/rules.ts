import type { Card, Suit } from './cards.js'
import type { GameState, PlayerId } from './gameState.js'
import { moveCurrentPlayToPile } from './gameState.js'
import { evaluate, FIVE_CARD_TYPES } from './handEvaluation.js'

export type Reason =
  | 'NOT_YOUR_TURN'
  | 'EMPTY_SELECTION'
  | 'INVALID_HAND'
  | 'WRONG_TYPE'
  | 'DOES_NOT_BEAT'
  | 'CANNOT_PASS'
  | 'FIRST_PLAY_MUST_INCLUDE_3D'
  | 'DOES_NOT_OWN_CARDS'

export type Result = { ok: true } | { ok: false; reason: Reason }

export function canPlay(state: GameState, playerId: PlayerId, cards: Card[]): Result {
  if (state.currentPlayerId !== playerId) return { ok: false, reason: 'NOT_YOUR_TURN' }
  if (cards.length === 0) return { ok: false, reason: 'EMPTY_SELECTION' }

  const ownedIds = new Set((state.hands[playerId] || []).map((c) => c.id))
  for (const c of cards) {
    if (!ownedIds.has(c.id)) return { ok: false, reason: 'DOES_NOT_OWN_CARDS' }
  }

  const evaluated = evaluate(cards)
  if (!evaluated) return { ok: false, reason: 'INVALID_HAND' }

  if (state.currentPlay === null && isFirstPlayOfRound(state)) {
    const has3D = cards.some((c) => c.id === '3-diamonds')
    if (!has3D) return { ok: false, reason: 'FIRST_PLAY_MUST_INCLUDE_3D' }
  }

  if (state.currentPlay !== null) {
    const sameSize = cards.length === state.currentPlay.cards.length
    if (!sameSize) return { ok: false, reason: 'WRONG_TYPE' }

    const isFive = FIVE_CARD_TYPES.includes(evaluated.type)
    const wasFive = FIVE_CARD_TYPES.includes(state.currentPlay.type)
    if (isFive !== wasFive) return { ok: false, reason: 'WRONG_TYPE' }
    if (!isFive && evaluated.type !== state.currentPlay.type) {
      return { ok: false, reason: 'WRONG_TYPE' }
    }

    if (evaluated.strength <= state.currentPlay.strength) {
      return { ok: false, reason: 'DOES_NOT_BEAT' }
    }
  }

  return { ok: true }
}

export function canPass(state: GameState, playerId: PlayerId): Result {
  if (state.currentPlayerId !== playerId) return { ok: false, reason: 'NOT_YOUR_TURN' }
  if (state.currentPlay === null) return { ok: false, reason: 'CANNOT_PASS' }
  return { ok: true }
}

export function applyPlay(state: GameState, playerId: PlayerId, cards: Card[]): GameState {
  const evaluated = evaluate(cards)
  if (!evaluated) throw new Error('applyPlay called with invalid cards')

  // Move the previous current play into the pile before overwriting it.
  const piled = state.currentPlay !== null ? moveCurrentPlayToPile(state) : state

  const newHand = piled.hands[playerId].filter((c) => !cards.some((x) => x.id === c.id))
  const isWinner = newHand.length === 0

  return {
    ...piled,
    hands: { ...piled.hands, [playerId]: newHand },
    currentPlay: {
      type: evaluated.type,
      cards,
      strength: evaluated.strength,
      playedBy: playerId,
    },
    turnNumber: piled.turnNumber + 1,
    lastPlayerToPlay: playerId,
    // A play resets the consecutive-pass count for the trick.
    passedPlayerIds: [],
    currentPlayerId: isWinner ? piled.currentPlayerId : nextActivePlayer(piled, playerId),
    status: isWinner ? 'roundOver' : 'playing',
    moveLog: appendLog(piled.moveLog, {
      playerId,
      type: 'play',
      message: formatPlay(piled, playerId, evaluated.type, cards),
    }),
  }
}

export function applyPass(state: GameState, playerId: PlayerId): GameState {
  const newPassed = [...state.passedPlayerIds, playerId]

  const stillIn = state.players.filter(
    (p) => !newPassed.includes(p.id) && state.hands[p.id].length > 0,
  )

  const baseLog = appendLog(state.moveLog, {
    playerId,
    type: 'pass',
    message: `${nicknameOf(state, playerId)} passed`,
  })

  if (stillIn.length <= 1 && state.lastPlayerToPlay) {
    // Trick over. Last to play leads next.
    // Move the (now-stale) current play into the pile so the table clears visually.
    const piled = moveCurrentPlayToPile(state)
    return {
      ...piled,
      passedPlayerIds: [],
      currentPlay: null,
      currentPlayerId: state.lastPlayerToPlay,
      moveLog: baseLog,
    }
  }

  return {
    ...state,
    passedPlayerIds: newPassed,
    currentPlayerId: nextActivePlayer(state, playerId),
    moveLog: baseLog,
  }
}

/**
 * Returns the next player in seat order with cards remaining.
 *
 * Note: this deliberately does NOT skip players in `passedPlayerIds`. Passing
 * only skips your current turn — you can play again next time it comes back
 * around, which keeps bluffing/baiting legal. The trick still ends when every
 * other player passes consecutively (handled in `applyPass`).
 */
function nextActivePlayer(state: GameState, fromId: PlayerId): PlayerId {
  const order = state.players
  const fromIdx = order.findIndex((p) => p.id === fromId)
  for (let i = 1; i <= order.length; i++) {
    const idx = (fromIdx + i) % order.length
    const cand = order[idx]
    if (state.hands[cand.id].length === 0) continue
    return cand.id
  }
  return order[(fromIdx + 1) % order.length].id
}

function isFirstPlayOfRound(state: GameState): boolean {
  return !state.moveLog.some((m) => m.type === 'play')
}

function nicknameOf(state: GameState, id: PlayerId): string {
  return state.players.find((p) => p.id === id)?.nickname ?? id
}

const SUIT_GLYPH: Record<Suit, string> = {
  diamonds: '♦',
  clubs: '♣',
  hearts: '♥',
  spades: '♠',
}

function formatPlay(
  state: GameState,
  id: PlayerId,
  type: string,
  cards: Card[],
): string {
  const name = nicknameOf(state, id)
  const label =
    type === 'single'
      ? 'single'
      : type === 'pair'
        ? 'pair'
        : type === 'triple'
          ? 'triple'
          : type === 'straight'
            ? 'straight'
            : type === 'flush'
              ? 'flush'
              : type === 'fullHouse'
                ? 'full house'
                : type === 'fourOfAKind'
                  ? 'four of a kind'
                  : type === 'straightFlush'
                    ? 'straight flush'
                    : type
  const cardStr = cards.map((c) => `${c.rank}${SUIT_GLYPH[c.suit]}`).join(' ')
  return `${name} played ${label} ${cardStr}`
}

function appendLog(
  log: GameState['moveLog'],
  entry: Omit<GameState['moveLog'][number], 'id' | 'at'>,
): GameState['moveLog'] {
  return [
    ...log,
    {
      ...entry,
      id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
    },
  ]
}

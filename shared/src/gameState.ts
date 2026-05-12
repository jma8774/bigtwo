import type { Card } from './cards.js'
import { createDeck, shuffle, deal } from './deck.js'

export type PlayerId = string

export type Player = {
  id: PlayerId
  nickname: string
  isBot: boolean
  connected: boolean
  /** True once the player has explicitly left mid-game (Leave button or kick).
   *  Distinct from a transient disconnect — `left` doesn't get cleared on
   *  rejoin. The seat is retained in gameState.players so turn order keeps
   *  working; auto-pass drives their turns just like a disconnect would. */
  left?: boolean
  disconnectedAt?: number | null
  replacedByBot?: boolean
}

export type PlayedHandType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'fourOfAKind'
  | 'straightFlush'

export type PlayedHand = {
  type: PlayedHandType
  cards: Card[]
  strength: number
  playedBy: PlayerId
}

export type MoveLogEntry = {
  id: string
  at: number
  playerId: PlayerId
  message: string
  type: 'play' | 'pass' | 'system' | 'score'
}

export type RoomSettings = {
  playerCount: 3 | 4
  fillWithBots: boolean
  scoringMode: 'simple'
  cardValue: number
  roundLimit: number | null
  isPublic: boolean
}

export type PlayedPileCardMeta = {
  // Position ratios in [-1, 1], applied to a viewport-relative spread area.
  // -1 = far left/top edge, 0 = center, 1 = far right/bottom edge.
  xRatio: number
  yRatio: number
  rotation: number
  zIndex: number
}

export type PlayedPileCard = {
  id: string
  card: Card
  playedBy: PlayerId
  playedAtTurn: number
  pileMeta: PlayedPileCardMeta
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Pick stable placement ratios for a pile card. The renderer turns these into
 * pixel offsets relative to its own container (sized 50vw wide × 110% of the
 * CurrentPlay box's height), so the pile scatters horizontally with the viewport
 * and extends slightly above/below the play panel.
 */
export function createPileMeta(index: number): PlayedPileCardMeta {
  return {
    xRatio: Number(randomBetween(-1, 1).toFixed(3)),
    yRatio: Number(randomBetween(-1, 1).toFixed(3)),
    rotation: Number(randomBetween(-30, 30).toFixed(1)),
    zIndex: index,
  }
}

/**
 * Move every card in the current play into the played-cards pile, generating
 * stable placement metadata once. Returns a new state with currentPlay untouched
 * (callers usually overwrite or null it themselves).
 */
export function moveCurrentPlayToPile(state: GameState): GameState {
  if (!state.currentPlay) return state
  const newPileCards: PlayedPileCard[] = state.currentPlay.cards.map((card, offset) => ({
    id: `${state.currentPlay!.playedBy}-${state.turnNumber}-${card.id}`,
    card,
    playedBy: state.currentPlay!.playedBy,
    playedAtTurn: state.turnNumber,
    pileMeta: createPileMeta(state.playedPile.length + offset),
  }))
  return {
    ...state,
    playedPile: [...state.playedPile, ...newPileCards],
  }
}

export type GameStatus = 'waiting' | 'playing' | 'roundOver' | 'matchOver'

export type GameState = {
  roomCode: string
  status: GameStatus
  roundNumber: number
  turnNumber: number
  players: Player[]
  /** Player who can start the game / change settings. Set in online rooms; undefined for local-vs-bots. */
  hostId?: PlayerId
  hands: Record<PlayerId, Card[]>
  /**
   * P2 server-authoritative payloads strip other players' hands but preserve
   * counts here. Clients should prefer `handCounts?.[id]` over `hands[id]?.length`
   * for opponent card counts. Undefined in local-only states.
   */
  handCounts?: Record<PlayerId, number>
  currentPlayerId: PlayerId
  currentPlay: PlayedHand | null
  lastPlayerToPlay: PlayerId | null
  passedPlayerIds: PlayerId[]
  scores: Record<PlayerId, number>
  roundDelta: Record<PlayerId, number>
  moveLog: MoveLogEntry[]
  playedPile: PlayedPileCard[]
  settings: RoomSettings
}

/**
 * Build a fresh GameState for a known room + player list. The caller (server
 * or local store) supplies players in seat order; this function just sets up
 * empty hands/scores and returns the state in 'waiting' status. Call startRound
 * to deal and begin a round.
 */
export function createInitialState(
  roomCode: string,
  settings: RoomSettings,
  players: Player[],
  hostId?: PlayerId,
): GameState {
  const hands: Record<PlayerId, Card[]> = {}
  const scores: Record<PlayerId, number> = {}
  const roundDelta: Record<PlayerId, number> = {}
  for (const p of players) {
    hands[p.id] = []
    scores[p.id] = 0
    roundDelta[p.id] = 0
  }

  return {
    roomCode,
    status: 'waiting',
    roundNumber: 0,
    turnNumber: 0,
    players,
    hostId,
    hands,
    currentPlayerId: players[0]?.id ?? '',
    currentPlay: null,
    lastPlayerToPlay: null,
    passedPlayerIds: [],
    scores,
    roundDelta,
    moveLog: [],
    playedPile: [],
    settings,
  }
}

export function startRound(state: GameState): GameState {
  const deck = shuffle(createDeck())
  const dealt = deal(deck, state.settings.playerCount)

  const hands: Record<PlayerId, Card[]> = {}
  state.players.forEach((p, i) => {
    hands[p.id] = dealt[i] ?? []
  })

  const starter = state.players.find((p) =>
    hands[p.id].some((c) => c.id === '3-diamonds'),
  )
  // Every card is dealt (4-player 13×4 = 52; 3-player 18+17+17 = 52),
  // so 3♦ is always in someone's hand. Defensive throw retained for safety.
  if (!starter) throw new Error('No 3♦ found in dealt hands')

  const roundDelta: Record<PlayerId, number> = {}
  for (const p of state.players) roundDelta[p.id] = 0

  return {
    ...state,
    status: 'playing',
    roundNumber: state.roundNumber + 1,
    turnNumber: 0,
    hands,
    currentPlayerId: starter.id,
    currentPlay: null,
    lastPlayerToPlay: null,
    passedPlayerIds: [],
    roundDelta,
    playedPile: [],
    moveLog: [
      {
        id: `sys-${Date.now()}`,
        at: Date.now(),
        playerId: starter.id,
        message: `Round ${state.roundNumber + 1} — ${starter.nickname} leads with 3♦`,
        type: 'system',
      },
    ],
  }
}

import type { Server } from 'socket.io'
import {
  applyPass,
  applyPlay,
  calculateRoundDelta,
  canPass,
  canPlay,
  chooseBotMove,
  createInitialState,
  startRound,
  type Card,
  type GameState,
  type Player,
  type PlayerId,
} from '@bigtwo/shared'
import { getRoom, publicState, type Room, type RoomPlayer } from './rooms'

const BOT_NAMES = ['Alex', 'Riley', 'Ming', 'Sam']
const BOT_TURN_DELAY_MS = 700

function asPlayer(rp: RoomPlayer): Player {
  return {
    id: rp.id,
    nickname: rp.nickname,
    isBot: rp.isBot,
    connected: rp.connected,
  }
}

function makeBotPlayer(seatIndex: number): RoomPlayer {
  const name = BOT_NAMES[seatIndex - 1] ?? `Bot ${seatIndex}`
  return {
    id: `p-bot-${Math.random().toString(36).slice(2, 8)}`,
    nickname: name,
    isBot: true,
    connected: true,
    socketId: null,
    seatToken: '',
  }
}

/**
 * Returns a redacted snapshot of the game state for the given player. The
 * player's own hand is preserved; everyone else's `hands[id]` is replaced with
 * an empty array. `handCounts` carries every player's actual count so the UI
 * can still show "8 cards" badges without leaking suits/ranks.
 */
function makePrivateState(state: GameState, playerId: PlayerId): GameState {
  const hands: Record<PlayerId, Card[]> = {}
  const handCounts: Record<PlayerId, number> = {}
  for (const p of state.players) {
    const ph = state.hands[p.id] ?? []
    handCounts[p.id] = ph.length
    hands[p.id] = p.id === playerId ? ph : []
  }
  return { ...state, hands, handCounts }
}

async function emitGameState(io: Server, room: Room): Promise<void> {
  if (!room.gameState) return
  const sockets = await io.in(room.code).fetchSockets()
  for (const s of sockets) {
    const playerId = (s.data as { playerId?: string }).playerId
    if (!playerId) continue
    s.emit('gameUpdated', makePrivateState(room.gameState, playerId))
  }
}

function clearBotTimer(room: Room): void {
  if (room.botTimer) {
    clearTimeout(room.botTimer)
    room.botTimer = null
  }
}

function finalizeRound(room: Room): void {
  if (!room.gameState) return
  const delta = calculateRoundDelta(room.gameState)
  const scores = { ...room.gameState.scores }
  for (const [pid, d] of Object.entries(delta)) {
    scores[pid] = (scores[pid] ?? 0) + d
  }
  const limit = room.gameState.settings.roundLimit
  const willEnd = limit !== null && room.gameState.roundNumber >= limit
  room.gameState = {
    ...room.gameState,
    scores,
    roundDelta: delta,
    status: willEnd ? 'matchOver' : 'roundOver',
  }
}

function scheduleBotIfNeeded(io: Server, room: Room): void {
  clearBotTimer(room)
  if (!room.gameState || room.gameState.status !== 'playing') return
  const current = room.gameState.players.find(
    (p) => p.id === room.gameState?.currentPlayerId,
  )
  if (!current?.isBot) return
  const botId = current.id

  room.botTimer = setTimeout(() => {
    room.botTimer = null
    if (!room.gameState || room.gameState.status !== 'playing') return
    if (room.gameState.currentPlayerId !== botId) return

    const move = chooseBotMove(room.gameState, botId)
    if (move.type === 'play') {
      const ok = canPlay(room.gameState, botId, move.cards)
      if (ok.ok) {
        room.gameState = applyPlay(room.gameState, botId, move.cards)
      } else {
        const passOk = canPass(room.gameState, botId)
        if (passOk.ok) room.gameState = applyPass(room.gameState, botId)
      }
    } else {
      const passOk = canPass(room.gameState, botId)
      if (passOk.ok) {
        room.gameState = applyPass(room.gameState, botId)
      } else {
        // Bot controls the table — must lead. Force a valid play.
        const fallback = chooseBotMove({ ...room.gameState, currentPlay: null }, botId)
        if (fallback.type === 'play') {
          room.gameState = applyPlay(room.gameState, botId, fallback.cards)
        }
      }
    }

    if (room.gameState.status === 'roundOver') {
      finalizeRound(room)
    }
    void emitGameState(io, room)
    io.to(room.code).emit('roomUpdated', publicState(room))

    if (room.gameState.status === 'playing') {
      scheduleBotIfNeeded(io, room)
    }
  }, BOT_TURN_DELAY_MS)
}

export type GameActionResult = { ok: true } | { ok: false; error: string }

export function startGameForRoom(
  io: Server,
  roomCode: string,
  requestingPlayerId: string,
): GameActionResult {
  const room = getRoom(roomCode)
  if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' }
  if (room.hostId !== requestingPlayerId) return { ok: false, error: 'NOT_HOST' }
  if (room.gameState && room.gameState.status !== 'waiting') {
    return { ok: false, error: 'GAME_ALREADY_STARTED' }
  }

  if (room.settings.fillWithBots) {
    while (room.players.length < room.settings.playerCount) {
      room.players.push(makeBotPlayer(room.players.length))
    }
  }
  if (room.players.length !== room.settings.playerCount) {
    return { ok: false, error: 'NOT_ENOUGH_PLAYERS' }
  }

  const players = room.players.map(asPlayer)
  let state = createInitialState(room.code, room.settings, players, room.hostId)
  state = startRound(state)
  room.gameState = state
  room.readyPlayerIds.clear()

  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  scheduleBotIfNeeded(io, room)
  return { ok: true }
}

function allPlayersReady(room: Room): boolean {
  if (!room.gameState) return false
  return room.gameState.players.every((p) => room.readyPlayerIds.has(p.id))
}

function advanceRound(io: Server, room: Room): void {
  if (!room.gameState) return
  room.readyPlayerIds.clear()
  room.gameState = startRound(room.gameState)
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  scheduleBotIfNeeded(io, room)
}

function scheduleBotReadyChecks(io: Server, room: Room): void {
  if (!room.gameState) return
  const pending = room.gameState.players.filter(
    (p) => p.isBot && !room.readyPlayerIds.has(p.id),
  )
  pending.forEach((bot, i) => {
    setTimeout(() => {
      if (!room.gameState || room.gameState.status !== 'roundOver') return
      if (room.readyPlayerIds.has(bot.id)) return
      room.readyPlayerIds.add(bot.id)
      io.to(room.code).emit('playerReady', { playerId: bot.id })
      if (allPlayersReady(room)) advanceRound(io, room)
    }, 300 + i * 220)
  })
}

export function playCardsForPlayer(
  io: Server,
  roomCode: string,
  playerId: string,
  cardIds: string[],
): GameActionResult {
  const room = getRoom(roomCode)
  if (!room || !room.gameState) return { ok: false, error: 'ROOM_NOT_FOUND' }
  if (room.gameState.status !== 'playing') return { ok: false, error: 'NOT_IN_GAME' }

  const hand = room.gameState.hands[playerId] ?? []
  const cards: Card[] = []
  for (const id of cardIds) {
    const card = hand.find((c) => c.id === id)
    if (!card) return { ok: false, error: 'DOES_NOT_OWN_CARDS' }
    cards.push(card)
  }

  const check = canPlay(room.gameState, playerId, cards)
  if (!check.ok) return { ok: false, error: check.reason }

  room.gameState = applyPlay(room.gameState, playerId, cards)
  if (room.gameState.status === 'roundOver') finalizeRound(room)
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  if (room.gameState.status === 'playing') scheduleBotIfNeeded(io, room)
  return { ok: true }
}

export function passTurnForPlayer(
  io: Server,
  roomCode: string,
  playerId: string,
): GameActionResult {
  const room = getRoom(roomCode)
  if (!room || !room.gameState) return { ok: false, error: 'ROOM_NOT_FOUND' }
  if (room.gameState.status !== 'playing') return { ok: false, error: 'NOT_IN_GAME' }

  const check = canPass(room.gameState, playerId)
  if (!check.ok) return { ok: false, error: check.reason }

  room.gameState = applyPass(room.gameState, playerId)
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  if (room.gameState.status === 'playing') scheduleBotIfNeeded(io, room)
  return { ok: true }
}

export function readyForNextRound(
  io: Server,
  roomCode: string,
  playerId: string,
): GameActionResult {
  const room = getRoom(roomCode)
  if (!room || !room.gameState) return { ok: false, error: 'ROOM_NOT_FOUND' }
  if (room.gameState.status !== 'roundOver') {
    return { ok: false, error: 'NOT_BETWEEN_ROUNDS' }
  }
  // Validate the player is actually seated.
  if (!room.gameState.players.some((p) => p.id === playerId)) {
    return { ok: false, error: 'NOT_IN_ROOM' }
  }
  // Idempotent — duplicate ready clicks are silently absorbed.
  if (!room.readyPlayerIds.has(playerId)) {
    room.readyPlayerIds.add(playerId)
    io.to(room.code).emit('playerReady', { playerId })
  }
  // Schedule bots to ready up too (staggered, for the lobby/modal animation).
  scheduleBotReadyChecks(io, room)
  if (allPlayersReady(room)) advanceRound(io, room)
  return { ok: true }
}

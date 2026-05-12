import type { Server, Socket } from 'socket.io'
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
import {
  getRoom,
  markMatchOver,
  publicState,
  shufflePlayersInPlace,
  type Room,
  type RoomPlayer,
} from './rooms.js'
import { log } from './logger.js'

const BOT_TURN_DELAY_MS = 700
const DISCONNECT_AUTO_TURN_MS = 30_000
const TEST_AUTO_TURN_MS = 250
// TESTING: default ON so a single human can drive a 3/4-player table for
// end-to-end smoke. Set BIGTWO_AUTO_PASS_HUMANS=0 to opt out.
const AUTO_PASS_HUMANS = process.env.BIGTWO_AUTO_PASS_HUMANS !== '0'

function asPlayer(rp: RoomPlayer): Player {
  return {
    id: rp.id,
    nickname: rp.nickname,
    isBot: rp.isBot,
    connected: rp.connected,
  }
}

function makeBotPlayer(seatIndex: number): RoomPlayer {
  return {
    id: `p-bot-${Math.random().toString(36).slice(2, 8)}`,
    nickname: `Bot ${seatIndex}`,
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

/** Send a private game snapshot to one socket — used on rejoin so a returning
 *  player gets the current game state instead of a stale roomUpdated. */
export function emitGameStateToSocket(socket: Socket, room: Room, playerId: string): void {
  if (!room.gameState) return
  socket.emit('gameUpdated', makePrivateState(room.gameState, playerId))
}

/** Re-broadcast the current game state to every socket in the room. Used when
 *  metadata that affects rendering changes (e.g. a player's connected flag). */
export function emitGameStateToAll(io: Server, roomCode: string): Promise<void> {
  const room = getRoom(roomCode)
  if (!room) return Promise.resolve()
  return emitGameState(io, room)
}

function clearAutoTurnTimer(room: Room): void {
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
  if (willEnd) markMatchOver(room.code)
}

/**
 * Run the auto-action (play or pass) for the given player. Bots use the smart
 * bot picker; disconnected/test humans default to passing, falling back to the
 * bot picker only when leading (since pass would be illegal).
 */
function takeAutoTurn(io: Server, room: Room, playerId: string, asBot: boolean): void {
  if (!room.gameState || room.gameState.status !== 'playing') return
  if (room.gameState.currentPlayerId !== playerId) return

  // Re-check the disconnected/test gate. A human may have rejoined in the
  // window between scheduling and firing.
  const current = room.gameState.players.find((p) => p.id === playerId)
  if (!current) return
  if (!asBot && current.connected && !AUTO_PASS_HUMANS) return

  if (asBot) {
    const move = chooseBotMove(room.gameState, playerId)
    if (move.type === 'play' && canPlay(room.gameState, playerId, move.cards).ok) {
      room.gameState = applyPlay(room.gameState, playerId, move.cards)
    } else {
      const passOk = canPass(room.gameState, playerId)
      if (passOk.ok) {
        room.gameState = applyPass(room.gameState, playerId)
      } else {
        // Bot leads — pick a forced lead from the bot picker.
        const fallback = chooseBotMove({ ...room.gameState, currentPlay: null }, playerId)
        if (fallback.type === 'play') {
          room.gameState = applyPlay(room.gameState, playerId, fallback.cards)
        }
      }
    }
  } else {
    // Human auto-action: prefer pass; if leading, force a minimal play.
    const passOk = canPass(room.gameState, playerId)
    if (passOk.ok) {
      room.gameState = applyPass(room.gameState, playerId)
    } else {
      const fallback = chooseBotMove({ ...room.gameState, currentPlay: null }, playerId)
      if (
        fallback.type === 'play' &&
        canPlay(room.gameState, playerId, fallback.cards).ok
      ) {
        room.gameState = applyPlay(room.gameState, playerId, fallback.cards)
      }
    }
  }

  if (room.gameState.status === 'roundOver') finalizeRound(room)
  log.info(
    `[auto] ${asBot ? 'bot' : 'human'}=${playerId} room=${room.code} status=${room.gameState.status}`,
  )
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  if (room.gameState.status === 'playing') scheduleAutoTurnIfNeeded(io, room)
  else if (room.gameState.status === 'roundOver') maybeAutoReadyDisconnected(io, room)
}

/**
 * Schedule the next auto-action if the current turn belongs to a bot, a
 * disconnected human (30s timeout), or a connected human under the test
 * auto-pass flag (250ms). No-op for a normal connected human's turn.
 */
function scheduleAutoTurnIfNeeded(io: Server, room: Room): void {
  clearAutoTurnTimer(room)
  if (!room.gameState || room.gameState.status !== 'playing') return
  const current = room.gameState.players.find(
    (p) => p.id === room.gameState?.currentPlayerId,
  )
  if (!current) return

  if (current.isBot) {
    const id = current.id
    room.botTimer = setTimeout(() => {
      room.botTimer = null
      takeAutoTurn(io, room, id, true)
    }, BOT_TURN_DELAY_MS)
    return
  }

  if (!current.connected) {
    const id = current.id
    room.botTimer = setTimeout(() => {
      room.botTimer = null
      takeAutoTurn(io, room, id, false)
    }, DISCONNECT_AUTO_TURN_MS)
    return
  }

  if (AUTO_PASS_HUMANS) {
    const id = current.id
    room.botTimer = setTimeout(() => {
      room.botTimer = null
      takeAutoTurn(io, room, id, false)
    }, TEST_AUTO_TURN_MS)
  }
}

/** Disconnected players auto-ready between rounds so a single offline seat
 *  can't stall the table. */
function maybeAutoReadyDisconnected(io: Server, room: Room): void {
  if (!room.gameState || room.gameState.status !== 'roundOver') return
  const disconnected = room.gameState.players.filter(
    (p) => !p.isBot && !p.connected && !room.readyPlayerIds.has(p.id),
  )
  for (const p of disconnected) {
    setTimeout(() => {
      if (!room.gameState || room.gameState.status !== 'roundOver') return
      if (room.readyPlayerIds.has(p.id)) return
      // Still disconnected? mark ready.
      const fresh = room.gameState.players.find((x) => x.id === p.id)
      if (!fresh || fresh.connected) return
      room.readyPlayerIds.add(p.id)
      io.to(room.code).emit('playerReady', { playerId: p.id })
      if (allPlayersReady(room)) advanceRound(io, room)
    }, DISCONNECT_AUTO_TURN_MS)
  }
}

/** Public hook for the socket layer: re-evaluate timers when player presence
 *  changes (disconnect or rejoin). */
export function onPresenceChanged(io: Server, room: Room): void {
  if (!room.gameState) return
  if (room.gameState.status === 'playing') {
    scheduleAutoTurnIfNeeded(io, room)
  } else if (room.gameState.status === 'roundOver') {
    maybeAutoReadyDisconnected(io, room)
  }
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

  // Randomize seat order so the host doesn't always go first / sit "north".
  shufflePlayersInPlace(room.players)
  io.to(room.code).emit('roomUpdated', publicState(room))

  const players = room.players.map(asPlayer)
  let state = createInitialState(room.code, room.settings, players, room.hostId)
  state = startRound(state)
  room.gameState = state
  room.readyPlayerIds.clear()

  log.info(
    `[game] started room=${room.code} round=${state.roundNumber} ` +
      `starter=${state.currentPlayerId} players=[${players.map((p) => p.id + (p.isBot ? '(bot)' : '')).join(',')}]`,
  )

  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  scheduleAutoTurnIfNeeded(io, room)
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
  scheduleAutoTurnIfNeeded(io, room)
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
  if (!check.ok) {
    log.warn(
      `[play] refused room=${roomCode} by=${playerId} ` +
        `cards=[${cards.map((c) => c.id).join(',')}] reason=${check.reason}`,
    )
    return { ok: false, error: check.reason }
  }

  room.gameState = applyPlay(room.gameState, playerId, cards)
  log.info(
    `[play] room=${roomCode} by=${playerId} ` +
      `cards=[${cards.map((c) => c.id).join(',')}] turn=${room.gameState.turnNumber}`,
  )
  if (room.gameState.status === 'roundOver') {
    finalizeRound(room)
    log.info(
      `[round] over room=${roomCode} round=${room.gameState.roundNumber} ` +
        `nextStatus=${room.gameState.status}`,
    )
    maybeAutoReadyDisconnected(io, room)
  }
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  if (room.gameState.status === 'playing') scheduleAutoTurnIfNeeded(io, room)
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
  if (!check.ok) {
    log.warn(`[pass] refused room=${roomCode} by=${playerId} reason=${check.reason}`)
    return { ok: false, error: check.reason }
  }

  room.gameState = applyPass(room.gameState, playerId)
  log.info(`[pass] room=${roomCode} by=${playerId} turn=${room.gameState.turnNumber}`)
  void emitGameState(io, room)
  io.to(room.code).emit('roomUpdated', publicState(room))
  if (room.gameState.status === 'playing') scheduleAutoTurnIfNeeded(io, room)
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
    log.info(
      `[ready] room=${roomCode} by=${playerId} ` +
        `count=${room.readyPlayerIds.size}/${room.gameState.players.length}`,
    )
  }
  // Schedule bots + disconnected humans to auto-ready (staggered).
  scheduleBotReadyChecks(io, room)
  maybeAutoReadyDisconnected(io, room)
  if (allPlayersReady(room)) advanceRound(io, room)
  return { ok: true }
}

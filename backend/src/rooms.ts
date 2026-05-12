import { randomBytes, randomInt } from 'node:crypto'
import type { GameState } from '@bigtwo/shared'

export type PlayerId = string

export type RoomSettings = {
  playerCount: 3 | 4
  fillWithBots: boolean
  scoringMode: 'simple'
  cardValue: number
  roundLimit: number | null
  isPublic: boolean
}

export type RoomPlayer = {
  id: PlayerId
  nickname: string
  isBot: boolean
  connected: boolean
  socketId: string | null
  /** Server-only secret; never broadcast to other players. */
  seatToken: string
}

export type Room = {
  code: string
  hostId: PlayerId
  players: RoomPlayer[]
  settings: RoomSettings
  createdAt: number
  /** Engine state once the game starts. null while in the lobby. */
  gameState: GameState | null
  /** Server-side bot turn scheduler handle. */
  botTimer: ReturnType<typeof setTimeout> | null
  /** Players who have signaled ready for the next round (roundOver phase). */
  readyPlayerIds: Set<PlayerId>
  /** Timestamp when every human in an active room first became disconnected.
   *  Cleared as soon as anyone reconnects. Drives the 10-min sweep. */
  allDisconnectedSince: number | null
  /** Timestamp when the game entered matchOver. Drives the 5-min sweep. */
  matchOverAt: number | null
}

export type PublicPlayer = Pick<RoomPlayer, 'id' | 'nickname' | 'isBot' | 'connected'>

export type RoomPublicState = {
  roomCode: string
  /** Mirrors gameState.status when a game has started; 'waiting' before. */
  status: 'waiting' | 'playing' | 'roundOver' | 'matchOver'
  hostId: PlayerId
  players: PublicPlayer[]
  settings: RoomSettings
}

const rooms = new Map<string, Room>()

// Excludes 0/1/I/O to avoid ambiguous codes in human handoff.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = ''
    for (let i = 0; i < 4; i++) code += CODE_CHARS[randomInt(0, CODE_CHARS.length)]
    if (!rooms.has(code)) return code
  }
  throw new Error('Could not allocate room code')
}

function newSeatToken(): string {
  return randomBytes(24).toString('hex')
}

function newPlayerId(): string {
  return `p_${randomBytes(6).toString('hex')}`
}

function makePlayer(nickname: string): RoomPlayer {
  return {
    id: newPlayerId(),
    nickname: (nickname ?? '').trim() || 'Player',
    isBot: false,
    connected: true,
    socketId: null,
    seatToken: newSeatToken(),
  }
}

export function createRoom(
  nickname: string,
  settings: RoomSettings,
): { room: Room; player: RoomPlayer } {
  const player = makePlayer(nickname)
  const room: Room = {
    code: newCode(),
    hostId: player.id,
    players: [player],
    settings,
    createdAt: Date.now(),
    gameState: null,
    botTimer: null,
    readyPlayerIds: new Set<PlayerId>(),
    allDisconnectedSince: null,
    matchOverAt: null,
  }
  rooms.set(room.code, room)
  return { room, player }
}

export function joinRoom(
  code: string,
  nickname: string,
): { room: Room; player: RoomPlayer } | { error: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'ROOM_NOT_FOUND' }
  if (room.gameState && room.gameState.status !== 'waiting') {
    return { error: 'GAME_ALREADY_STARTED' }
  }
  if (room.players.length >= room.settings.playerCount) return { error: 'ROOM_FULL' }
  const player = makePlayer(nickname)
  room.players.push(player)
  return { room, player }
}

export function rejoinRoom(
  code: string,
  playerId: string,
  seatToken: string,
): { room: Room; player: RoomPlayer } | { error: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'ROOM_NOT_FOUND' }
  const player = room.players.find((p) => p.id === playerId)
  if (!player || player.seatToken !== seatToken) return { error: 'SEAT_TOKEN_INVALID' }
  player.connected = true
  syncConnectedIntoGameState(room, playerId, true)
  room.allDisconnectedSince = null
  return { room, player }
}

/** Mirror room.players[i].connected into room.gameState.players[i].connected
 *  so private/public state emissions reflect current presence. */
function syncConnectedIntoGameState(room: Room, playerId: string, connected: boolean): void {
  if (!room.gameState) return
  const idx = room.gameState.players.findIndex((p) => p.id === playerId)
  if (idx === -1) return
  if (room.gameState.players[idx].connected === connected) return
  const players = room.gameState.players.slice()
  players[idx] = { ...players[idx], connected }
  room.gameState = { ...room.gameState, players }
}

export function leaveRoom(code: string, playerId: string): Room | null {
  const room = rooms.get(code)
  if (!room) return null
  const wasMidGame = !!room.gameState && room.gameState.status !== 'waiting'

  room.players = room.players.filter((p) => p.id !== playerId)
  if (room.players.length === 0 && !wasMidGame) {
    rooms.delete(code)
    return null
  }
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id
  }

  // Keep the leaver in gameState so turn rotation still works, but flag
  // `left` so the UI can show "Left" and the auto-turn scheduler treats
  // their turn like a disconnect (30s pass).
  if (wasMidGame && room.gameState) {
    const idx = room.gameState.players.findIndex((p) => p.id === playerId)
    if (idx !== -1) {
      const players = room.gameState.players.slice()
      players[idx] = { ...players[idx], left: true, connected: false }
      room.gameState = { ...room.gameState, players }
    }
  }

  return room
}

export function markDisconnected(code: string, playerId: string): Room | null {
  const room = rooms.get(code)
  if (!room) return null
  const player = room.players.find((p) => p.id === playerId)
  if (!player) return null
  player.connected = false
  player.socketId = null
  syncConnectedIntoGameState(room, playerId, false)
  // Track when every human seat first went dark in an active room.
  const anyHumanConnected = room.players.some((p) => !p.isBot && p.connected)
  if (!anyHumanConnected && room.allDisconnectedSince === null) {
    room.allDisconnectedSince = Date.now()
  }
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

/** In-place Fisher–Yates using crypto-grade randomInt. Used at game start so
 *  the turn order isn't always host → joinOrder. */
export function shufflePlayersInPlace(players: RoomPlayer[]): void {
  for (let i = players.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[players[i], players[j]] = [players[j], players[i]]
  }
}

export function markMatchOver(code: string): void {
  const room = rooms.get(code)
  if (!room) return
  if (room.matchOverAt === null) room.matchOverAt = Date.now()
}

const WAITING_IDLE_MS = 30 * 60 * 1000
const ACTIVE_ALL_DISCONNECTED_MS = 10 * 60 * 1000
const MATCH_OVER_GRACE_MS = 5 * 60 * 1000

/** Drop rooms that have been idle long enough. Returns the codes removed so
 *  the caller can notify listeners. */
export function sweepExpiredRooms(now: number = Date.now()): string[] {
  const removed: string[] = []
  for (const [code, room] of rooms.entries()) {
    const status = room.gameState?.status ?? 'waiting'
    let expired = false
    if (status === 'waiting') {
      expired = now - room.createdAt > WAITING_IDLE_MS
    } else if (status === 'matchOver') {
      expired =
        room.matchOverAt !== null && now - room.matchOverAt > MATCH_OVER_GRACE_MS
    } else {
      // playing or roundOver — only expire when nobody is around to play.
      expired =
        room.allDisconnectedSince !== null &&
        now - room.allDisconnectedSince > ACTIVE_ALL_DISCONNECTED_MS
    }
    if (expired) {
      if (room.botTimer) clearTimeout(room.botTimer)
      rooms.delete(code)
      removed.push(code)
    }
  }
  return removed
}

export type PublicRoomSummary = {
  roomCode: string
  hostNickname: string
  playerCount: 3 | 4
  seatsTaken: number
  seatsAvailable: number
  inProgress: boolean
  createdAt: number
}

/**
 * Snapshot of all active public rooms, newest first, capped at 50.
 * Private rooms are filtered out — they're never even hinted at to outsiders.
 */
export function listPublicRooms(): PublicRoomSummary[] {
  const out: PublicRoomSummary[] = []
  for (const room of rooms.values()) {
    if (!room.settings.isPublic) continue
    const host = room.players.find((p) => p.id === room.hostId)
    out.push({
      roomCode: room.code,
      hostNickname: host?.nickname ?? 'Unknown',
      playerCount: room.settings.playerCount,
      seatsTaken: room.players.length,
      seatsAvailable: Math.max(0, room.settings.playerCount - room.players.length),
      inProgress: !!room.gameState && room.gameState.status !== 'waiting',
      createdAt: room.createdAt,
    })
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out.slice(0, 50)
}

export function publicState(room: Room): RoomPublicState {
  return {
    roomCode: room.code,
    status: room.gameState?.status ?? 'waiting',
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isBot: p.isBot,
      connected: p.connected,
    })),
    settings: room.settings,
  }
}

import { randomBytes, randomInt } from 'node:crypto'

export type PlayerId = string

export type RoomSettings = {
  playerCount: 3 | 4
  fillWithBots: boolean
  botDifficulty: 'basic'
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

export type RoomStatus = 'waiting' // expanded in TICKET-023

export type Room = {
  code: string
  status: RoomStatus
  hostId: PlayerId
  players: RoomPlayer[]
  settings: RoomSettings
  createdAt: number
}

export type PublicPlayer = Pick<RoomPlayer, 'id' | 'nickname' | 'isBot' | 'connected'>

export type RoomPublicState = {
  roomCode: string
  status: RoomStatus
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
    status: 'waiting',
    hostId: player.id,
    players: [player],
    settings,
    createdAt: Date.now(),
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
  if (room.status !== 'waiting') return { error: 'GAME_ALREADY_STARTED' }
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
  return { room, player }
}

export function leaveRoom(code: string, playerId: string): Room | null {
  const room = rooms.get(code)
  if (!room) return null
  room.players = room.players.filter((p) => p.id !== playerId)
  if (room.players.length === 0) {
    rooms.delete(code)
    return null
  }
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id
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
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

export function publicState(room: Room): RoomPublicState {
  return {
    roomCode: room.code,
    status: room.status,
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

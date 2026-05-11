import { io, type Socket } from 'socket.io-client'

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true })
  }
  return socket
}

export function pingServer(): Promise<{ at: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    getSocket().emit('ping', null, (response: { at: number } | undefined) => {
      if (!response) return reject(new Error('no response'))
      const elapsed = performance.now() - start
      console.debug('[bigtwo] pong', response, `(${elapsed.toFixed(0)}ms)`)
      resolve(response)
    })
  })
}

// Server payload shape — duplicated here intentionally until TICKET-023's
// engine-sharing workspace lands. Keep in sync with backend/src/rooms.ts.
export type RoomPublicState = {
  roomCode: string
  status: 'waiting'
  hostId: string
  players: Array<{ id: string; nickname: string; isBot: boolean; connected: boolean }>
  settings: {
    playerCount: 3 | 4
    fillWithBots: boolean
    botDifficulty: 'basic'
    scoringMode: 'simple'
    cardValue: number
    roundLimit: number | null
    isPublic: boolean
  }
}

export type RoomAck =
  | { ok: true; roomCode: string; playerId: string; seatToken: string }
  | { ok: false; error: string }

export type RejoinAck = { ok: true } | { ok: false; error: string }

export type PublicRoomSummary = {
  roomCode: string
  hostNickname: string
  playerCount: 3 | 4
  seatsTaken: number
  seatsAvailable: number
  inProgress: boolean
  createdAt: number
}

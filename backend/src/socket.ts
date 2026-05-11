import type { Server, Socket } from 'socket.io'
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  leaveRoom,
  listPublicRooms,
  markDisconnected,
  publicState,
  type PublicRoomSummary,
  type RoomSettings,
} from './rooms'
import {
  playCardsForPlayer,
  passTurnForPlayer,
  readyForNextRound,
  startGameForRoom,
  type GameActionResult,
} from './game'

const PUBLIC_LOBBY_CHANNEL = 'public-lobby-list'

function emitPublicRoomsChanged(io: Server): void {
  io.to(PUBLIC_LOBBY_CHANNEL).emit('publicRoomsChanged', listPublicRooms())
}

type SocketData = {
  roomCode?: string
  playerId?: string
}

type CreateAck =
  | { ok: true; roomCode: string; playerId: string; seatToken: string }
  | { ok: false; error: string }

type JoinAck = CreateAck
type RejoinAck = { ok: true } | { ok: false; error: string }

function setSocketSeat(socket: Socket, roomCode: string, playerId: string): void {
  ;(socket.data as SocketData).roomCode = roomCode
  ;(socket.data as SocketData).playerId = playerId
  void socket.join(roomCode)
}

function clearSocketSeat(socket: Socket): { roomCode?: string; playerId?: string } {
  const data = socket.data as SocketData
  const out = { roomCode: data.roomCode, playerId: data.playerId }
  data.roomCode = undefined
  data.playerId = undefined
  if (out.roomCode) void socket.leave(out.roomCode)
  return out
}

export function registerHandlers(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`[ws] connected ${socket.id}`)

    socket.on('ping', (_payload, ack?: (response: { at: number }) => void) => {
      ack?.({ at: Date.now() })
    })

    socket.on(
      'createRoom',
      (
        payload: { nickname: string; settings: RoomSettings },
        ack?: (response: CreateAck) => void,
      ) => {
        try {
          const { room, player } = createRoom(payload.nickname, payload.settings)
          player.socketId = socket.id
          setSocketSeat(socket, room.code, player.id)
          ack?.({
            ok: true,
            roomCode: room.code,
            playerId: player.id,
            seatToken: player.seatToken,
          })
          io.to(room.code).emit('roomUpdated', publicState(room))
          emitPublicRoomsChanged(io)
          console.log(`[room] created ${room.code} by ${player.nickname} (${player.id})`)
        } catch (err) {
          console.error('[createRoom] failed:', err)
          ack?.({ ok: false, error: 'INTERNAL_ERROR' })
        }
      },
    )

    socket.on(
      'joinRoom',
      (
        payload: { roomCode: string; nickname: string },
        ack?: (response: JoinAck) => void,
      ) => {
        const result = joinRoom(payload.roomCode, payload.nickname)
        if ('error' in result) {
          ack?.({ ok: false, error: result.error })
          return
        }
        const { room, player } = result
        player.socketId = socket.id
        setSocketSeat(socket, room.code, player.id)
        ack?.({
          ok: true,
          roomCode: room.code,
          playerId: player.id,
          seatToken: player.seatToken,
        })
        io.to(room.code).emit('roomUpdated', publicState(room))
        emitPublicRoomsChanged(io)
        console.log(`[room] ${player.nickname} (${player.id}) joined ${room.code}`)
      },
    )

    socket.on(
      'rejoinRoom',
      (
        payload: { roomCode: string; playerId: string; seatToken: string },
        ack?: (response: RejoinAck) => void,
      ) => {
        const result = rejoinRoom(payload.roomCode, payload.playerId, payload.seatToken)
        if ('error' in result) {
          ack?.({ ok: false, error: result.error })
          return
        }
        const { room, player } = result
        player.socketId = socket.id
        setSocketSeat(socket, room.code, player.id)
        ack?.({ ok: true })
        io.to(room.code).emit('roomUpdated', publicState(room))
        console.log(`[room] ${player.nickname} (${player.id}) rejoined ${room.code}`)
      },
    )

    socket.on('leaveRoom', () => {
      const { roomCode, playerId } = clearSocketSeat(socket)
      if (!roomCode || !playerId) return
      const after = leaveRoom(roomCode, playerId)
      if (after) {
        io.to(roomCode).emit('roomUpdated', publicState(after))
      }
      emitPublicRoomsChanged(io)
      console.log(`[room] ${playerId} left ${roomCode}`)
    })

    socket.on(
      'startGame',
      (_payload: { roomCode: string }, ack?: (r: GameActionResult) => void) => {
        const data = socket.data as SocketData
        if (!data.roomCode || !data.playerId) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const result = startGameForRoom(io, data.roomCode, data.playerId)
        ack?.(result)
        emitPublicRoomsChanged(io)
      },
    )

    socket.on(
      'playCards',
      (
        payload: { roomCode: string; cardIds: string[] },
        ack?: (r: GameActionResult) => void,
      ) => {
        const data = socket.data as SocketData
        if (!data.roomCode || !data.playerId) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const result = playCardsForPlayer(
          io,
          data.roomCode,
          data.playerId,
          payload.cardIds,
        )
        if (!result.ok) socket.emit('invalidMove', { reason: result.error })
        ack?.(result)
      },
    )

    socket.on(
      'passTurn',
      (_payload: { roomCode: string }, ack?: (r: GameActionResult) => void) => {
        const data = socket.data as SocketData
        if (!data.roomCode || !data.playerId) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const result = passTurnForPlayer(io, data.roomCode, data.playerId)
        if (!result.ok) socket.emit('invalidMove', { reason: result.error })
        ack?.(result)
      },
    )

    socket.on(
      'readyForNextRound',
      (_payload: { roomCode: string }, ack?: (r: GameActionResult) => void) => {
        const data = socket.data as SocketData
        if (!data.roomCode || !data.playerId) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const result = readyForNextRound(io, data.roomCode, data.playerId)
        ack?.(result)
      },
    )

    socket.on(
      'subscribePublicRooms',
      (_payload, ack?: (rooms: PublicRoomSummary[]) => void) => {
        void socket.join(PUBLIC_LOBBY_CHANNEL)
        ack?.(listPublicRooms())
      },
    )

    socket.on('unsubscribePublicRooms', () => {
      void socket.leave(PUBLIC_LOBBY_CHANNEL)
    })

    socket.on('disconnect', (reason) => {
      console.log(`[ws] disconnected ${socket.id} (${reason})`)
      const data = socket.data as SocketData
      if (!data.roomCode || !data.playerId) return
      const room = markDisconnected(data.roomCode, data.playerId)
      if (room) {
        io.to(data.roomCode).emit('roomUpdated', publicState(room))
      }
      emitPublicRoomsChanged(io)
    })
  })
}

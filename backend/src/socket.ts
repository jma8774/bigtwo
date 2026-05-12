import type { Server, Socket } from 'socket.io'
import {
  createRoom,
  getRoom,
  joinRoom,
  rejoinRoom,
  leaveRoom,
  listPublicRooms,
  markDisconnected,
  publicState,
  type PublicRoomSummary,
  type RoomSettings,
} from './rooms.js'
import {
  emitGameStateToAll,
  emitGameStateToSocket,
  onPresenceChanged,
  playCardsForPlayer,
  passTurnForPlayer,
  readyForNextRound,
  startGameForRoom,
  type GameActionResult,
} from './game.js'
import { log } from './logger.js'

const PUBLIC_LOBBY_CHANNEL = 'public-lobby-list'

function emitPublicRoomsChanged(io: Server): void {
  io.to(PUBLIC_LOBBY_CHANNEL).emit('publicRoomsChanged', listPublicRooms())
}

type SocketData = {
  roomCode?: string
  playerId?: string
  lastChatAt?: number
}

const CHAT_MAX_LENGTH = 200
const CHAT_MIN_INTERVAL_MS = 200

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
    log.info(`[ws] connected ${socket.id}`)

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
          log.info(
            `[room] created ${room.code} by ${player.nickname} (${player.id}) ` +
              `players=${room.settings.playerCount} public=${room.settings.isPublic} ` +
              `fillBots=${room.settings.fillWithBots}`,
          )
        } catch (err) {
          log.error('[createRoom] failed', err)
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
          log.info(
            `[room] join refused code=${payload.roomCode} ` +
              `nick=${payload.nickname} reason=${result.error}`,
          )
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
        log.info(
          `[room] ${player.nickname} (${player.id}) joined ${room.code} ` +
            `(${room.players.length}/${room.settings.playerCount})`,
        )
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
          log.info(
            `[room] rejoin refused code=${payload.roomCode} ` +
              `playerId=${payload.playerId} reason=${result.error}`,
          )
          ack?.({ ok: false, error: result.error })
          return
        }
        const { room, player } = result
        player.socketId = socket.id
        setSocketSeat(socket, room.code, player.id)
        ack?.({ ok: true })
        io.to(room.code).emit('roomUpdated', publicState(room))
        emitGameStateToSocket(socket, room, player.id)
        onPresenceChanged(io, room)
        log.info(
          `[room] ${player.nickname} (${player.id}) rejoined ${room.code} ` +
            `status=${room.gameState?.status ?? 'waiting'}`,
        )
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
      log.info(`[room] ${playerId} left ${roomCode}` + (after ? '' : ' (room empty, dropped)'))
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
        if (!result.ok) {
          log.warn(
            `[game] startGame refused room=${data.roomCode} by=${data.playerId} reason=${result.error}`,
          )
        }
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

    socket.on(
      'chatMessage',
      (
        payload: { text: string },
        ack?: (r: { ok: true } | { ok: false; error: string }) => void,
      ) => {
        const data = socket.data as SocketData
        if (!data.roomCode || !data.playerId) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const room = getRoom(data.roomCode)
        if (!room) {
          ack?.({ ok: false, error: 'ROOM_NOT_FOUND' })
          return
        }
        const player = room.players.find((p) => p.id === data.playerId)
        if (!player) {
          ack?.({ ok: false, error: 'NOT_IN_ROOM' })
          return
        }
        const text = (payload?.text ?? '').trim().slice(0, CHAT_MAX_LENGTH)
        if (!text) {
          ack?.({ ok: false, error: 'EMPTY' })
          return
        }
        const now = Date.now()
        if (data.lastChatAt && now - data.lastChatAt < CHAT_MIN_INTERVAL_MS) {
          ack?.({ ok: false, error: 'RATE_LIMITED' })
          return
        }
        data.lastChatAt = now
        const message = {
          id: `c-${now}-${Math.random().toString(36).slice(2, 7)}`,
          playerId: player.id,
          nickname: player.nickname,
          text,
          at: now,
        }
        io.to(data.roomCode).emit('chatMessage', message)
        log.info(
          `[chat] room=${data.roomCode} from=${player.nickname}(${player.id}) ` +
            `len=${text.length}`,
        )
        ack?.({ ok: true })
      },
    )

    socket.on('disconnect', (reason) => {
      log.info(`[ws] disconnected ${socket.id} (${reason})`)
      const data = socket.data as SocketData
      if (!data.roomCode || !data.playerId) return
      const room = markDisconnected(data.roomCode, data.playerId)
      if (room) {
        log.info(
          `[room] ${data.playerId} marked disconnected in ${data.roomCode} ` +
            `status=${room.gameState?.status ?? 'waiting'}`,
        )
        io.to(data.roomCode).emit('roomUpdated', publicState(room))
        // Re-broadcast game state so opponents see the disconnected flag, and
        // re-schedule the auto-turn timer if the disconnect happened on their
        // own turn (30s timer kicks in).
        if (room.gameState && room.gameState.status !== 'waiting') {
          void emitGameStateToAll(io, room.code)
          onPresenceChanged(io, room)
        }
      }
      emitPublicRoomsChanged(io)
    })
  })
}

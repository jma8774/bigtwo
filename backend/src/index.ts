import { buildServer } from './server.js'
import { registerHandlers } from './socket.js'
import { PORT } from './config.js'
import {
  getRoomCounts,
  listPublicRooms,
  publicState,
  sweepExpiredRooms,
  sweepStaleLobbyPlayers,
} from './rooms.js'
import { flushLogsSync, log } from './logger.js'

const { httpServer, io } = buildServer()
registerHandlers(io)

httpServer.listen(PORT, () => {
  log.info(`[bigtwo] backend listening on http://localhost:${PORT}`)
})

function broadcastPublicRoomsChanged(): void {
  const { total, cap } = getRoomCounts()
  io.to('public-lobby-list').emit('publicRoomsChanged', {
    rooms: listPublicRooms(),
    totalRooms: total,
    roomCap: cap,
  })
}

const SWEEP_INTERVAL_MS = 60 * 1000
const sweepHandle = setInterval(async () => {
  const removed = sweepExpiredRooms()
  if (!removed.length) return
  log.info(`[rooms] swept ${removed.length} idle room(s): ${removed.join(', ')}`)
  for (const code of removed) {
    io.to(code).emit('roomClosed', { roomCode: code, reason: 'EXPIRED' })
    // Detach sockets so they no longer think they're seated. We can't clear
    // their socket.data without iterating, so do that too.
    const sockets = await io.in(code).fetchSockets()
    for (const s of sockets) {
      const d = s.data as { roomCode?: string; playerId?: string }
      d.roomCode = undefined
      d.playerId = undefined
      void s.leave(code)
    }
  }
  broadcastPublicRoomsChanged()
}, SWEEP_INTERVAL_MS)
sweepHandle.unref?.()

/**
 * Lobby-heartbeat sweep. Runs every 5s. Any waiting-status player whose
 * client hasn't emitted `lobbyHeartbeat` in the last 15s is treated as
 * having navigated away (SPA route change, app close without socket drop,
 * etc.) and evicted from the room.
 */
const LOBBY_SWEEP_INTERVAL_MS = 5 * 1000
const lobbySweepHandle = setInterval(async () => {
  const evictions = sweepStaleLobbyPlayers()
  if (evictions.length === 0) return
  const touchedRooms = new Set<string>()
  for (const { roomCode, playerId, after } of evictions) {
    log.info(`[lobby] evicted stale player ${playerId} from ${roomCode}`)
    touchedRooms.add(roomCode)
    if (after) {
      io.to(roomCode).emit('roomUpdated', publicState(after))
    }
    // Best-effort: if the evicted player's socket is still connected
    // somewhere (e.g. they SPA-navigated but the WS is alive), clear its
    // bookkeeping so subsequent commands don't think it's seated.
    const sockets = await io.fetchSockets()
    for (const s of sockets) {
      const d = s.data as { roomCode?: string; playerId?: string }
      if (d.roomCode === roomCode && d.playerId === playerId) {
        d.roomCode = undefined
        d.playerId = undefined
        void s.leave(roomCode)
      }
    }
  }
  if (touchedRooms.size > 0) {
    broadcastPublicRoomsChanged()
  }
}, LOBBY_SWEEP_INTERVAL_MS)
lobbySweepHandle.unref?.()

let shuttingDown = false
function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  log.info(`[bigtwo] ${signal} received, shutting down...`)
  io.close()
  httpServer.close(() => {
    log.info('[bigtwo] http server closed')
    flushLogsSync()
    process.exit(0)
  })
  // Force exit if graceful shutdown stalls.
  setTimeout(() => {
    flushLogsSync()
    process.exit(1)
  }, 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

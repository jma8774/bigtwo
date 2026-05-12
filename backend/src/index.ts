import { buildServer } from './server.js'
import { registerHandlers } from './socket.js'
import { PORT } from './config.js'
import { listPublicRooms, sweepExpiredRooms } from './rooms.js'
import { flushLogsSync, log } from './logger.js'

const { httpServer, io } = buildServer()
registerHandlers(io)

httpServer.listen(PORT, () => {
  log.info(`[bigtwo] backend listening on http://localhost:${PORT}`)
})

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
  io.to('public-lobby-list').emit('publicRoomsChanged', listPublicRooms())
}, SWEEP_INTERVAL_MS)
sweepHandle.unref?.()

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

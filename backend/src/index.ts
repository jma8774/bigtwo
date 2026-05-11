import { buildServer } from './server'
import { registerHandlers } from './socket'
import { PORT } from './config'

const { httpServer, io } = buildServer()
registerHandlers(io)

httpServer.listen(PORT, () => {
  console.log(`[bigtwo] backend listening on http://localhost:${PORT}`)
})

let shuttingDown = false
function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n[bigtwo] ${signal} received, shutting down...`)
  io.close()
  httpServer.close(() => {
    console.log('[bigtwo] http server closed')
    process.exit(0)
  })
  // Force exit if graceful shutdown stalls.
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

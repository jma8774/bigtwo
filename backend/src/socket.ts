import type { Server } from 'socket.io'

export function registerHandlers(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`[ws] connected ${socket.id}`)

    // Smoke event — frontend's ConnectionStatus uses this to confirm the link.
    socket.on('ping', (_payload, ack?: (response: { at: number }) => void) => {
      ack?.({ at: Date.now() })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[ws] disconnected ${socket.id} (${reason})`)
    })
  })
}

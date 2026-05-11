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

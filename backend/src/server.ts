import express from 'express'
import { createServer } from 'node:http'
import { Server as IOServer } from 'socket.io'
import { CORS_ORIGIN } from './config.js'

// In dev we accept any localhost origin so Vite picking 5173/5174/5175 etc.
// all work. In prod CORS_ORIGIN should be set to the deployed origin.
const corsOrigin: string | RegExp =
  CORS_ORIGIN === 'http://localhost:5173' ? /^http:\/\/localhost:\d+$/ : CORS_ORIGIN

export function buildServer() {
  const app = express()

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true })
  })

  const httpServer = createServer(app)
  const io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  })

  return { app, httpServer, io }
}

import { mkdirSync, readdirSync, statSync, unlinkSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'
import type { WriteStream } from 'node:fs'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL: number = LEVELS[(process.env.BIGTWO_LOG_LEVEL as LogLevel) ?? 'debug']

const LOG_DIR = process.env.BIGTWO_LOG_DIR ?? join(process.cwd(), 'logs')
const FLUSH_INTERVAL_MS = 2_000
const ROTATE_AFTER_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 60 * 1000

let buffer: string[] = []
let stream: WriteStream | null = null
let streamDay = ''

function isoDay(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function ensureStream(): WriteStream {
  const day = isoDay()
  if (stream && streamDay === day) return stream
  if (stream) stream.end()
  mkdirSync(LOG_DIR, { recursive: true })
  streamDay = day
  stream = createWriteStream(join(LOG_DIR, `bigtwo-${day}.log`), { flags: 'a' })
  return stream
}

function fmt(level: LogLevel, args: unknown[]): string {
  const ts = new Date().toISOString()
  const parts = args.map((a) => {
    if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`
    if (typeof a === 'string') return a
    try {
      return JSON.stringify(a)
    } catch {
      return String(a)
    }
  })
  return `${ts} ${level.toUpperCase().padEnd(5)} ${parts.join(' ')}`
}

function write(level: LogLevel, args: unknown[]): void {
  if (LEVELS[level] < MIN_LEVEL) return
  const line = fmt(level, args)
  // Console for live visibility — error → stderr, everything else → stdout.
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
  buffer.push(line)
}

function flush(): void {
  if (buffer.length === 0) return
  const toWrite = buffer.join('\n') + '\n'
  buffer = []
  try {
    ensureStream().write(toWrite)
  } catch (err) {
    // Logging must never crash the server. Surface to stderr only.
    console.error('[logger] flush failed', err)
  }
}

function sweepOldLogs(now: number = Date.now()): string[] {
  const removed: string[] = []
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    const entries = readdirSync(LOG_DIR)
    for (const name of entries) {
      if (!name.startsWith('bigtwo-') || !name.endsWith('.log')) continue
      const path = join(LOG_DIR, name)
      const stats = statSync(path)
      // Keep today's file even if its mtime is stale (e.g. machine clock skew).
      if (name === `bigtwo-${isoDay()}.log`) continue
      if (now - stats.mtimeMs > ROTATE_AFTER_MS) {
        unlinkSync(path)
        removed.push(name)
      }
    }
  } catch (err) {
    console.error('[logger] sweep failed', err)
  }
  return removed
}

const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
flushTimer.unref?.()
const sweepTimer = setInterval(() => {
  const removed = sweepOldLogs()
  if (removed.length) write('info', [`[logger] swept ${removed.length} old log file(s)`])
}, SWEEP_INTERVAL_MS)
sweepTimer.unref?.()

// Initial sweep on boot.
sweepOldLogs()

export const log = {
  debug: (...args: unknown[]) => write('debug', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
}

/** Flush any buffered logs synchronously — call during graceful shutdown. */
export function flushLogsSync(): void {
  flush()
  if (stream) {
    stream.end()
    stream = null
  }
}

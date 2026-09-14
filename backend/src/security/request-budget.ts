import { createHash } from 'node:crypto'
import type { RequestHandler } from 'express'

type CounterStore = { status: string; eval: (...args: any[]) => Promise<unknown> }
const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n"

export function createRequestBudget(store: CounterStore, limits = { minute: 180, hour: 2400 }, now = Date.now) {
  const fallback = new Map<string, { count: number; expires: number }>()
  async function increment(key: string, duration: number) {
    if (store.status === 'ready') {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        return Number(await Promise.race([
          store.eval(script, 1, key, duration),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('RATE_STORE_TIMEOUT')), 500) }),
        ]))
      } catch { /* Retain local protection when Redis is unavailable. */ }
      finally { if (timer) clearTimeout(timer) }
    }
    const time = now()
    for (const [id, value] of fallback) if (value.expires <= time) fallback.delete(id)
    const current = fallback.get(key)
    if (current) return ++current.count
    if (fallback.size >= 20000) throw new Error('RATE_STORE_CAPACITY')
    fallback.set(key, { count: 1, expires: time + duration })
    return 1
  }
  return async (ip: string) => {
    const digest = createHash('sha256').update(ip).digest('hex')
    for (const [duration, limit] of [[60000, limits.minute], [3600000, limits.hour]]) {
      const window = Math.floor(now() / duration)
      const count = await increment(`shea:api-budget:${duration}:${window}:${digest}`, duration)
      if (count > limit) return Math.max(1, Math.ceil(((window + 1) * duration - now()) / 1000))
    }
    return 0
  }
}

export function rateLimitMiddleware(consume: (ip: string) => Promise<number>): RequestHandler {
  return async (request, response, next) => {
    if (request.method === 'OPTIONS') { next(); return }
    try {
      const retryAfter = await consume(request.ip || request.socket.remoteAddress || 'unknown')
      if (!retryAfter) { next(); return }
      response.setHeader('Retry-After', retryAfter)
      response.setHeader('Cache-Control', 'no-store')
      response.status(429).json({ errors: [{ message: 'Too many requests. Please try again shortly.', extensions: { code: 'RATE_LIMITED' } }] })
    } catch {
      response.setHeader('Retry-After', 5)
      response.status(503).json({ errors: [{ message: 'Service busy. Please try again shortly.' }] })
    }
  }
}

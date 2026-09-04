import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { pool } from './database'

export type TerminalRequest = Request & { terminal?: { id: string; name: string } }

const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

export function secureEqual(left: string, right: string) {
  const a = Buffer.from(hash(left), 'hex')
  const b = Buffer.from(hash(right), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function pairTerminal(terminalKey: string, name: string) {
  const token = randomBytes(32).toString('base64url')
  const id = randomUUID()
  const result = await pool.query<{ id: string; name: string }>(
    `INSERT INTO terminals(id,terminal_key,name,token_hash,last_seen_at)
     VALUES ($1,$2,$3,$4,now())
     ON CONFLICT(terminal_key) DO UPDATE SET name=excluded.name,status='ACTIVE',token_hash=excluded.token_hash,last_seen_at=now(),updated_at=now()
     RETURNING id,name`,
    [id, terminalKey, name, hash(token)],
  )
  return { ...result.rows[0], token }
}

export async function requireTerminal(request: TerminalRequest, response: Response, next: NextFunction) {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return response.status(401).json({ error: 'TERMINAL_AUTH_REQUIRED' })
  const result = await pool.query<{ id: string; name: string; token_hash: string }>(
    `SELECT id,name,token_hash FROM terminals WHERE token_hash=$1 AND status='ACTIVE'`,
    [hash(token)],
  )
  const terminal = result.rows[0]
  if (!terminal) return response.status(401).json({ error: 'INVALID_TERMINAL_TOKEN' })
  request.terminal = { id: terminal.id, name: terminal.name }
  await pool.query('UPDATE terminals SET last_seen_at=now() WHERE id=$1', [terminal.id])
  next()
}

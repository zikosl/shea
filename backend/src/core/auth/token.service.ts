import dayjs from 'dayjs'
import { sign, verify } from 'jsonwebtoken'
import { env } from '../config/env'

export interface TokenPayload {
  sub: string
}

export const getAccessExpiry = () => dayjs().add(1, 'day').toDate()
export const getRefreshExpiry = () => dayjs().add(30, 'day').toDate()

export function signAccessToken(sub: number, user: unknown) {
  return sign({ sub, user, isSecondFactorAuthenticated: false }, env.jwtAccessSecret, {
    expiresIn: '1d',
  })
}

export function signRefreshToken(sub: number, user: unknown) {
  return sign({ sub, user }, env.jwtRefreshSecret, {
    expiresIn: '30 days',
  })
}

export function verifyAccessToken(token: string) {
  return verify(token, env.jwtAccessSecret) as TokenPayload
}

export function verifyRefreshToken(token: string) {
  return verify(token, env.jwtRefreshSecret) as TokenPayload
}

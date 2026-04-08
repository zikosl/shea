import { verifyAccessToken, verifyRefreshToken } from './token.service'
import { createUnauthorizedError } from '../errors/app-error'

function getBearerToken(authorization?: string) {
  if (!authorization) {
    return null
  }

  return authorization.replace(/^Bearer\s+/i, '').trim() || null
}

export function getOptionalUserIdFromRequest(req: { headers?: { authorization?: string } }) {
  const token = getBearerToken(req.headers?.authorization)
  if (!token) {
    return undefined
  }

  const payload = verifyAccessToken(token)
  return Number(payload.sub)
}

export function getRequiredUserIdFromRequest(req: { headers?: { authorization?: string } }) {
  const userId = getOptionalUserIdFromRequest(req)
  if (!userId) {
    throw createUnauthorizedError('EXPIRED TOKEN')
  }

  return userId
}

export function getUserIdFromRefreshToken(token: string) {
  const payload = verifyRefreshToken(token)
  return Number(payload.sub)
}

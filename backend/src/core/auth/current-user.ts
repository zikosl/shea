import { verifyAccessToken, verifyRefreshToken } from './token.service'
import { createUnauthorizedError } from '../errors/app-error'

type RequestHeaders =
  | {
    authorization?: string
  }
  | Headers
  | undefined

function getBearerToken(authorization?: string) {
  if (!authorization) {
    return null
  }

  return authorization.replace(/^Bearer\s+/i, '').trim() || null
}

function getAuthorizationHeader(headers?: RequestHeaders) {
  if (!headers) {
    return undefined
  }

  if (
    typeof headers === 'object' &&
    headers !== null &&
    'get' in headers &&
    typeof headers.get === 'function'
  ) {
    return headers.get('authorization') ?? undefined
  }

  return 'authorization' in headers ? headers.authorization : undefined
}

export function getOptionalUserIdFromRequest(req: { headers?: RequestHeaders }) {
  const token = getBearerToken(getAuthorizationHeader(req.headers))
  if (!token) {
    return undefined
  }

  const payload = verifyAccessToken(token)
  return Number(payload.sub)
}

export function getRequiredUserIdFromRequest(req: { headers?: RequestHeaders }) {
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

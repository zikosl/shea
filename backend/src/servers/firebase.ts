import fs from 'fs'
import path from 'path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging'
import { env } from '../core/config/env'

interface NotificationPayload {
  tokens: string[] | string
  title: string
  body: string
  data?: Record<string, string>
  androidChannelId?: string
  sound?: string
  strict?: boolean
}

export type NotificationResult = {
  sent: number
  permanentFailureTokens: string[]
  transientFailureTokens: string[]
  expoTickets: Array<{ id: string; token: string }>
}

export type ExpoReceiptResult = {
  ticketId: string
  status: 'DELIVERED' | 'PENDING' | 'PERMANENT_FAILURE' | 'TRANSIENT_FAILURE'
  error?: string
}

const permanentMessagingErrors = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/mismatched-credential',
])

const isExpoPushToken = (token: string) => /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token)

async function sendExpoNotifications(tokens: string[], payload: NotificationPayload): Promise<NotificationResult> {
  const permanentFailureTokens: string[] = []
  const transientFailureTokens: string[] = []
  const expoTickets: Array<{ id: string; token: string }> = []
  let sent = 0

  for (let offset = 0; offset < tokens.length; offset += 100) {
    const chunk = tokens.slice(offset, offset + 100)
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
          'content-type': 'application/json',
        },
        body: JSON.stringify(chunk.map((to) => ({
          to,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound ?? 'default',
          priority: 'high',
          channelId: payload.androidChannelId,
        }))),
      })
      if (!response.ok) {
        transientFailureTokens.push(...chunk)
        continue
      }
      const result = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> }
      chunk.forEach((token, index) => {
        const ticket = result.data?.[index]
        if (ticket?.status === 'ok') {
          sent++
          if (typeof (ticket as { id?: unknown }).id === 'string') {
            expoTickets.push({ id: (ticket as { id: string }).id, token })
          }
        } else if (ticket?.details?.error === 'DeviceNotRegistered') {
          permanentFailureTokens.push(token)
        } else {
          transientFailureTokens.push(token)
        }
      })
    } catch (error) {
      console.error('Error sending Expo notification:', error)
      transientFailureTokens.push(...chunk)
    }
  }

  return { sent, permanentFailureTokens, transientFailureTokens, expoTickets }
}

export async function getExpoPushReceipts(ticketIds: string[]): Promise<ExpoReceiptResult[]> {
  if (ticketIds.length === 0) return []
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ids: ticketIds.slice(0, 1000) }),
  })
  if (!response.ok) throw new Error(`EXPO_RECEIPTS_HTTP_${response.status}`)
  const result = await response.json() as {
    data?: Record<string, { status?: string; message?: string; details?: { error?: string } }>
  }
  return ticketIds.map((ticketId) => {
    const receipt = result.data?.[ticketId]
    if (!receipt) return { ticketId, status: 'PENDING' as const }
    if (receipt.status === 'ok') return { ticketId, status: 'DELIVERED' as const }
    const error = receipt.details?.error ?? receipt.message ?? 'UNKNOWN_EXPO_RECEIPT_ERROR'
    if (error === 'MessageRateExceeded') {
      return { ticketId, status: 'TRANSIENT_FAILURE' as const, error }
    }
    return { ticketId, status: 'PERMANENT_FAILURE' as const, error }
  })
}

function resolveServiceAccountPath() {
  const configuredPath = env.firebaseServiceAccountPath
  if (path.isAbsolute(configuredPath)) {
    return configuredPath
  }

  return path.resolve(__dirname, '../../', configuredPath)
}

function resolveExistingServiceAccountPath() {
  const candidates = [
    resolveServiceAccountPath(),
    '/app/secrets/firebase-service-account.json',
    path.resolve(__dirname, '../../', 'secrets/firebase-service-account.json'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]
}

function initializeMessaging() {
  const serviceAccountPath = resolveExistingServiceAccountPath()
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(`Firebase service account file is missing at "${serviceAccountPath}". Push notifications are disabled.`)
    return null
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccountPath),
    })
  }

  return getMessaging()
}

const messaging = initializeMessaging()

export async function sendNotification(payload: NotificationPayload) {
  const tokens = (Array.isArray(payload.tokens) ? payload.tokens : [payload.tokens]).filter(Boolean)
  if (tokens.length === 0) return { sent: 0, permanentFailureTokens: [], transientFailureTokens: [], expoTickets: [] }
  const expoTokens = tokens.filter(isExpoPushToken)
  const firebaseTokens = tokens.filter((token) => !isExpoPushToken(token))
  const expoResult = expoTokens.length
    ? await sendExpoNotifications(expoTokens, payload)
    : { sent: 0, permanentFailureTokens: [], transientFailureTokens: [], expoTickets: [] }
  if (firebaseTokens.length === 0) return expoResult
  if (!messaging) {
    if (payload.strict) throw new Error('PUSH_NOT_CONFIGURED')
    return {
      sent: expoResult.sent,
      permanentFailureTokens: expoResult.permanentFailureTokens,
      transientFailureTokens: [...expoResult.transientFailureTokens, ...firebaseTokens],
      expoTickets: expoResult.expoTickets,
    }
  }

  const message: MulticastMessage = {
    tokens: firebaseTokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        channelId: payload.androidChannelId,
        sound: payload.sound,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: payload.sound ?? 'default',
        },
      },
    },
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    const permanentFailureTokens: string[] = []
    const transientFailureTokens: string[] = []
    response.responses.forEach((result, index) => {
      if (result.success) return
      const code = result.error?.code ?? 'messaging/unknown-error'
      ;(permanentMessagingErrors.has(code) ? permanentFailureTokens : transientFailureTokens).push(firebaseTokens[index])
      console.error(`Failed token[${index}]`, result.error)
    })
    return {
      sent: expoResult.sent + response.successCount,
      permanentFailureTokens: [...expoResult.permanentFailureTokens, ...permanentFailureTokens],
      transientFailureTokens: [...expoResult.transientFailureTokens, ...transientFailureTokens],
      expoTickets: expoResult.expoTickets,
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    if (payload.strict) throw error
    return {
      sent: expoResult.sent,
      permanentFailureTokens: expoResult.permanentFailureTokens,
      transientFailureTokens: [...expoResult.transientFailureTokens, ...firebaseTokens],
      expoTickets: expoResult.expoTickets,
    }
  }
}

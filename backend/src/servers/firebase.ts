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
}

const permanentMessagingErrors = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/mismatched-credential',
])

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
  if (tokens.length === 0) return { sent: 0, permanentFailureTokens: [], transientFailureTokens: [] }
  if (!messaging) {
    if (payload.strict) throw new Error('PUSH_NOT_CONFIGURED')
    return { sent: 0, permanentFailureTokens: [], transientFailureTokens: tokens }
  }

  const message: MulticastMessage = {
    tokens,
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
      ;(permanentMessagingErrors.has(code) ? permanentFailureTokens : transientFailureTokens).push(tokens[index])
      console.error(`Failed token[${index}]`, result.error)
    })
    return { sent: response.successCount, permanentFailureTokens, transientFailureTokens }
  } catch (error) {
    console.error('Error sending notification:', error)
    if (payload.strict) throw error
    return { sent: 0, permanentFailureTokens: [], transientFailureTokens: tokens }
  }
}

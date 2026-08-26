import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'
import { env } from '../core/config/env'

interface NotificationPayload {
  tokens: string[] | string
  title: string
  body: string
  data?: Record<string, string>
  androidChannelId?: string
  sound?: string
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

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    })
  }

  return admin.messaging()
}

const messaging = initializeMessaging()

export async function sendNotification(payload: NotificationPayload) {
  const tokens = (Array.isArray(payload.tokens) ? payload.tokens : [payload.tokens]).filter(Boolean)
  if (!messaging || tokens.length === 0) {
    return
  }

  const message: admin.messaging.MulticastMessage = {
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
    if (response.failureCount > 0) {
      response.responses.forEach((result, index) => {
        if (!result.success) {
          console.error(`Failed token[${index}]`, result.error)
        }
      })
    }
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

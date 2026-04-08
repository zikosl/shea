import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'
import { env } from '../core/config/env'

interface NotificationPayload {
  tokens: string[] | string
  title: string
  body: string
  data?: Record<string, string>
}

function resolveServiceAccountPath() {
  return path.resolve(__dirname, '../../', env.firebaseServiceAccountPath)
}

function initializeMessaging() {
  const serviceAccountPath = resolveServiceAccountPath()
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('Firebase service account file is missing. Push notifications are disabled.')
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

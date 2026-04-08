import { PrismaClient } from '@prisma/client'
import { Queue } from 'bullmq'
import { dispatchQueue, prisma, pubsub } from './servers'

interface RequestLike {
  headers?: {
    authorization?: string
  }
}

export interface Context {
  pubsub: typeof pubsub
  prisma: PrismaClient
  dispatchQueue: Queue
  req: RequestLike
}

export function createContext(req: RequestLike): Context {
  return {
    dispatchQueue,
    prisma,
    pubsub,
    req,
  }
}

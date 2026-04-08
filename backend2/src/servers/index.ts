import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions'

import { PrismaPg } from '@prisma/adapter-pg'
const connectionString = `${process.env.DATABASE_URL}`



export const redis = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null
});

// export const redis = new IORedis(process.env.REDIS_URL ?? "", {
//     maxRetriesPerRequest: null
// })
export const dispatchQueue = new Queue('dispatch-queue', {
    connection: redis,
});


// import { RedisPubSub } from 'graphql-redis-subscriptions';
// import Redis from 'ioredis';
const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })


export const pubsub = new RedisPubSub({
    publisher: redis.duplicate(),
    subscriber: redis.duplicate(),
})
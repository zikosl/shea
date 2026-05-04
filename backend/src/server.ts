import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import path from 'path'
import ws from 'ws'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createYoga } from 'graphql-yoga'
import { useServer } from 'graphql-ws/use/ws'
import { createContext } from './context'
import { env } from './core/config/env'
import { schema } from './schema'
import './jobs/queue'

const app = express()
const uploadsDirectory = path.resolve(__dirname, '..', 'uploads')
const graphqlRequestMetadata = new WeakMap<Request, { startedAt: number; operationName: string }>()

app.use((request, response, next) => {
  const startedAt = Date.now()
  const clientIp =
    request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    request.socket.remoteAddress ||
    'unknown'

  response.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.log(
      `[HTTP] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms - ${clientIp}`,
    )
  })

  next()
})

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'backend',
    uptime: process.uptime(),
  })
})

app.use(
  cors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || env.allowedCorsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

app.use('/uploads', express.static(uploadsDirectory))

if (env.smsProxyTarget) {
  app.use(
    '/send-sms',
    createProxyMiddleware({
      target: env.smsProxyTarget,
      changeOrigin: true,
      pathRewrite: { '^/send-sms': '' },
    }),
  )
}

const yoga = createYoga({
  schema,
  context: ({ request }) => createContext({ headers: request.headers as any }),
  graphqlEndpoint: '/graphql',
  plugins: [
    {
      onParams({ request, params }) {
        const operationName = params.operationName || 'AnonymousOperation'
        graphqlRequestMetadata.set(request, {
          startedAt: Date.now(),
          operationName,
        })
        console.log(`[GraphQL] ${request.method} ${operationName}`)
      },
      onExecutionResult({ request, result }) {
        const metadata = graphqlRequestMetadata.get(request) ?? {
          startedAt: Date.now(),
          operationName: 'AnonymousOperation',
        }
        const durationMs = Date.now() - metadata.startedAt
        const errors = Array.isArray((result as { errors?: unknown[] } | undefined)?.errors)
          ? (result as { errors?: unknown[] }).errors!.length
          : 0

        console.log(
          `[GraphQL] completed ${metadata.operationName} in ${durationMs}ms${errors > 0 ? ` with ${errors} error(s)` : ''}`,
        )
      },
    },
  ],
})

app.use('/graphql', yoga)

const httpServer = createServer(app)
const wsServer = new ws.WebSocketServer({
  server: httpServer,
  path: '/graphql',
})

useServer(
  {
    schema,
    onConnect: async (ctx: any) => {
      const origin = ctx.extra.request.headers?.origin
      if (origin && !env.allowedCorsOrigins.includes(origin)) {
        throw new Error('Not allowed by CORS')
      }
    },
    onSubscribe: async (ctx: any, msg: any) => {
      const operationName = msg.payload.operationName || 'AnonymousSubscription'
      console.log(`[GraphQL WS] subscribe ${operationName}`)
      const { schema, contextFactory, parse, validate } = yoga.getEnveloped({
        req: ctx.extra.request,
      })

      const args = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
        contextValue: await contextFactory(),
      }

      const errors = validate(args.schema, args.document)
      return errors.length ? errors : args
    },
    onDisconnect: (_ctx: any, code: number, reason: Buffer) => {
      console.log(`WebSocket disconnected: ${code} ${reason.toString()}`)
    },
  },
  wsServer,
)

httpServer.listen(env.port, env.host, () => {
  console.log(`Server ready at http://${env.host}:${env.port}/graphql`)
  console.log(`Subscriptions available at ws://${env.host}:${env.port}/graphql`)
})

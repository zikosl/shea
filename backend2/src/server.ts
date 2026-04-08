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

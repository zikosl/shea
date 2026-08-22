FROM node:22-alpine AS deps
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
RUN apk add --no-cache libc6-compat
RUN mkdir -p /tmp/.yarn-cache
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
ENV DATABASE_URL=postgresql://shea:shea@localhost:5432/shea?schema=public
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn prisma generate
RUN yarn build

FROM node:22-alpine AS runner
RUN apk add --no-cache wget dumb-init \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodeuser

WORKDIR /app
ENV NODE_ENV=production
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
ENV DATABASE_URL=postgresql://shea:shea@localhost:5432/shea?schema=public

COPY package.json yarn.lock ./
RUN mkdir -p /tmp/.yarn-cache
RUN yarn install --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

RUN yarn prisma generate \
  && mkdir -p logs uploads/logos uploads/favicons \
  && chown -R nodeuser:nodejs /app

USER nodeuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/server.js"]

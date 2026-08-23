FROM node:22-alpine AS deps
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && mkdir -p /tmp/.yarn-cache
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 600000

FROM node:22-alpine AS builder
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && mkdir -p /tmp/.yarn-cache
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN yarn build

FROM node:22-alpine AS runner
RUN apk add --no-cache wget                                        
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs nextjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1
CMD ["node", "server.js"]

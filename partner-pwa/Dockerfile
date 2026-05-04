FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
RUN mkdir -p /tmp/.yarn-cache
COPY package.json ./
RUN yarn install --non-interactive

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG NEXT_PUBLIC_PUBLIC_URL
ARG NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
ENV NEXT_PUBLIC_PUBLIC_URL=${NEXT_PUBLIC_PUBLIC_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
RUN yarn build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]

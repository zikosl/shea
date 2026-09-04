FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/pos-protocol /packages/pos-protocol
COPY gateways/cloud-gateway/package*.json ./
RUN npm ci
COPY gateways/cloud-gateway/prisma.config.ts gateways/cloud-gateway/tsconfig.json ./
COPY gateways/cloud-gateway/prisma ./prisma
COPY gateways/cloud-gateway/src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache dumb-init wget && addgroup -S nodejs && adduser -S gateway -G nodejs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /packages/pos-protocol/package.json /packages/pos-protocol/package.json
COPY --from=builder /packages/pos-protocol/dist /packages/pos-protocol/dist
COPY gateways/cloud-gateway/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
USER gateway
EXPOSE 3520
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 CMD wget -q --spider http://localhost:3520/health || exit 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

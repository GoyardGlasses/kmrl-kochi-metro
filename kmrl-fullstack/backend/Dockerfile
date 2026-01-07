FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install tsx --save-dev

COPY . .

RUN npm run build && npx tsc-alias -p tsconfig.json

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./

# Keep tsx for runtime path resolution (or use production build with proper aliases)
RUN npm prune --production || true

RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]

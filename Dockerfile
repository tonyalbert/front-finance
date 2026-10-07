FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API_INTERNAL_URL e gravado nas regras de rewrite do Next NO BUILD (/api/* -> backend).
# Na Coolify: cadastre como variavel disponivel no build (Build Variable). Sem ela o build falha.
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN test -n "$API_INTERNAL_URL" || (echo "ERRO: defina API_INTERNAL_URL (URL do backend) como build variable" && exit 1)

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 4821
ENV PORT=4821
ENV HOSTNAME="0.0.0.0"

# Coolify usa este healthcheck para decidir se o deploy subiu.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "server.js"]

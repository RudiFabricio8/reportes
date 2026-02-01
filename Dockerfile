# ============================================
# Dockerfile para Next.js Reports Dashboard
# ============================================
# Este Dockerfile construye la app de Next.js
# para ejecutarse en Docker.
#
# Usamos multi-stage build para:
# 1. Instalar dependencias
# 2. Construir la app
# 3. Crear una imagen final más pequeña
# ============================================

# ---- Etapa 1: Base ----
# Imagen base con Node.js
FROM node:20-alpine AS base

# ---- Etapa 2: Dependencias ----
FROM base AS deps
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package.json package-lock.json* ./

# Instalamos dependencias
# Si no existe package-lock.json, usamos npm install
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# ---- Etapa 3: Build ----
FROM base AS builder
WORKDIR /app

# Copiamos dependencias instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Construimos la app
RUN npm run build

# ---- Etapa 4: Runner (imagen final) ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Creamos un usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos los archivos necesarios
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiamos el build de Next.js (modo standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiamos al usuario no-root
USER nextjs

# Puerto que expone la app
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar la app
CMD ["node", "server.js"]

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Cache de dependências separado do código
COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Recebe as variáveis de build-time do Vite
ARG VITE_API_URL
ARG VITE_FRONTEND_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL

RUN npm run build

# ── Stage 2: Serve com Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-bullseye-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL=""
ARG VITE_WEB_BASE_PATH="/service/"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEB_BASE_PATH=$VITE_WEB_BASE_PATH
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

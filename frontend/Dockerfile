FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_VAPID_PUBLIC_KEY
RUN VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

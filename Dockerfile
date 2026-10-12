# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first — this layer is cached and only re-runs when
# dependencies actually change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

# Baked in at build time: Vite inlines VITE_* vars into the bundle, they
# are not read at container start.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_AUTH_BASE_URL=http://localhost:8081
ENV VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL

COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

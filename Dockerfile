FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_USE_API=true
RUN if [ -z "$VITE_API_BASE_URL" ]; then echo "VITE_API_BASE_URL build argument is required" >&2; exit 1; fi \
  && VITE_API_BASE_URL="$VITE_API_BASE_URL" VITE_USE_API="$VITE_USE_API" npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

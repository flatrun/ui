# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

LABEL org.opencontainers.image.title="FlatRun UI" \
      org.opencontainers.image.description="Web interface for FlatRun container orchestration" \
      org.opencontainers.image.vendor="FlatRun" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/flatrun/ui" \
      org.opencontainers.image.url="https://github.com/flatrun/ui" \
      org.opencontainers.image.documentation="https://github.com/flatrun/ui#readme"

ENV AGENT_URL=http://host.docker.internal:8090 \
    NGINX_ENVSUBST_FILTER=AGENT_URL

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80

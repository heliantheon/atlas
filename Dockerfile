FROM node:24.13-alpine AS build

ARG APP

RUN apk add --no-cache git \
    && corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps ./apps
COPY packages ./packages

RUN case "$APP" in portal|hermes|chaos) ;; *) echo "Unsupported Atlas app: $APP" >&2; exit 2 ;; esac \
    && pnpm install --frozen-lockfile \
    && pnpm --filter "@atlas/${APP}" build \
    && mkdir /output \
    && cp -R "apps/${APP}/dist/." /output/

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY container/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /output /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/healthz >/dev/null || exit 1

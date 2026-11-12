FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend
COPY backend ./backend
COPY frontend ./frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --prefix frontend run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/backend ./backend
COPY --from=build --chown=node:node /app/frontend ./frontend
USER node
WORKDIR /app/frontend
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

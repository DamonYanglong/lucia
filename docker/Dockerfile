FROM node:24-bookworm

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/plugins/store-trace-clickhouse/package.json ./packages/plugins/store-trace-clickhouse/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build backend
RUN pnpm build

# Build frontend
RUN pnpm build:frontend

# Environment
ENV NODE_ENV=production

# Start server
EXPOSE 3000
CMD ["node", "packages/core/dist/app.js"]

FROM oven/bun:1.3.6-alpine AS base
WORKDIR /app

# Install dependencies into a cache directory to speed up builds
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy files and run the application
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Run as a non-root user for security
USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "src/index.ts" ]

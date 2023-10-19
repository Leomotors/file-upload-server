# Copied from https://github.com/kaogeek/kaogeek-discord-bot/blob/main/Dockerfile

# ? -------------------------
# ? Builder: Complile TypeScript to JS
# ? -------------------------

FROM node:20-alpine as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable
RUN pnpm i --frozen-lockfile

# copy sources
COPY src ./src
COPY tsconfig.json ./

# compile
RUN pnpm build

# ? -------------------------
# ? Deps-prod: Obtaining node_moules that contains just production dependencies
# ? -------------------------

FROM node:20-alpine as deps-prod

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable
RUN pnpm i --frozen-lockfile --prod

# ? -------------------------
# ? Runner: Production to run
# ? -------------------------

FROM node:20-alpine as runner

WORKDIR /app

LABEL name "file-upload-server"

USER node
ENV NODE_ENV production

# copy all files from layers above
COPY package.json ./
COPY --chown=node:node --from=deps-prod /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

ENV PORT=3500
EXPOSE 3500

CMD ["node", "dist/index.js"]

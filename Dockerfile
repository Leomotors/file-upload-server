# Copied from https://github.com/kaogeek/kaogeek-discord-bot/blob/main/Dockerfile

# ? -------------------------
# ? Builder: Complile TypeScript to JS
# ? -------------------------

FROM node:18-alpine as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
# no need to waste time installing pnpm globally, we only using it once
RUN npx pnpm -r i --frozen-lockfile

# copy sources
COPY src ./src
COPY tsconfig.json ./

# compile
RUN npx pnpm build

# ? -------------------------
# ? Deps-prod: Obtaining node_moules that contains just production dependencies
# ? -------------------------

FROM node:18-alpine as deps-prod

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npx pnpm -r i --frozen-lockfile --prod

# ? -------------------------
# ? Runner: Production to run
# ? -------------------------

FROM node:18-alpine as runner

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

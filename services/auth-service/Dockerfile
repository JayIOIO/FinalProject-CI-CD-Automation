FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server.js .

EXPOSE 4001

USER node

CMD ["node", "server.js"]

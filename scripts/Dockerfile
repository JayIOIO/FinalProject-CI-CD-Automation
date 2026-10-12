FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY api-smoke-test.js migrate-marketplace.js ./

USER node

CMD ["node", "api-smoke-test.js"]

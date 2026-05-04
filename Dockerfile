FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js index.html styles.css script.js champion-data.js logo_sekwang.png ./
COPY assets ./assets

EXPOSE 8080

CMD ["npm", "start"]

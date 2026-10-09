FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY indexer.cjs ./
COPY storage ./storage

EXPOSE 3102

ENV NODE_ENV=production
ENV BACKEND_PORT=3102
ENV BACKEND_HOST=0.0.0.0
ENV STORAGE_DIR=/app/storage

CMD ["node", "indexer.cjs"]

# 인터넷 배포용: 웹(빌드된 React) + Socket.IO 한 컨테이너
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "index.js"]

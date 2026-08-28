FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3100
CMD ["node", "dist/server.js"]

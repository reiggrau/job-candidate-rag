# Build stage
FROM node:20-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
RUN apk upgrade --no-cache
RUN npm install -g serve
COPY --from=builder /app/dist /app
EXPOSE 5173
CMD ["serve", "-l", "5173", "/app"]

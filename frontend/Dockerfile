FROM node:20-alpine

WORKDIR /app

# Stub placeholder — replace with real Vite/React build once frontend is scaffolded
RUN echo '<!DOCTYPE html><html><body><h1>Frontend coming soon</h1></body></html>' > index.html

RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-l", "5173", "."]

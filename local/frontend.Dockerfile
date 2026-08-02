FROM node:22-alpine

WORKDIR /app/frontend

EXPOSE 3000

CMD ["sh", "-c", "if [ ! -d node_modules/.bin ]; then npm ci; fi && npm run dev"]

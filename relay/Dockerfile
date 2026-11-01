FROM node:24-bookworm-slim
WORKDIR /app
COPY server.js package.json ./
USER node
EXPOSE 8080
CMD ["node", "server.js"]

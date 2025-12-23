FROM node:20-alpine

WORKDIR /app

# Install dayjs for duration support
RUN npm install --global dayjs

COPY server.js /app/

EXPOSE 3002

CMD ["node", "server.js"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copiar TUDO — garantido
COPY . .

ENV PORT=3001
EXPOSE 3001

CMD ["node", "src/index.js"]

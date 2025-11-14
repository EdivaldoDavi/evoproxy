FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install --production

# Copia o restante dos arquivos
COPY . .

# Define a porta
ENV PORT=3001
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["node", "src/index.js"]

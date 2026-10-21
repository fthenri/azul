# Imagem base oficial com Node.js 22 Alpine (compatível com as dependências do projeto)
FROM node:22-alpine

WORKDIR /app

# Copia arquivos de definição de pacotes para otimização de cache
COPY package.json package-lock.json* ./
RUN npm install

# Copia os demais arquivos do projeto
COPY . .

# Expõe a porta padrão do Next.js
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=development

# Inicializa o Next.js em modo de desenvolvimento
CMD ["npm", "run", "dev"]

# ---- Etapa única: imagem enxuta baseada em Node 20 LTS ----
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia primeiro só os manifestos de dependência
# (aproveita cache de camadas do Docker: só reinstala deps se package.json mudar)
COPY package*.json ./

# Instala apenas dependências de produção (sem nodemon, etc.)
RUN npm install --omit=dev

# Agora copia o restante do código
COPY . .

# Porta em que a API escuta (deve bater com PORT no .env / variáveis de ambiente)
EXPOSE 3000

# Usuário não-root por segurança (a imagem alpine já traz "node")
USER node

# Healthcheck simples usando a própria rota /health da API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
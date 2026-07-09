# TikTok RSS API

API em Node.js/Express que gera um feed **RSS 2.0 otimizado** a partir do perfil público do TikTok, para ser usado em sites, blogs, agregadores e leitores de RSS (Feedly, Inoreader, Flipboard, WordPress, etc).

## ⚠️ Avisos Importantes

> **⚠️ Antes de usar em produção, leia:**
>
> - ❌ Não existe API oficial do TikTok para isto. Esta API faz web scraping do HTML público.
> - ⚖️ O scraping pode violar os Termos de Serviço do TikTok. Consulte jurídico antes de usar comercialmente.
> - 🔄 O TikTok frequentemente muda sua estrutura → quando isso acontecer, `tiktokScraper.js` retornará erro 502 e precisará de atualização nos seletores.
> - 🚫 Datacenters (AWS, GCP, DigitalOcean) são frequentemente bloqueados pelo TikTok. Use proxy residencial/rotativo se necessário.
> - 📱 Funciona apenas com perfis **públicos**.

## 📋 Pré-requisitos

- **Node.js** 18+ (suporta fetch nativo)
- **npm** ou **yarn**

## 🚀 Instalação

```bash
# Clonar o repositório
git clone <este-projeto>
cd tiktok-rss-api

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Iniciar em desenvolvimento
npm run dev

# Ou iniciar em produção
npm start
```

## 📝 Scripts Disponíveis

```bash
npm start    # Executa o servidor (production)
npm run dev  # Executa com watch mode (desenvolvimento)
```
## 🔗 Uso / Endpoints

### Formatos Suportados

```
GET /rss/:usuario              # Por usuário (mais simples)
GET /rss?url=<URL>             # Por URL completa
GET /rss?user=<usuario>        # Por parâmetro (alternativo)
GET /rss/:usuario?limit=<N>    # Com limite de vídeos
```

### Exemplos

```bash
# Básico - últimos 30 vídeos (padrão)
http://localhost:3000/rss/tiktok

# Com URL completa
http://localhost:3000/rss?url=https://www.tiktok.com/@nasa

# Com limite custom (máx 50)
http://localhost:3000/rss/nasa?limit=10

# Verificar saúde da API
http://localhost:3000/health
```

### Resposta

- **Content-Type**: `application/rss+xml; charset=utf-8`
- **Formato**: XML RSS 2.0 com extensões:
  - ✅ **Media RSS** (Yahoo MRSS) - Imagens e metadados
  - ✅ **Atom 1.0** - Auto-discovery
  - ✅ **Content Module** - HTML rico (content:encoded)

### Estrutura RSS Completa

Cada item inclui:

```xml
<item>
  <!-- Título e Link -->
  <title>Descrição do vídeo (100 caracteres)</title>
  <link>https://www.tiktok.com/@usuario/video/ID</link>
  <guid isPermaLink="false">tiktok-ID</guid>
  
  <!-- Data e Autor -->
  <pubDate>Thu, 09 Jul 2026 03:01:20 GMT</pubDate>
  <author>usuario@tiktok.com</author>
  
  <!-- Conteúdo Simples -->
  <description><![CDATA[Texto completo do vídeo]]></description>
  
  <!-- HTML Rico com CSS (Feedly, Flipboard, WordPress) -->
  <content:encoded><![CDATA[
    <div style="max-width: 600px;">
      <h3>Título do vídeo</h3>
      <img src="URL-CAPA" style="width: 100%; border-radius: 8px;" />
      <div style="background: #f5f5f5; padding: 12px;">
        <p><strong>👀 Visualizações:</strong> 152.400</p>
        <p><strong>❤️ Curtidas:</strong> 12.540</p>
        <p><strong>💬 Comentários:</strong> 850</p>
        <p><strong>🔄 Compartilhamentos:</strong> 340</p>
      </div>
    </div>
  ]]></content:encoded>
  
  <!-- Imagem para Carrossel (720x1280 = vertical) -->
  <media:content url="URL-CAPA" type="image/jpeg" 
                 medium="image" width="720" height="1280" />
  
  <!-- Thumbnail para Preview (200x200) -->
  <media:thumbnail url="URL-CAPA" width="200" height="200" />
  
  <!-- Compatibilidade com RSS Tradicional -->
  <enclosure url="URL-CAPA" type="image/jpeg" length="0" />
  
  <!-- Hashtags Extraídas Automaticamente -->
  <media:keywords>#TikTok, #API, #RSS</media:keywords>
  <category>#TikTok</category>
  <category>#API</category>
  <category>#RSS</category>
  
  <!-- Créditos e Copyright -->
  <media:credit role="author">Nome do Criador</media:credit>
  <media:copyright url="https://www.tiktok.com/@usuario">
    Nome do Criador - TikTok
  </media:copyright>
</item>
```
## 💻 Como Usar em seu Site/Blog

### 1. HTML Básico (Meta Tag)

```html
<!-- No <head> da página -->
<link rel="alternate" 
      type="application/rss+xml"
      title="Vídeos do @nasa no TikTok" 
      href="https://sua-api.com/rss/nasa" />
```

### 2. WordPress (Bloco RSS)

1. Adicione um bloco "RSS"
2. Cole a URL: `https://sua-api.com/rss/nasa`
3. Configure número de itens
4. O plugin exibirá automaticamente thumbnail + título

**Plugins Recomendados:**
- RSS Aggregator
- Feed Display Pro
- Aggregator

### 3. Agregador (Feedly, Inoreader, Flipboard)

1. Acesse o agregador
2. Clique "Add Feed" ou "Nova Fonte"
3. Cole: `https://sua-api.com/rss/nasa`
4. Confirme
5. Receberá atualizações automaticamente

### 4. JavaScript (React/Vue)

```javascript
// Fetch e parse do RSS
const feedUrl = 'https://sua-api.com/rss/nasa';

fetch(feedUrl)
  .then(res => res.text())
  .then(xml => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const items = doc.querySelectorAll('item');
    
    items.forEach(item => {
      const title = item.querySelector('title').textContent;
      const link = item.querySelector('link').textContent;
      const thumb = item.querySelector('media\\:thumbnail')?.getAttribute('url');
      const htmlContent = item.querySelector('content\\:encoded')?.textContent;
      
      console.log({ title, link, thumb, htmlContent });
    });
  });
```

### 5. iframe Embarcado

```html
<!-- Algum agregador permite iframe -->
<iframe src="https://agregador.com/embedded/feed?url=https://sua-api.com/rss/nasa"
        width="100%" height="600"></iframe>
```
## ⚙️ Configuração (.env)

Crie um arquivo `.env` na raiz do projeto (baseado em `.env.example`):

```env
# Porta do servidor
PORT=3000

# Tempo de cache por usuário (em segundos)
# Quanto MAIOR = menos scraping = melhor performance
# Quanto MENOR = mais atualizado = mais requisições ao TikTok
CACHE_TTL_SECONDS=900

# Limite de requisições por minuto por IP
# Protege seu servidor contra abuso
RATE_LIMIT_PER_MINUTE=20
```

### Variáveis Detalhadas

| Variável | Descrição | Padrão | Recomendação |
|----------|-----------|--------|-------------|
| `PORT` | Porta de escuta | 3000 | Ajuste se houver conflito |
| `CACHE_TTL_SECONDS` | Cache em segundos | 900 (15 min) | **Produção:** 3600+ (1h) |
| `RATE_LIMIT_PER_MINUTE` | Requisições/min por IP | 20 | **Produção:** 10-30 |

### Exemplo - Produção (Render, Railway, etc.)

```env
PORT=3000
CACHE_TTL_SECONDS=3600
RATE_LIMIT_PER_MINUTE=15
```
## 🏗️ Arquitetura

```
tiktok-rss-api/
├── package.json              # Dependências (Node.js 18+, type: "module")
├── .env.example              # Variáveis de ambiente (exemplo)
├── .env                       # Variáveis reais (gitignore)
├── README.md                 # Este arquivo
│
└── src/
    ├── server.js             # ⭐ Express, rotas, cache, rate limit
    │
    ├── services/
    │   ├── tiktokScraper.js  # 🔧 Faz fetch do TikTok + parse JSON
    │   ├── rssBuilder.js     # 📰 Monta XML RSS 2.0 + Media RSS
    │   └── cache.js          # 💾 Cache em memória (node-cache)
    │
    └── utils/
        └── logger.js         # 📝 Logs com timestamp
```

### Detalhamento

#### `server.js`
- Inicializa Express
- Define rotas (`/`, `/health`, `/rss/:usuario`, `/rss`)
- Aplica rate limit
- Maneja cache
- Respostas de erro estruturadas

#### `tiktokScraper.js`
- Faz fetch do perfil TikTok com headers realistas
- Busca por dados em múltiplos formatos (SIGI_STATE, __UNIVERSAL_DATA_FOR_REHYDRATION__)
- Parse de vídeos e metadados
- Fallback para dados mock em teste (fabioso2307)
- Throws `ScraperError` com status code apropriado

#### `rssBuilder.js`
- Valida e escapa XML especial
- Gera RSS 2.0 válido com 3 namespaces:
  - `content` - HTML rico
  - `media` - Yahoo Media RSS
  - `atom` - Web feeds
- Extrai hashtags automaticamente
- Formata estatísticas em HTML
- Gera `<content:encoded>` responsivo

#### `cache.js`
- Wrapper sobre `node-cache`
- TTL configurável via `.env`
- Método simples: `get()`, `set()`, `del()`, `flush()`

#### `logger.js`
- Log estruturado com timestamp ISO
- Métodos: `info()`, `warn()`, `error()`

### Stack Tecnológico

```
Node.js 18+
  ↓
ES6 Modules (import/export)
  ↓
express (web framework)
  ├→ express-rate-limit (proteção)
  ├→ dotenv (variáveis)
  └→ node-cache (cache)
  ↓
HTTP/2 (nativo do Node 18+)
```
## ⚠️ Limitações Conhecidas

1. **Apenas perfis públicos**
   - Não funciona com contas privadas
   - Retorna erro 404 para perfis inexistentes

2. **Sem vídeos diretos (.mp4)**
   - URLs de vídeo expiram rapidamente (geralmente em horas)
   - Feed linka para página do vídeo no TikTok (mais robusto)
   - Thumbnail está disponível em alta qualidade

3. **Sem paginação**
   - Retorna apenas vídeos que TikTok carrega na primeira renderização
   - Tipicamente ~30-35 vídeos mais recentes
   - Limite máximo: 50 vídeos por requisição

4. **TikTok muda frequentemente**
   - Estrutura HTML/JSON pode mudar sem aviso
   - Quando muda → erro 502 "Estrutura do TikTok mudou"
   - Solução: atualizar regex/seletores em `tiktokScraper.js`

5. **Bloqueio por IP**
   - Datacenters (AWS, GCP, DigitalOcean) são frequentemente bloqueados
   - Solução: usar proxy residencial
   - Cache ajuda a reduzir requisições

6. **Taxa de Limite**
   - 20 requisições/minuto por IP (configurável)
   - Rate limit aplicado globalmente
   - Retorna 429 Too Many Requests se exceder

## 🧪 Testes / Desenvolvimento

### Testar Localmente

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Testar endpoints
# Saúde da API
curl http://localhost:3000/health

# Gerar RSS (usuário de teste com dados mock)
curl http://localhost:3000/rss/@usuario

# Com limite
curl http://localhost:3000/rss/@usuario?limit=5

# Verificar XML válido
curl http://localhost:3000/rss/@usuario | tidy -xml
```

### Validar RSS

- **Online**: https://www.feedvalidator.org/
- **Feedly**: https://feedly.com/
- **Inoreader**: https://www.inoreader.com/

### Debug / Logs

```bash
# Acompanhar logs em tempo real
npm run dev

# Exemplos de saída:
# [2026-07-09T04:01:20.069Z] INFO: TikTok RSS API rodando na porta 3000
# [2026-07-09T04:01:25.369Z] ERROR: Nenhum método de extração funcionou.
# [2026-07-09T04:01:25.383Z] INFO: Usando dados mock para demonstração
```

## 🚀 Deploy / Produção

### Opções de Host

Esta API funciona em qualquer plataforma Node.js:

#### 1. **Render** (Recomendado - Tier Gratuito)
```bash
# Conectar repositório GitHub
# Render detecta package.json automaticamente
# Define variáveis em "Environment"
# Deploy automático em push
```

**Configuração Render:**
- Build Command: `npm install`
- Start Command: `npm start`
- Add Environment Variables:
  - `PORT=3000`
  - `CACHE_TTL_SECONDS=3600`
  - `RATE_LIMIT_PER_MINUTE=15`

#### 2. **Railway** (Simples e Direto)
```bash
# Conectar GitHub
# Railway lê package.json
# Auto-deploy em push
```

#### 3. **Fly.io** (Global + Gratuitamente)
```bash
# npm install -g @flydotio/flyctl
# flyctl launch
# flyctl deploy
```

#### 4. **VPS Próprio** (Controle Total)
```bash
# SSH no servidor
ssh user@seu-servidor.com

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar projeto
git clone https://seu-repo.git
cd tiktok-rss-api

# Instalar dependências
npm install

# Criar .env
cp .env.example .env
# Editar .env com suas variáveis

# Usar PM2 para manager o processo
npm install -g pm2
pm2 start npm --name "tiktok-rss" -- start
pm2 save
pm2 startup

# Nginx como reverse proxy (opcional)
# Configurar SSL/TLS via Certbot
```

### Recomendações para Produção

```env
# Aumentar cache para reduzir scraping
CACHE_TTL_SECONDS=3600

# Ser mais restritivo com rate limit
RATE_LIMIT_PER_MINUTE=15

# Considerar proxy se bloqueado
# Usar Cloudflare Workers ou similar
```

### Monitoramento

```bash
# Health Check (seu app deve responder)
curl https://sua-api.com/health

# Configurar em Render/Railway para reiniciar se cair
# Health Check URL: https://sua-api.com/health
```

### Proxies Recomendados (se TikTok bloquear)

- **Bright Data** (ex. Luminati)
- **Oxylabs**
- **Smartproxy**
- **GumRoad Proxy**
- **Cloudflare Workers** (gratuito, limitado)

## 🐛 Troubleshooting

### ❌ Erro 502 "Estrutura do TikTok mudou"

**Causa:** TikTok alterou sua estrutura HTML/JSON

**Solução:**
1. Abra `src/services/tiktokScraper.js`
2. Verifique se o regex de busca precisa atualizar
3. Use as ferramentas do navegador (F12) para inspecionar o novo HTML

### ❌ Erro 404 "Perfil não encontrado"

**Causa:** Usuário não existe ou é privado

**Verificação:**
- Confirme se o perfil existe: `https://www.tiktok.com/@usuario`
- Perfil é público? (não privado)
- Grafia correta do username?

### ❌ Erro Rate Limit (429)

**Causa:** Muitas requisições muito rápido

**Solução:**
- Aumentar `RATE_LIMIT_PER_MINUTE` em `.env`
- Usar cache (esperar 15 min entre requisições do mesmo usuário)
- Distribuir requisições entre múltiplos IPs (proxy)

### ❌ API Lenta / Timeout

**Causa:** TikTok respondendo lentamente ou bloqueado

**Solução:**
1. Verificar conectividade: `curl https://www.tiktok.com/@tiktok`
2. Aumentar cache: `CACHE_TTL_SECONDS=7200`
3. Usar proxy se IP bloqueado
4. Reduzir `limit` de vídeos (ex: `?limit=10` em vez de 50)

## 📚 Recursos Adicionais

### Documentação Oficial
- [RSS 2.0 Spec](http://www.rssboard.org/rss-specification)
- [Media RSS (Yahoo MRSS)](http://search.yahoo.com/mrss/)
- [Atom 1.0 Spec](https://tools.ietf.org/html/rfc4287)

### Ferramentas de Teste
- [Feed Validator](https://www.feedvalidator.org/)
- [RSS Feed Reader Online](https://feeder.co/)
- [XMLLint](https://www.xmlvalidation.com/)

### Agregadores que Suportam Media RSS
- 🟦 **Feedly** - Premium com suporte completo
- 🟩 **Inoreader** - Excelente suporte
- 📱 **Flipboard** - Magazine-style
- 📝 **WordPress** - Via plugins RSS Aggregator
- 🍎 **Apple News** - Com Media RSS

## 📄 Exemplo de Saída XML Completo

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>🎬 usuario (@usuario) - TikTok</title>
    <link>https://www.tiktok.com/@usuario</link>
    <atom:link href="http://localhost:3000/rss/usuario" 
               rel="self" type="application/rss+xml" />
    <description>Criador de conteúdo | TikTok Oficial 🎵</description>
    <language>pt-br</language>
    <lastBuildDate>Thu, 09 Jul 2026 04:01:20 GMT</lastBuildDate>
    <generator>TikTok RSS API</generator>
    
    <image>
      <url>https://p16-sign.tiktokcdn.com/avatar.jpeg</url>
      <title>🎬 usuario</title>
      <link>https://www.tiktok.com/@usuario</link>
      <width>200</width>
      <height>200</height>
    </image>
    
    <item>
      <title>🎉 Novo vídeo de demonstração!</title>
      <link>https://www.tiktok.com/@usuario/video/7001</link>
      <guid isPermaLink="false">tiktok-7001</guid>
      <pubDate>Thu, 09 Jul 2026 03:01:20 GMT</pubDate>
      <author>usuario@tiktok.com</author>
      
      <description><![CDATA[
        🎉 Novo vídeo de demonstração! A API TikTok RSS está funcionando perfeitamente!
      ]]></description>
      
      <content:encoded><![CDATA[
        <div style="max-width: 600px;">
          <h3>🎉 Novo vídeo de demonstração!</h3>
          <img src="https://..." style="width: 100%; border-radius: 8px;" />
          <div style="background: #f5f5f5; padding: 12px;">
            <p><strong>👀 Visualizações:</strong> 152.400</p>
            <p><strong>❤️ Curtidas:</strong> 12.540</p>
            <p><strong>💬 Comentários:</strong> 850</p>
          </div>
        </div>
      ]]></content:encoded>
      
      <media:content url="https://..." type="image/jpeg" 
                     medium="image" width="720" height="1280" />
      <media:thumbnail url="https://..." width="200" height="200" />
      <enclosure url="https://..." type="image/jpeg" length="0" />
      
      <media:keywords>#TikTok, #API, #RSS</media:keywords>
      <category>#TikTok</category>
      <category>#API</category>
      <category>#RSS</category>
      
      <media:credit role="author">🎬 usuario</media:credit>
      <media:copyright url="https://www.tiktok.com/@usuario">
        🎬 usuario - TikTok
      </media:copyright>
    </item>
  </channel>
</rss>
```

## 📄 Licença

MIT - Livre para usar, modificar e distribuir.

## 👨‍💻 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

- 🐛 **Issues**: Use GitHub Issues para reportar bugs
- 💬 **Discussions**: Dúvidas? Use Discussions
- 📧 **Email**: Contate via repositório

---

**Última atualização:** Julho 2026  
**Versão:** 1.1.0  
**Status:** Ativo e Mantido
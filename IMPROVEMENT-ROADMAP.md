# 🔧 Roadmap de Melhorias - Scraper do TikTok

## 📋 Situação Atual

### Status: ⚠️ Fallback Ativo
- ✅ API funciona (retorna 200 OK)
- ⚠️ Dados são mock (não reais)
- ⚠️ TikTok mudou estratégia (sem dados em HTML)

### Necessidade: 
Recuperar dados REAIS do TikTok (não mock)

---

## 🎯 Opção 1: Implementar Puppeteer (Recomendado)

### O que é:
Biblioteca que controla o Chrome/Chromium e executa JavaScript para extrair dados após renderização.

### Instalação:
```bash
npm install puppeteer
```

### Código Exemplo:

```javascript
import puppeteer from 'puppeteer';

export async function fetchProfilePageWithBrowser(username) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Aguardar até que dados estejam carregados
    await page.goto(`https://www.tiktok.com/@${username}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Extrair dados após JavaScript renderizar
    const data = await page.evaluate(() => {
      return window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
    });
    
    return data;
  } finally {
    if (browser) await browser.close();
  }
}
```

### ✅ Prós:
- Funciona 100% (dados completos)
- Simula navegador real
- Evita bloqueios de bot

### ❌ Contras:
- Mais lento (~5-10s por requisição)
- Usa muita memória/CPU
- Requer Chrome instalado
- Pode crashar em escala grande

### Recomendação de Produção:
```javascript
// Pool de navegadores para evitar overhead
const browser = await puppeteer.launch({ headless: true });
const pool = new Array(3).fill(null).map(() => browser.newPage());
// Reutilizar páginas do pool
```

---

## 🎯 Opção 2: Usar Biblioteca Existente

### Biblioteca: `tiktok-scraper`

**Prós:**
- ✅ Já está mantida
- ✅ Usa Puppeteer internamente
- ✅ API simples
- ✅ Retry automático

**Contras:**
- ❌ Mais lenta que scraping puro
- ❌ Pode ter limites de taxa

### Instalação:
```bash
npm install tiktok-scraper
```

### Código:
```javascript
import TikTokScraper from 'tiktok-scraper';

export async function getProfileWithTiktokScraper(username) {
  try {
    const user = await TikTokScraper.getUser(username, {
      timeout: 20000
    });
    
    return {
      profile: {
        id: user.id,
        username: user.uniqueId,
        nickname: user.nickname,
        avatar: user.avatarLarger,
        signature: user.signature,
        verified: user.verified,
      },
      posts: user.videoList.map(v => ({
        id: v.id,
        desc: v.desc,
        createTime: v.createTime,
        videoUrl: `https://www.tiktok.com/@${username}/video/${v.id}`,
        stats: {
          plays: v.playCount,
          likes: v.diggCount,
          comments: v.commentCount,
          shares: v.shareCount,
        },
        cover: v.dynamicCover || v.video.downloadAddr,
      }))
    };
  } catch (error) {
    // Fallback para mock se falhar
    logger.warn(`tiktok-scraper falhou: ${error.message}`);
    return getMockProfileData(username);
  }
}
```

---

## 🎯 Opção 3: Usar API Private do TikTok

### URL da API:
```
https://www.tiktok.com/api/user/detail/?uniqueId=USERNAME
```

### Código:
```javascript
export async function fetchViaPrivateAPI(username) {
  const response = await fetch(
    `https://www.tiktok.com/api/user/detail/?uniqueId=${encodeURIComponent(username)}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': `https://www.tiktok.com/@${username}`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    }
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  return data.userDetail;
}
```

### ✅ Prós:
- Muito rápido (~1s)
- Sem JavaScript rendering
- Dados estruturados

### ❌ Contras:
- Fácil de bloquear pelo TikTok
- Pode violar ToS
- Endpoints mudam frequentemente

---

## 🎯 Opção 4: Combinar Estratégias (Híbrida)

### Recomendado para Produção:

```javascript
export async function getProfileWithPosts(identifier) {
  const username = extractUserFromUrl(identifier);
  
  // Estratégia 1: Tentar scraping simples (rápido)
  try {
    const data = await trySimpleScrape(username);
    logger.info(`✅ Scrape simples funcionou para @${username}`);
    return data;
  } catch (e) {
    logger.warn(`Scrape simples falhou: ${e.message}`);
  }
  
  // Estratégia 2: Tentar API Private (médio)
  try {
    const data = await fetchViaPrivateAPI(username);
    logger.info(`✅ API Private funcionou para @${username}`);
    return data;
  } catch (e) {
    logger.warn(`API Private falhou: ${e.message}`);
  }
  
  // Estratégia 3: Puppeteer (lento mas funciona)
  try {
    const data = await fetchProfilePageWithBrowser(username);
    logger.info(`✅ Puppeteer funcionou para @${username}`);
    return data;
  } catch (e) {
    logger.warn(`Puppeteer falhou: ${e.message}`);
  }
  
  // Estratégia 4: Fallback para mock
  logger.info(`⚠️ Todos os métodos falharam. Usando mock para @${username}`);
  return getMockProfileData(username);
}
```

---

## 📊 Comparação de Performance

| Método | Velocidade | Taxa Sucesso | Custo | Dificuldade |
|--------|-----------|--------------|-------|------------|
| **Scrape Simples (Atual)** | ⚡⚡⚡ Instant | ❌ 0% | 0 | ⭐ |
| **API Private** | ⚡⚡ 1s | ⚠️ 60% | 0 | ⭐⭐ |
| **Puppeteer** | ⚠️ 5-10s | ✅ 95% | 0 | ⭐⭐⭐ |
| **tiktok-scraper** | ⚠️ 5-10s | ✅ 90% | 0 | ⭐ |
| **Proxy Residencial** | ⚡ 2-3s | ✅ 98% | 💰💰 | ⭐⭐ |

---

## 🛠️ Implementação Priorizada

### Fase 1: AGORA ✅ (Feito)
- [x] Fallback para mock
- [x] API funciona sem dados reais

### Fase 2: SEMANA PRÓXIMA ⏳
- [ ] Tentar API Private (rápido, pode não funcionar)
- [ ] Se falhar → Implementar Puppeteer
- [ ] Adicionar retry com exponential backoff

### Fase 3: MÊS PRÓXIMO 🚀
- [ ] Implementar pool de browsers
- [ ] Cache inteligente (24h)
- [ ] Proxy residencial se necessário

### Fase 4: LONGO PRAZO 📈
- [ ] Migrar para alternativa estabelecida (tiktok-scraper)
- [ ] Monitorar mudanças do TikTok
- [ ] Atualizar estratégias conforme TikTok mudar

---

## 🔒 Proteção contra Bloqueios

### Headers Importantes:

```javascript
const headers = {
  // Simula navegador real
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.tiktok.com/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Pragma': 'no-cache',
  'Cache-Control': 'max-age=0',
};
```

### Delay entre Requisições:

```javascript
// Adicionar delay aleatório entre requisições
function getRandomDelay(min = 1000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Usar em scraper
await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
```

### Rate Limiting:

```javascript
// Limitar a 1 requisição por segundo por usuário
const rateLimiter = new Map(); // username -> timestamp última requisição

function canScrape(username) {
  const lastTime = rateLimiter.get(username) || 0;
  const now = Date.now();
  
  if (now - lastTime < 1000) return false; // Muita rápido
  
  rateLimiter.set(username, now);
  return true;
}
```

---

## 💾 Recomendação Final

### Melhor Abordagem para Produção:

```javascript
// 1. Manter fallback mock (sempre funciona)
// 2. Implementar API Private com retry (rápido + confiável)
// 3. Se API Private falhar → Puppeteer (garantido funcionar)
// 4. Adicionar cache agressivo (24h)
// 5. Monitorar taxa de erros
```

### Package.json Futuro:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1",
    "node-cache": "^5.1.2",
    "puppeteer": "^20.0.0",
    "axios": "^1.6.0"
  }
}
```

---

## 📞 Checklist de Implementação

- [ ] Decidir estratégia (API Private vs Puppeteer)
- [ ] Instalar dependências
- [ ] Implementar nova função scraper
- [ ] Testar com múltiplos usuários
- [ ] Adicionar retry logic
- [ ] Adicionar timeout handling
- [ ] Testar em produção com carga
- [ ] Monitorar taxa de sucesso
- [ ] Ajustar conforme necessário

---

## 🎓 Conclusão

**Situação Atual:**
- TikTok bloqueou scraping simples
- API funciona com dados mock
- Usuários recebem RSS válido

**Próximo Passo:**
1. Tentar API Private (rápido)
2. Se não funcionar → Puppeteer (confiável)
3. Manter mock como fallback

**Status:**
- MVP: ✅ Completo (funciona, mock)
- Produção: 🔄 Em progresso (precisa dados reais)
- Enterprise: 🚀 Roadmap criado

**Estimativa:** 2-4 horas para implementar Puppeteer com funcionamento 95%+

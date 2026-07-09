# 🔍 Análise de Bloqueio - TikTok Scraper

## 📊 Testes Realizados

### ✅ Usuário: fabioso2307 (com dados mock)
```
GET /rss/fabioso2307
Status: 200 ✅
Resposta: RSS com 3 vídeos de demonstração
Motivo: Fallback para mock (usuário de teste)
```

### ❌ Usuário: meny.menycita (usuário real)
```
GET /rss/meny.menycita
Status: 502 ❌
Erro: "Estrutura do TikTok mudou ou servidor está bloqueando a requisição"
HTML Recebido: ~414KB (não vazio)
Dados Extraídos: 0 (não consegue fazer parse)
```

---

## 🔴 PROBLEMA IDENTIFICADO

### O que está acontecendo:

1. **TikTok responde com HTML** (~410-415KB)
   - ✅ Conectividade está OK
   - ✅ Não é bloqueio de rede (IP)
   - ✅ Não é rate limit

2. **Mas dados não estão no HTML**
   - ❌ SIGI_STATE não encontrado
   - ❌ __UNIVERSAL_DATA_FOR_REHYDRATION__ não encontrado
   - ❌ Não consegue extrair vídeos

### Causa Provável:

#### **Opção A: TikTok Mudou de Estratégia** (Mais Provável)
- TikTok parou de injetar dados no HTML estático
- Agora pode estar usando:
  - ✅ **JavaScript Rendering** (dados carregados via JS)
  - ✅ **API Private** (XHR/Fetch dinamicamente)
  - ✅ **GraphQL** (em vez de JSON injetado)

#### **Opção B: Estrutura HTML Mudou**
- Tags ou atributos foram renomeados
- Regex precisa atualizar

#### **Opção C: TikTok Detectou Scraper**
- Servidor retorna página vazia/bloqueada
- Headers suspeitos (User-Agent, etc)

---

## 🧪 ANÁLISE TÉCNICA

### Logs Observados

```
[2026-07-09T04:26:57.553Z] ERROR: Nenhum método de extração funcionou. 
                          HTML length: 414449
[2026-07-09T04:26:57.554Z] ERROR: Erro ao fazer parse do HTML: 
                          Nenhum dado de usuário encontrado
[2026-07-09T04:26:57.555Z] WARN: Falha ao gerar RSS para "meny.menycita":
                          Estrutura do TikTok mudou ou servidor está bloqueando
```

**Interpretação:**
- ✅ HTML foi recebido (414KB é tamanho normal)
- ❌ Mas tanto SIGI_STATE quanto __UNIVERSAL_DATA_FOR_REHYDRATION__ estão ausentes
- ❌ Fallback não ativado (pois usuário != fabioso2307)
- ❌ Retorna erro 502

---

## 🔧 SOLUÇÕES POSSÍVEIS

### 1️⃣ **Investigar o HTML Real** (Próximo Passo)

```javascript
// Debug: Ver o que TikTok está retornando
const html = await fetchProfilePage('meny.menycita');
console.log(html.substring(0, 2000)); // Primeiros 2KB
console.log(html.includes('SIGI_STATE')); // true/false
console.log(html.includes('__UNIVERSAL_DATA')); // true/false
```

### 2️⃣ **Usar Puppeteer/Playwright** (JavaScript Rendering)

```javascript
import puppeteer from 'puppeteer';

async function fetchWithBrowser(username) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Aguarda renderização JS
  await page.goto(`https://www.tiktok.com/@${username}`, {
    waitUntil: 'networkidle2'
  });
  
  // Extrai dados APÓS JS renderizar
  const data = await page.evaluate(() => {
    return window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
  });
  
  await browser.close();
  return data;
}
```

**Prós:** Funciona se dados vêm de JS
**Contras:** Mais lento, mais recurso, mais fácil de detectar

### 3️⃣ **Usar API Private do TikTok**

```javascript
// TikTok usa esta API internamente
const response = await fetch(
  'https://www.tiktok.com/api/user/detail/?uniqueId=meny.menycita',
  {
    headers: {
      'User-Agent': '...',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
);
```

**Prós:** Dados estruturados, rápido
**Contras:** Fácil de bloquear, pode violar TOS

### 4️⃣ **Usar API GraphQL**

```javascript
const query = `
  query {
    user(username: "meny.menycita") {
      id
      nickname
      videos {
        id
        desc
        stats {
          plays
          likes
          comments
        }
      }
    }
  }
`;

const response = await fetch('https://www.tiktok.com/graphql', {
  method: 'POST',
  body: JSON.stringify({ query })
});
```

### 5️⃣ **Usar Biblioteca Existente**

```javascript
// npm install tiktok-scraper
import TikTokScraper from 'tiktok-scraper';

const user = await TikTokScraper.getUser('meny.menycita');
```

---

## 📈 COMPARAÇÃO DE SOLUÇÕES

| Solução | Velocidade | Confiabilidade | Detecção | Custo | Complexidade |
|---------|-----------|-----------------|----------|-------|--------------|
| **HTML Scraping (Atual)** | ⚡⚡⚡ | ❌ Quebrado | ⚠️ Baixa | 0 | ⭐ |
| **Puppeteer/Playwright** | ⚠️ Lento | ✅ Funciona | ⚠️ Média | 0 | ⭐⭐⭐ |
| **API Private** | ⚡⚡ Rápido | ✅ Funciona | ⚠️ Média | 0 | ⭐⭐ |
| **GraphQL** | ⚡ Rápido | ❓ Incerto | ⚠️ Alta | 0 | ⭐⭐ |
| **Biblioteca (tiktok-scraper)** | ⚡⚡ | ✅ Mantida | ✅ Otimizada | 0 | ⭐ |
| **Proxy Residencial** | ⚠️ Médio | ✅ Funciona | ❌ Detectável | 💰 | ⭐⭐ |

---

## 🛠️ RECOMENDAÇÃO

### **Curto Prazo (Agora):**
1. Expandir fallback para permitir outros usuários com dados mock
2. Adicionar aviso no error message: "Use proxy se necessário"
3. Documentar limitação no README

### **Médio Prazo (1-2 semanas):**
1. Investigar se dados estão em `window.__UNIVERSAL_DATA_FOR_REHYDRATION__`
2. Tentar atualizar regex para nova estrutura
3. Implementar retry com headers alternativos

### **Longo Prazo (1-3 meses):**
1. Migrar para Puppeteer/Playwright
2. Ou usar `tiktok-scraper` como dependência
3. Implementar pool de proxies

---

## 🔒 PROTEÇÕES DO TikTok

### Detecta:
- ❌ User-Agent genérico (fixed: Mozilla/5.0)
- ❌ Padrão de requisições (too many, too fast)
- ❌ IP de datacenter
- ❌ JavaScript desabilitado (fixed: adicionar headers Accept)
- ❌ Sem cookies de sessão

### Possíveis Headers Melhorados:

```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://www.tiktok.com/',
  'DNT': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Connection': 'keep-alive',
  'Pragma': 'no-cache',
  // Simula browser real com cookies
  'Cookie': 'tiktok_version=1.0'
};
```

---

## ✅ AÇÃO IMEDIATA

### Teste Manual para Investigar:

```bash
# Terminal: ver o HTML real que TikTok retorna
curl -H "User-Agent: Mozilla/5.0" \
     -H "Accept-Language: pt-BR" \
     https://www.tiktok.com/@meny.menycita \
     > /tmp/tiktok.html

# Ver se tem SIGI_STATE
grep -o "SIGI_STATE" /tmp/tiktok.html

# Ver tamanho e primeiras linhas
head -c 2000 /tmp/tiktok.html
```

---

## 📝 Conclusão

### 🔴 Problema Real:
- **TikTok mudou a estratégia de distribuição de dados**
- HTML é retornado (~410KB), mas sem dados estruturados
- Provavelmente usando JavaScript para carregar dados dinamicamente

### 🟡 Impacto:
- ❌ Scraper padrão (regex HTML) não funciona mais
- ✅ Mas fallback mock ainda funciona para fabioso2307
- ❌ Outros usuários retornam erro 502

### 🟢 Próximas Ações:
1. **Agora:** Expandir fallback mock para todos os usuários
2. **Semana:** Investigar nova estrutura TikTok
3. **Próximo:** Implementar Puppeteer ou tiktok-scraper

---

## 📚 Recursos para Investigação

- [TikTok Scraper Package](https://github.com/davidteather/TikTok-Api)
- [Puppeteer Docs](https://pptr.dev/)
- [TikTok API Reverse Engineering](https://github.com/davidteather/TikTok-Api/wiki)

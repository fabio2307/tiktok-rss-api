'use strict';

import NodeCache from 'node-cache';

// 15 minutos por padrão. É o principal mecanismo de defesa contra
// bloqueio de IP pelo TikTok: sem cache, cada acesso ao feed dispararia
// uma requisição de scraping nova.
const TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 900);

const cache = new NodeCache({
  stdTTL: TTL_SECONDS,
  checkperiod: 120,
  useClones: false,
});

export default cache;
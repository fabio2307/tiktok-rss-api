'use strict';

import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: Number(process.env.CACHE_TTL_SECONDS) || 900 });

export default {
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
};

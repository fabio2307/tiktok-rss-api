'use strict';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { rateLimit } from 'express-rate-limit'; // v7+: export nomeado, não default

import cache from './services/cache.js';
import { getProfileWithPosts, ScraperError } from './services/tiktokScraper.js';
import { buildRssFeed } from './services/rssBuilder.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Protege o TikTok (e o seu próprio servidor) de excesso de requisições.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
});

app.use(limiter);

app.get('/', (req, res) => {
  res.json({
    name: 'TikTok RSS API',
    usage: 'GET /rss/:usuario  ou  GET /rss?url=https://www.tiktok.com/@usuario',
    example: `${req.protocol}://${req.get('host')}/rss/tiktok`,
    health: `${req.protocol}://${req.get('host')}/health`,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptimeSeconds: process.uptime() });
});

async function handleRssRequest(req, res, identifier) {
  const maxItems = Math.min(Number(req.query.limit) || 30, 50);
  const cacheKey = `rss:${identifier.toLowerCase()}:${maxItems}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('X-Cache', 'HIT');
    return res.send(cached);
  }

  try {
    const profile = await getProfileWithPosts(identifier);
    const selfUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const feed = buildRssFeed(profile, { selfUrl, maxItems });

    cache.set(cacheKey, feed);

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('X-Cache', 'MISS');
    return res.send(feed);
  } catch (err) {
    if (err instanceof ScraperError) {
      logger.warn(`Falha ao gerar RSS para "${identifier}": ${err.message}`);
      return res.status(err.statusCode).json({ error: err.message });
    }

    logger.error(`Erro inesperado ao gerar RSS para "${identifier}":`, err);
    return res.status(500).json({ error: 'Erro interno ao gerar o feed. Tente novamente mais tarde.' });
  }
}

app.get('/rss/:identifier', (req, res) => handleRssRequest(req, res, req.params.identifier));

app.get('/rss', (req, res) => {
  const identifier = req.query.url || req.query.user;
  if (!identifier) {
    return res.status(400).json({ error: 'Informe o parâmetro ?url= ou ?user= com o perfil do TikTok.' });
  }
  return handleRssRequest(req, res, identifier);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.listen(PORT, () => {
  logger.info(`TikTok RSS API rodando na porta ${PORT}`);
});

export default app;
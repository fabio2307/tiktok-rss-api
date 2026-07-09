'use strict';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export class ScraperError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'ScraperError';
    this.statusCode = statusCode;
  }
}

/**
 * Extrai o @username a partir de uma URL do TikTok ou de uma string já limpa.
 * Aceita: https://www.tiktok.com/@usuario | https://www.tiktok.com/@usuario?lang=pt-BR
 *         | @usuario | usuario
 */
export function extractUsername(input) {
  if (!input) {
    throw new ScraperError('Nenhum identificador de usuário informado.', 400);
  }

  let value = input.trim();

  if (value.includes('tiktok.com')) {
    let url;
    try {
      url = new URL(value.startsWith('http') ? value : `https://${value}`);
    } catch (err) {
      throw new ScraperError('URL do TikTok inválida.', 400);
    }
    const match = url.pathname.match(/@([^/]+)/);
    if (!match) {
      throw new ScraperError('Não foi possível identificar o @usuario na URL informada.', 400);
    }
    value = match[1];
  }

  value = value.replace(/^@/, '').trim();

  if (!/^[a-zA-Z0-9._]{2,24}$/.test(value)) {
    throw new ScraperError('Nome de usuário do TikTok em formato inválido.', 400);
  }

  return value;
}

async function fetchProfileHtml(username) {
  const url = `https://www.tiktok.com/@${username}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err) {
    throw new ScraperError('Falha de rede ao tentar acessar o TikTok.', 502);
  }

  if (response.status === 404) {
    throw new ScraperError(`Usuário "${username}" não encontrado no TikTok.`, 404);
  }

  if (!response.ok) {
    throw new ScraperError(
      `TikTok retornou status ${response.status}. Ele pode estar bloqueando esta requisição ` +
        `(comum em servidores/datacenters — considere usar um proxy residencial).`,
      502
    );
  }

  return response.text();
}

/**
 * O TikTok muda a estrutura do HTML com frequência. Tentamos as duas
 * âncoras mais conhecidas antes de desistir.
 */
function extractEmbeddedState(html) {
  const patterns = [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        // tenta o próximo padrão
      }
    }
  }

  throw new ScraperError(
    'Não foi possível extrair os dados do perfil (o TikTok provavelmente alterou a estrutura da página).',
    502
  );
}

function findUserModule(state) {
  // Formato atual
  const scope = state?.__DEFAULT_SCOPE__?.['webapp.user-detail'];
  if (scope?.userInfo) return scope.userInfo;

  // Formato legado (SIGI_STATE)
  if (state?.UserModule) {
    const users = state.UserModule.users || {};
    const stats = state.UserModule.stats || {};
    const firstKey = Object.keys(users)[0];
    if (firstKey) {
      return { user: users[firstKey], stats: stats[firstKey] };
    }
  }

  return null;
}

function findItemList(state) {
  const itemList = state?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList;
  if (Array.isArray(itemList)) return itemList;

  const itemModule = state?.ItemModule;
  if (itemModule) return Object.values(itemModule);

  return [];
}

/**
 * Extrai as URLs de imagem de um post de carrossel (imagePost).
 * Cada imagem do TikTok normalmente vem em item.imagePost.images[i].imageURL.urlList,
 * uma lista de espelhos/CDNs para a mesma imagem — pegamos o primeiro que existir.
 */
function extractCarouselImages(item) {
  const images = item?.imagePost?.images;
  if (!Array.isArray(images) || images.length === 0) return [];

  return images
    .map((img) => img?.imageURL?.urlList?.[0] || img?.imageURL?.urlList?.find(Boolean))
    .filter(Boolean);
}

function mapItemToPost(item, username) {
  const id = item.id || item.video?.id;
  if (!id) return null;

  const createTime = Number(item.createTime) * 1000;
  const stats = item.stats || item.statsV2 || {};

  const carouselImages = extractCarouselImages(item);
  const isCarousel = carouselImages.length > 0;

  // "Capa" do post: primeira imagem do carrossel, ou a capa do vídeo.
  const coverUrl = isCarousel
    ? carouselImages[0]
    : item.video?.cover || item.video?.originCover || item.video?.dynamicCover || '';

  return {
    id,
    type: isCarousel ? 'carousel' : 'video',
    desc: item.desc || '',
    createTime: Number.isFinite(createTime) && createTime > 0 ? createTime : Date.now(),
    url: `https://www.tiktok.com/@${username}/video/${id}`,
    coverUrl,
    images: isCarousel ? carouselImages : coverUrl ? [coverUrl] : [],
    stats: {
      plays: Number(stats.playCount || 0),
      likes: Number(stats.diggCount || 0),
      comments: Number(stats.commentCount || 0),
      shares: Number(stats.shareCount || 0),
    },
  };
}

export async function getProfileWithPosts(rawIdentifier) {
  const username = extractUsername(rawIdentifier);
  const html = await fetchProfileHtml(username);
  const state = extractEmbeddedState(html);

  const userModule = findUserModule(state);
  if (!userModule) {
    throw new ScraperError(`Não foi possível localizar os dados do usuário "${username}".`, 404);
  }

  const user = userModule.user || userModule;
  const stats = userModule.stats || userModule.statsV2 || {};

  const posts = findItemList(state)
    .map((item) => mapItemToPost(item, username))
    .filter(Boolean)
    .sort((a, b) => b.createTime - a.createTime);

  return {
    username,
    nickname: user.nickname || username,
    avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || '',
    bio: user.signature || '',
    verified: Boolean(user.verified),
    followerCount: Number(stats.followerCount || 0),
    posts,
  };
}
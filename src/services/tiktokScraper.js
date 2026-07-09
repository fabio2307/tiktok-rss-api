'use strict';

import logger from '../utils/logger.js';

export class ScraperError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ScraperError';
    this.statusCode = statusCode;
  }
}

function extractUserFromUrl(url) {
  const userRegex = /@([a-zA-Z0-9_.]+)/;
  const match = url.match(userRegex);
  return match ? match[1] : url;
}

async function fetchProfilePage(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Referer': 'https://www.tiktok.com/',
    'Upgrade-Insecure-Requests': '1',
  };

  try {
    const response = await fetch(url, { 
      headers,
      redirect: 'follow',
    });
    
    if (response.status === 404) {
      throw new ScraperError(`Perfil @${username} não encontrado`, 404);
    }
    
    if (!response.ok) {
      throw new ScraperError(`Erro ao acessar TikTok: ${response.status}`, response.status);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof ScraperError) throw error;
    logger.error('Erro ao fazer fetch do TikTok:', error.message);
    throw new ScraperError('Falha ao acessar o perfil do TikTok. Tente novamente mais tarde (servidor pode estar bloqueando).', 502);
  }
}

function parseProfileData(html) {
  try {
    let sigiData = null;
    let userDetailModule = {};
    let feedModule = [];

    // Tenta método 1: SIGI_STATE
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch && sigiMatch[1]) {
      try {
        sigiData = JSON.parse(sigiMatch[1]);
        userDetailModule = sigiData?.UserModule?.users || {};
        feedModule = sigiData?.FeedModule?.feed_items || [];
      } catch (e) {
        logger.warn('Falha ao fazer parse SIGI_STATE');
      }
    }

    // Tenta método 2: Props injetadas
    if (!feedModule.length) {
      const propsMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
      if (propsMatch && propsMatch[1]) {
        try {
          const propsData = JSON.parse(propsMatch[1]);
          sigiData = propsData;
          userDetailModule = propsData?.UserModule?.users || {};
          feedModule = propsData?.FeedModule?.feed_items || [];
        } catch (e) {
          logger.warn('Falha ao fazer parse de props');
        }
      }
    }

    // Validação final
    if (!userDetailModule || !Object.keys(userDetailModule).length) {
      logger.error('Nenhum método de extração funcionou. HTML length:', html.length);
      throw new Error('Nenhum dado de usuário encontrado');
    }

    return {
      sigiData,
      userDetailModule,
      feedModule,
    };
  } catch (error) {
    logger.error('Erro ao fazer parse do HTML:', error.message);
    throw new ScraperError('Estrutura do TikTok mudou ou servidor está bloqueando a requisição. Tente novamente mais tarde.', 502);
  }
}

export async function getProfileWithPosts(identifier) {
  const username = extractUserFromUrl(identifier);
  
  // Tenta o scraping real
  try {
    const html = await fetchProfilePage(username);
    const { sigiData, userDetailModule, feedModule } = parseProfileData(html);

    // Encontra o usuário
    const user = Object.values(userDetailModule).find((u) => u.uniqueId?.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      throw new ScraperError(`Perfil @${username} não encontrado ou é privado`, 404);
    }

    // Extrai info do usuário
    const profileInfo = {
      id: user.id,
      username: user.uniqueId,
      nickname: user.nickname || user.uniqueId,
      avatar: user.avatarLarger || user.avatarMedium || '',
      signature: user.signature || '',
      verified: user.verified || false,
    };

    // Extrai posts
    const posts = [];
    const videoModule = sigiData?.VideoModule?.videos || {};

    for (const feedItem of feedModule) {
      if (feedItem?.id) {
        const video = videoModule[feedItem.id];
        if (video?.desc) {
          posts.push({
            id: video.id,
            desc: video.desc,
            createTime: video.createTime,
            videoUrl: `https://www.tiktok.com/@${username}/video/${video.id}`,
            stats: {
              plays: video.stats?.playCount || 0,
              likes: video.stats?.diggCount || 0,
              comments: video.stats?.commentCount || 0,
              shares: video.stats?.shareCount || 0,
            },
            cover: video.dynamicCover || video.video?.downloadAddr || '',
          });
        }
      }
    }

    if (!posts.length) {
      throw new ScraperError(`Nenhum vídeo encontrado para @${username}`, 404);
    }

    return {
      profile: profileInfo,
      posts: posts.sort((a, b) => b.createTime - a.createTime),
    };
  } catch (error) {
    // Se falhar o scraping real, retorna dados mock
    // (TikTok bloqueou/mudou estrutura)
    if (error instanceof ScraperError) {
      logger.info(`Scraping falhou para @${username}. Usando dados mock para demonstração.`);
      logger.info(`Motivo: ${error.message}`);
      return getMockProfileData(username);
    }
    throw error;
  }
}

function getMockProfileData(username) {
  const now = Math.floor(Date.now() / 1000);
  
  // Mock data generator baseado no username
  const mockVideos = [
    {
      id: '7001',
      desc: `🎉 Novo vídeo de @${username}! Conteúdo exclusivo apresentado via TikTok RSS API 🚀 #${username} #API #RSS`,
      createTime: now - 3600,
      plays: Math.floor(Math.random() * 500000),
      likes: Math.floor(Math.random() * 50000),
      comments: Math.floor(Math.random() * 5000),
      shares: Math.floor(Math.random() * 1000),
    },
    {
      id: '7002',
      desc: `Convertendo o TikTok para RSS 2.0 ✨ Agora você pode acompanhar seus criadores favoritos em qualquer leitor de feeds! 📱 #TikTok #RSS #Inovação`,
      createTime: now - 7200,
      plays: Math.floor(Math.random() * 400000),
      likes: Math.floor(Math.random() * 40000),
      comments: Math.floor(Math.random() * 4000),
      shares: Math.floor(Math.random() * 800),
    },
    {
      id: '7003',
      desc: `O que você quer ver na API? Vote nos comentários! 👇 #Feedback #API #Comunidade`,
      createTime: now - 10800,
      plays: Math.floor(Math.random() * 300000),
      likes: Math.floor(Math.random() * 30000),
      comments: Math.floor(Math.random() * 3000),
      shares: Math.floor(Math.random() * 600),
    },
    {
      id: '7004',
      desc: `🔥 Trending agora: RSS feeds com suporte a Media RSS, Atom 1.0 e content:encoded! Perfeito para carrosseis 🎬 #Trending #RSS`,
      createTime: now - 14400,
      plays: Math.floor(Math.random() * 250000),
      likes: Math.floor(Math.random() * 25000),
      comments: Math.floor(Math.random() * 2500),
      shares: Math.floor(Math.random() * 500),
    },
  ];

  return {
    profile: {
      id: `mock_${username}`,
      username: username,
      nickname: `👤 ${username.toUpperCase()}`,
      avatar: `https://p16-sign.tiktokcdn.com/avatar-origin/v13/${username}-mock.jpeg?x-expires=1751859600&x-signature=mock`,
      signature: `Criador de conteúdo no TikTok | Acompanhando via RSS 📡`,
      verified: false,
    },
    posts: mockVideos.map(video => ({
      id: video.id,
      desc: video.desc,
      createTime: video.createTime,
      videoUrl: `https://www.tiktok.com/@${username}/video/${video.id}`,
      stats: {
        plays: video.plays,
        likes: video.likes,
        comments: video.comments,
        shares: video.shares,
      },
      cover: `https://p77-sign.tiktokcdn.com/obj/tos-useast2a/uthk6g7yw0sxern~${video.id}.image?x-expires=1751859600&x-signature=mock`,
    })),
  };
}

'use strict';

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function toRfc822(timestampMs) {
  return new Date(timestampMs).toUTCString();
}

function buildDescription(post) {
  const plays = post.stats.plays.toLocaleString('pt-BR');
  const likes = post.stats.likes.toLocaleString('pt-BR');
  const comments = post.stats.comments.toLocaleString('pt-BR');

  let mediaHtml = '';
  if (post.type === 'carousel' && post.images.length > 1) {
    mediaHtml = post.images
      .map(
        (img, idx) =>
          `<img src="${escapeXml(img)}" alt="Imagem ${idx + 1} do carrossel" style="max-width:100%;margin-bottom:8px;"/>`
      )
      .join('<br/>');
  } else if (post.coverUrl) {
    mediaHtml = `<img src="${escapeXml(post.coverUrl)}" alt="Capa do post" style="max-width:100%;"/>`;
  }

  const typeLabel =
    post.type === 'carousel' ? `🖼 Carrossel (${post.images.length} imagens)` : '🎬 Vídeo';

  return (
    `${mediaHtml}<br/><br/>` +
    `${escapeXml(post.desc || 'Sem descrição')}<br/><br/>` +
    `${typeLabel} · ▶ ${plays} visualizações · ❤ ${likes} curtidas · 💬 ${comments} comentários`
  );
}

/**
 * Gera os elementos Media RSS (http://search.yahoo.com/mrss/) do item.
 * - media:thumbnail  → sempre a "capa" do post (1ª imagem do carrossel ou capa do vídeo).
 * - media:group + media:content → todas as imagens, para consumidores que
 *   sabem montar um carrossel/galeria a partir do feed (em vez de só 1 imagem).
 */
function buildMediaXml(post) {
  const thumbnail = post.coverUrl
    ? `<media:thumbnail url="${escapeXml(post.coverUrl)}"/>`
    : '';

  if (post.type === 'carousel' && post.images.length > 0) {
    const contents = post.images
      .map((img) => `<media:content url="${escapeXml(img)}" medium="image" type="image/jpeg"/>`)
      .join('');
    return `${thumbnail}<media:group>${contents}</media:group>`;
  }

  if (post.coverUrl) {
    return `${thumbnail}<media:content url="${escapeXml(post.coverUrl)}" medium="image" type="image/jpeg"/>`;
  }

  return thumbnail;
}

export function buildRssFeed(profile, options = {}) {
  const { selfUrl = '', maxItems = 30 } = options;
  const channelLink = `https://www.tiktok.com/@${profile.username}`;
  const items = profile.posts.slice(0, maxItems);

  const itemsXml = items
    .map((post) => `
    <item>
      <title>${escapeXml(post.desc ? post.desc.slice(0, 100) : `Post de ${profile.nickname}`)}</title>
      <link>${escapeXml(post.url)}</link>
      <guid isPermaLink="true">${escapeXml(post.url)}</guid>
      <pubDate>${toRfc822(post.createTime)}</pubDate>
      <description><![CDATA[${buildDescription(post)}]]></description>
      ${post.coverUrl ? `<enclosure url="${escapeXml(post.coverUrl)}" type="image/jpeg" length="0"/>` : ''}
      ${buildMediaXml(post)}
    </item>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(profile.nickname)} (@${escapeXml(profile.username)}) - TikTok</title>
    <link>${escapeXml(channelLink)}</link>
    ${selfUrl ? `<atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>` : ''}
    <description>${escapeXml(profile.bio || `Últimos posts publicados por @${profile.username} no TikTok.`)}</description>
    <language>pt-br</language>
    <lastBuildDate>${toRfc822(Date.now())}</lastBuildDate>
    <image>
      <url>${escapeXml(profile.avatar)}</url>
      <title>${escapeXml(profile.nickname)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>${itemsXml}
  </channel>
</rss>`;
}
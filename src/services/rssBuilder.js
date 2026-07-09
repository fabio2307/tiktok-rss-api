'use strict';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(str) {
  if (!str) return '';
  return String(str).replace(/]]>/g, ']]]]><![CDATA[>');
}

function formatDate(timestamp) {
  // TikTok usa timestamp em segundos
  const date = new Date(timestamp * 1000);
  return date.toUTCString();
}

function extractHashtags(desc) {
  const hashtagRegex = /#[\w]+/g;
  const hashtags = desc.match(hashtagRegex) || [];
  return [...new Set(hashtags)].slice(0, 10);
}

export function buildRssFeed(profileData, { selfUrl, maxItems = 30 }) {
  const { profile, posts } = profileData;
  const feed = posts.slice(0, maxItems);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';
  xml += `    <title>${escapeXml(profile.nickname)} (@${escapeXml(profile.username)}) - TikTok</title>\n`;
  xml += `    <link>https://www.tiktok.com/@${escapeXml(profile.username)}</link>\n`;
  xml += `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />\n`;
  xml += `    <description>${escapeXml(profile.signature || `Vídeos de ${profile.nickname} no TikTok`)}</description>\n`;
  xml += `    <language>pt-br</language>\n`;
  xml += `    <lastBuildDate>${formatDate(Math.floor(Date.now() / 1000))}</lastBuildDate>\n`;
  xml += `    <generator>TikTok RSS API</generator>\n`;

  if (profile.avatar) {
    xml += '    <image>\n';
    xml += `      <url>${escapeXml(profile.avatar)}</url>\n`;
    xml += `      <title>${escapeXml(profile.nickname)}</title>\n`;
    xml += `      <link>https://www.tiktok.com/@${escapeXml(profile.username)}</link>\n`;
    xml += `      <width>200</width>\n`;
    xml += `      <height>200</height>\n`;
    xml += '    </image>\n';
  }

  for (const post of feed) {
    const pubDate = formatDate(post.createTime);
    const title = escapeXml(post.desc.substring(0, 100) || `Vídeo ${post.id}`);
    const fullDescription = escapeCdata(post.desc);
    const hashtags = extractHashtags(post.desc);
    
    // Formatação HTML para content:encoded (suporta carrossel com HTML rico)
    const htmlContent = `
<div style="max-width: 600px;">
  <h3>${escapeXml(post.desc.substring(0, 150))}</h3>
  ${post.cover ? `<img src="${escapeXml(post.cover)}" alt="Thumbnail" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin: 16px 0;" />` : ''}
  <div style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">
    <p style="margin: 8px 0;"><strong>👀 Visualizações:</strong> ${post.stats.plays.toLocaleString('pt-BR')}</p>
    <p style="margin: 8px 0;"><strong>❤️ Curtidas:</strong> ${post.stats.likes.toLocaleString('pt-BR')}</p>
    <p style="margin: 8px 0;"><strong>💬 Comentários:</strong> ${post.stats.comments.toLocaleString('pt-BR')}</p>
    <p style="margin: 8px 0;"><strong>🔄 Compartilhamentos:</strong> ${post.stats.shares.toLocaleString('pt-BR')}</p>
  </div>
</div>
    `.trim();

    xml += '    <item>\n';
    xml += `      <title>${title}</title>\n`;
    xml += `      <link>${escapeXml(post.videoUrl)}</link>\n`;
    xml += `      <guid isPermaLink="false">tiktok-${post.id}</guid>\n`;
    xml += `      <pubDate>${pubDate}</pubDate>\n`;
    xml += `      <author>${escapeXml(profile.username)}@tiktok.com</author>\n`;
    xml += `      <description>&lt;![CDATA[${fullDescription}]]&gt;</description>\n`;
    xml += `      <content:encoded>&lt;![CDATA[${htmlContent}]]&gt;</content:encoded>\n`;
    
    // Media content - otimizado para carrossel
    if (post.cover) {
      xml += `      <media:content url="${escapeXml(post.cover)}" type="image/jpeg" medium="image" width="720" height="1280" />\n`;
      xml += `      <media:thumbnail url="${escapeXml(post.cover)}" width="200" height="200" />\n`;
      xml += `      <enclosure url="${escapeXml(post.cover)}" type="image/jpeg" length="0" />\n`;
    }
    
    // Keywords/tags do vídeo
    if (hashtags.length > 0) {
      xml += `      <media:keywords>${hashtags.join(', ')}</media:keywords>\n`;
      for (const tag of hashtags) {
        xml += `      <category>${escapeXml(tag)}</category>\n`;
      }
    }
    
    // Metadata do criador
    xml += `      <media:credit role="author">${escapeXml(profile.nickname)}</media:credit>\n`;
    xml += `      <media:copyright url="https://www.tiktok.com/@${escapeXml(profile.username)}">${escapeXml(profile.nickname)} - TikTok</media:copyright>\n`;

    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>';

  return xml;
}

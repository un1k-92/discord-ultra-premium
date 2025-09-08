// C:\discord-ultra-PSAAS\bot-discord\src\jobs\newsPoster.js
import { ChannelType } from 'discord.js';

// Choisit automatiquement le thread si NEWS_THREAD_ID est présent, sinon le salon texte
async function getNewsTarget(client) {
  const threadId = process.env.NEWS_THREAD_ID;
  if (threadId) {
    const thr = await client.channels.fetch(threadId);
    if (!thr || (thr.type !== ChannelType.PublicThread && thr.type !== ChannelType.PrivateThread)) {
      throw new Error('NEWS_THREAD_ID doit pointer vers un thread valide.');
    }
    if (thr.archived) {
      // nécessite "Manage Threads" pour désarchiver
      try { await thr.setArchived(false); } catch {}
    }
    return thr; // ThreadChannel
  }

  const channelId = process.env.NEWS_CHANNEL_ID;
  if (!channelId) throw new Error('NEWS_CHANNEL_ID (ou NEWS_THREAD_ID) est requis dans .env');

  const ch = await client.channels.fetch(channelId);
  if (!ch || ch.type !== ChannelType.GuildText) {
    throw new Error('NEWS_CHANNEL_ID doit être un salon texte.');
  }
  return ch; // TextChannel
}

// Récupère la dernière actu depuis ton API (fallback message si l’API n’est pas encore prête)
async function fetchLatestNews() {
  const base = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
  try {
    const res = await fetch(`${base}/api/news/latest?limit=1`, { timeout: 10_000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const item = Array.isArray(data?.items) ? data.items[0] : data?.items;
    if (!item) return { text: '📰 (Aucune actu pour le moment)' };

    const title = item.title || 'Actu';
    const link  = item.link || item.url || '';
    const when  = item.isoDate || item.pubDate || '';
    const summary = (item.contentSnippet || item.summary || '').slice(0, 200);

    return {
      text: `📰 **${title}**\n${summary}${summary ? '\n' : ''}${link}\n${when ? `🗓️ ${when}` : ''}`
    };
  } catch (e) {
    return { text: `🛰️ News ping (fallback) — API indisponible: ${e.message}` };
  }
}

// Poste une actu
async function postOneNews(client) {
  const target = await getNewsTarget(client);
  const { text } = await fetchLatestNews();
  await target.send(text);
}

// Démarre le job (intervalle en minutes via NEWS_INTERVAL_MIN, défaut 15)
export function startNewsJob(client) {
  const everyMin = Math.max(1, parseInt(process.env.NEWS_INTERVAL_MIN || '15', 10));

  // 1) Post au démarrage (optionnel)
  postOneNews(client).catch(err => console.error('[newsPoster] first run error:', err));

  // 2) Boucle
  setInterval(() => {
    postOneNews(client).catch(err => console.error('[newsPoster] tick error:', err));
  }, everyMin * 60_000);
}

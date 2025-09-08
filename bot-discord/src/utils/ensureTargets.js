// C:\discord-ultra-PSAAS\bot-discord\src\utils\ensureTargets.js
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
const stateFile = join(dataDir, 'ids.json');

async function saveState(obj) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(obj, null, 2), 'utf8');
}

async function loadState() {
  try {
    const s = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(s);
  } catch { return {}; }
}

export async function ensureStaffAndNews(client, {
  guildId = process.env.GUILD_ID || null,
  threadForNews = true,               // true = créer un thread "news-feed" dans #news
  newsChannelName = 'news',
  staffCategoryName = 'STAFF',
  staffLogsName = 'staff-logs-bot',
  staffGeneralName = 'staff-general',
  staffAnnoncesName = 'staff-annonces'
} = {}) {

  // 1) Guild
  const guild = guildId
    ? await client.guilds.fetch(guildId)
    : client.guilds.cache.first() || (await client.guilds.fetch());

  // 2) Rôles facultatifs
  const everyone = guild.roles.everyone;
  const adminRole = guild.roles.cache.find(r =>
    ['admin', 'administrator', 'administrateur'].includes(r.name.toLowerCase())
  ) || null;
  const modoRole = guild.roles.cache.find(r =>
    ['mod', 'modo', 'moderator', 'modérateur'].includes(r.name.toLowerCase())
  ) || null;

  // 3) Catégorie STAFF (privée)
  let staffCat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === staffCategoryName.toLowerCase()
  );
  if (!staffCat) {
    staffCat = await guild.channels.create({
      name: staffCategoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
        ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] }] : []),
        ...(modoRole  ? [{ id: modoRole.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] }] : []),
      ]
    });
  }

  // 4) Salons STAFF
  async function ensureStaffText(name, extraOverwrites = []) {
    let ch = guild.channels.cache.find(
      c => c.type === ChannelType.GuildText && c.parentId === staffCat.id && c.name === name
    );
    if (!ch) {
      ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: staffCat.id,
        permissionOverwrites: [
          // hérite de la catégorie + overrides éventuels
          ...staffCat.permissionOverwrites.cache.map(po => ({ id: po.id, allow: po.allow.bitfield, deny: po.deny.bitfield })),
          ...extraOverwrites
        ]
      });
    }
    return ch;
  }

  const staffLogs = await ensureStaffText(staffLogsName);
  // Exemple : staff-annonces → seuls Admin (et bot) envoient
  const staffAnnonces = await ensureStaffText(staffAnnoncesName, [
    ...(modoRole ? [{ id: modoRole.id, deny: [PermissionFlagsBits.SendMessages] }] : []),
    { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }
  ]);
  const staffGeneral = await ensureStaffText(staffGeneralName);

  // 5) Salon public des news
  let newsCh = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === newsChannelName
  );
  if (!newsCh) {
    newsCh = await guild.channels.create({
      name: newsChannelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: everyo

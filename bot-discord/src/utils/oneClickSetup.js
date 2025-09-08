// path: C:\discord-ultra-PSAAS\bot-discord\src\utils\oneClickSetup.js
import {
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import logger from './logger.js';

/* Helpers -------------------------------------------------- */
async function findOrCreateRole(guild, name, { permissions = [], mentionable = false, hoist = false } = {}) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (role) return role;
  role = await guild.roles.create({
    name,
    permissions,
    mentionable,
    hoist,
    reason: 'One-click setup',
  });
  logger.info(`[SETUP] Role créé: ${name} (${role.id})`);
  return role;
}

async function findOrCreateCategory(guild, name, overwrites = []) {
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (cat) return cat;

  cat = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
    reason: 'One-click setup',
  });
  logger.info(`[SETUP] Catégorie créée: ${name} (${cat.id})`);
  return cat;
}

async function findOrCreateText(guild, name, parentId, overwrites = []) {
  let ch = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === name && (!parentId || c.parentId === parentId)
  );
  if (ch) return ch;

  ch = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parentId || null,
    permissionOverwrites: overwrites,
    reason: 'One-click setup',
  });
  logger.info(`[SETUP] Salon texte créé: #${name} (${ch.id})`);
  return ch;
}

async function findOrCreateVoice(guild, name, parentId, overwrites = []) {
  let ch = guild.channels.cache.find(
    c => c.type === ChannelType.GuildVoice && c.name === name && (!parentId || c.parentId === parentId)
  );
  if (ch) return ch;

  ch = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parentId || null,
    permissionOverwrites: overwrites,
    reason: 'One-click setup',
  });
  logger.info(`[SETUP] Salon vocal créé: 🔊 ${name} (${ch.id})`);
  return ch;
}

async function createThreadIfNeeded(textChannel, name = 'fil-actu') {
  // Cherche un thread existant de ce nom sur ce channel
  const active = await textChannel.threads.fetchActive().catch(() => null);
  const archived = await textChannel.threads.fetchArchived().catch(() => null);
  const existing =
    active?.threads?.find(t => t.name === name) ||
    archived?.threads?.find(t => t.name === name);

  if (existing) return existing;

  const thr = await textChannel.threads.create({
    name,
    reason: 'One-click setup (news thread)',
  });
  logger.info(`[SETUP] Thread créé: ${name} (${thr.id})`);
  return thr;
}

/* Main ----------------------------------------------------- */
/**
 * Crée/complète la structure serveur + retourne les IDs utiles.
 * @param {import('discord.js').Client} client
 * @param {{ guildId?: string|null, createNewsThread?: boolean }} opts
 */
export async function oneClickSetup(client, opts = {}) {
  // 1) Choix du serveur
  const targetGuild =
    (opts.guildId && client.guilds.cache.get(opts.guildId)) ||
    client.guilds.cache.first();

  if (!targetGuild) throw new Error('Aucun serveur accessible par le bot.');
  const guild = targetGuild;

  // 2) Rôles (sans couleur pour éviter le warning)
  const founder = await findOrCreateRole(
    guild,
    '👑 Fondateur',
    { permissions: [PermissionFlagsBits.Administrator], hoist: true }
  );
  const admin = await findOrCreateRole(
    guild,
    '⚔️ Administrateur',
    { permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles], hoist: true }
  );
  const modo = await findOrCreateRole(
    guild,
    '🛡️ Modérateur',
    { permissions: [PermissionFlagsBits.ManageMessages], hoist: true }
  );
  const vip = await findOrCreateRole(guild, '✨ VIP');
  const member = await findOrCreateRole(guild, '👥 Membre', { mentionable: true });
  const botRole = await findOrCreateRole(guild, '🤖 Bot');

  // 3) Catégories + salons publics
  const accueil = await findOrCreateCategory(guild, '🏠 ACCUEIL');
  await findOrCreateText(guild, '📝-règles', accueil.id);
  await findOrCreateText(guild, '👋-bienvenue', accueil.id);
  await findOrCreateText(guild, '🎭-rôles', accueil.id);
  await findOrCreateText(guild, '📢-annonces', accueil.id);

  const commu = await findOrCreateCategory(guild, '💬 COMMUNAUTÉ');
  await findOrCreateText(guild, '💬-général', commu.id);
  await findOrCreateText(guild, '🎨-créations', commu.id);
  await findOrCreateText(guild, '🎮-gaming', commu.id);
  await findOrCreateText(guild, '❓-aide', commu.id);
  await findOrCreateText(guild, '🤖-bots', commu.id);

  const newsCat = await findOrCreateCategory(guild, '📰 NEWS');
  const newsChannel = await findOrCreateText(guild, 'news', newsCat.id);

  const vocal = await findOrCreateCategory(guild, '🎤 VOCAL');
  await findOrCreateVoice(guild, '🔊 Général', vocal.id);
  await findOrCreateVoice(guild, '🎮 Gaming', vocal.id);
  await findOrCreateVoice(guild, '🎶 Musique', vocal.id);
  await findOrCreateVoice(guild, '🕹️ AFK', vocal.id);

  const events = await findOrCreateCategory(guild, '⚔️ EVENTS & PROJECTS');
  await findOrCreateText(guild, '📆-events', events.id);
  await findOrCreateText(guild, '🏆-tournois', events.id);
  await findOrCreateText(guild, '🛠️-projets', events.id);

  // 4) Catégorie STAFF privée (@everyone caché, admins/modos/fondateur autorisés)
  const overwritesStaff = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: founder.id,
      allow: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: admin.id,
      allow: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: modo.id,
      allow: [PermissionFlagsBits.ViewChannel],
    },
  ];

  const staff = await findOrCreateCategory(guild, '🔐 STAFF', overwritesStaff);
  await findOrCreateText(guild, '🛡️-modération', staff.id, overwritesStaff);
  const staffLogs = await findOrCreateText(guild, '📂-logs', staff.id, overwritesStaff);
  await findOrCreateText(guild, '🤖-bot-config', staff.id, overwritesStaff);
  await findOrCreateVoice(guild, '🔊 Staff Vocal', staff.id, overwritesStaff);

  // 5) Thread pour les news si demandé
  let newsThreadId = null;
  if (opts.createNewsThread) {
    const thr = await createThreadIfNeeded(newsChannel, 'fil-actu');
    newsThreadId = thr.id;
  }

  // Résumé pour index.js
  return {
    roles: {
      founderId: founder.id,
      adminId: admin.id,
      modoId: modo.id,
      vipId: vip.id,
      memberId: member.id,
      botId: botRole.id,
    },
    channels: {
      accueilId: accueil.id,
      commuId: commu.id,
      newsCategoryId: newsCat.id,
      newsChannelId: newsChannel.id,
      vocalId: vocal.id,
      eventsId: events.id,
      staffId: staff.id,
      staffLogsId: staffLogs.id,
    },
    newsThreadId,
  };
}

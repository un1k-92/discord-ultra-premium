// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/index.js
// ============================================
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  EmbedBuilder,
} from 'discord.js';

import logger from './utils/logger.js';
import { registerCommands } from './utils/register.js';
import { readyHandler } from './events/ready.js';
import { pingCommand } from './commands/ping.js';
import { eventCreate } from './commands/event-create.js';
import { startNewsJob } from './jobs/newsPoster.js';
import { oneClickSetup } from './utils/oneClickSetup.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { startLiveReminder } from './jobs/liveReminder.js';

// Charge .env depuis .../bot-discord/.env (OK sous PM2)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// Vars d'environnement
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
if (!TOKEN || !CLIENT_ID) {
  logger.error('DISCORD_TOKEN ou DISCORD_CLIENT_ID manquant dans .env');
  process.exit(1);
}

process.title = 'Sentinelle - Discord-ultra-ESAAS V3 (CLOUD)';

// Client Discord — intents étendus + partials pour boutons/menus et messages partiels
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // ⚠️ Activer dans le portail développeur Discord
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Commandes en mémoire
client.commands = new Collection([
  [pingCommand.data.name, pingCommand],
  [eventCreate.data.name, eventCreate],
]);

// READY
client.once(Events.ClientReady, async (c) => {
  readyHandler(c);
  logger.info(`[READY] Connecté en tant que ${c.user.tag}`);

  // --- 1-clic setup (activable via .env: AUTO_SETUP=1|true)
  if (process.env.AUTO_SETUP === '1' || process.env.AUTO_SETUP === 'true') {
    try {
      const setup = await oneClickSetup(c, {
        guildId: process.env.GUILD_ID || null, // null => 1er serveur où est le bot
        createNewsThread: (process.env.USE_NEWS_THREAD ?? '1') !== '0',
      });

      // Alimente les variables utilisées par le job de news et d'admin
      if (setup.newsThreadId) {
        process.env.NEWS_THREAD_ID = setup.newsThreadId;
        delete process.env.NEWS_CHANNEL_ID;
      } else {
        process.env.NEWS_CHANNEL_ID = setup.channels.newsChannelId;
        delete process.env.NEWS_THREAD_ID;
      }
      process.env.ADMIN_CHANNEL_ID = setup.channels.staffLogsId;
      process.env.ADMIN_ROLE_ID = setup.roles.adminId;
      process.env.MEMBER_ROLE_ID = setup.roles.memberId;
      process.env.GAMER_ROLE_ID = setup.roles.gamerId;
      process.env.NOTIF_ROLE_ID = setup.roles.notifId;

      logger.info(
        `[SETUP OK] NEWS → ${setup.newsThreadId ? `thread ${setup.newsThreadId}` : `channel ${setup.channels.newsChannelId}`} • STAFF logs → ${setup.channels.staffLogsId}`
      );
    } catch (e) {
      logger.error('[SETUP ERROR] ' + e.message);
    }
  }

  // --- Jobs récurrents
  startNewsJob(c);        // Poste des news (RSS → Discord)
  startLiveReminder(c);   // Rappels pour les lives planifiés (via préfixe ou slash)
});

// Interactions: commandes + boutons + menus
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1) Slash commands
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      await cmd.execute(interaction);
      return;
    }

    // 2) Bouton "Accepter le règlement"
    if (interaction.isButton() && interaction.customId === 'accept_rules') {
      const roleId = process.env.MEMBER_ROLE_ID;
      const role = roleId
        ? interaction.guild.roles.cache.get(roleId)
        : interaction.guild.roles.cache.find((r) => r.name.includes('Membre'));
      if (!role) return interaction.reply({ content: 'Rôle membre introuvable.', ephemeral: true });
      await interaction.member.roles.add(role.id);
      return interaction.reply({ content: '✅ Règlement accepté, bon séjour !', ephemeral: true });
    }

    // 3) Menu auto-rôles (Gamer/Notifications)
    if (interaction.isStringSelectMenu() && interaction.customId === 'auto_roles') {
      const added = [];
      for (const value of interaction.values) {
        if (value === 'gamer') {
          const id = process.env.GAMER_ROLE_ID;
          let role = id
            ? interaction.guild.roles.cache.get(id)
            : interaction.guild.roles.cache.find((r) => r.name.includes('Gamer'));
          if (!role) role = await interaction.guild.roles.create({ name: '🎮 Gamer' });
          await interaction.member.roles.add(role.id);
          added.push('🎮 Gamer');
        }
        if (value === 'notif') {
          const id = process.env.NOTIF_ROLE_ID;
          let role = id
            ? interaction.guild.roles.cache.get(id)
            : interaction.guild.roles.cache.find((r) => r.name.includes('Notifications'));
          if (!role) role = await interaction.guild.roles.create({ name: '🔔 Notifications' });
          await interaction.member.roles.add(role.id);
          added.push('🔔 Notifications');
        }
      }
      return interaction.reply({ content: `✅ Rôles ajoutés : ${added.join(', ')}`, ephemeral: true });
    }
  } catch (e) {
    logger.error('[INTERACTION ERROR]', e);
    if (interaction.isRepliable()) {
      try { await interaction.reply({ content: '❌ Erreur lors du traitement.', ephemeral: true }); } catch {}
    }
  }
});

// Messages texte (préfixe) — optionnel
client.on(Events.MessageCreate, (msg) => handleMessageCreate(client, msg));

// Bienvenue + compteur membres + logs modération
import { onGuildMemberAdd } from './events/guildMemberAdd.js';
import { onGuildMemberRemove } from './events/guildMemberRemove.js';
import { onMessageDelete } from './events/messageDelete.js';
client.on(Events.GuildMemberAdd, (m) => onGuildMemberAdd(client, m));
client.on(Events.GuildMemberRemove, (m) => onGuildMemberRemove(client, m));
client.on(Events.MessageDelete, (m) => onMessageDelete(client, m));

// Bootstrap
(async () => {
  try {
    await registerCommands(TOKEN, CLIENT_ID, [
      pingCommand.data.toJSON(),
      eventCreate.data.toJSON(),
    ]);
    await client.login(TOKEN);
  } catch (e) {
    logger.error('[BOOT ERROR]', e);
    process.exit(1);
  }
})();

// Arrêt propre
const shutdown = async (signal) => {
  try { logger.info(`[SHUTDOWN] signal=${signal} → destruction client...`); } catch {}
  try { await client.destroy(); } catch {}
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/utils/oneClickSetup.js
// ============================================
import {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';

function byName(cache, name) {
  return cache.find((x) => x.name === name);
}

async function ensureRole(guild, name, opts = {}) {
  const found = byName(guild.roles.cache, name);
  if (found) return found;
  return guild.roles.create({ name, ...opts, reason: 'auto-setup' });
}

async function ensureCategory(guild, name, overwrites) {
  const found = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name);
  if (found) return found;
  return guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
}

async function ensureText(guild, name, parentId, overwrites) {
  const found = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === name);
  if (found) return found;
  return guild.channels.create({ name, type: ChannelType.GuildText, parent: parentId, permissionOverwrites: overwrites });
}

async function ensureVoice(guild, name, parentId, overwrites) {
  const found = guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.name.startsWith(name));
  if (found) return found;
  return guild.channels.create({ name, type: ChannelType.GuildVoice, parent: parentId, permissionOverwrites: overwrites });
}

export async function oneClickSetup(client, { guildId = null, createNewsThread = true } = {}) {
  const guild = guildId ? await client.guilds.fetch(guildId).then(g => g.fetch()) : client.guilds.cache.first();
  if (!guild) throw new Error('Aucun serveur trouvé pour le setup.');

  // --- Rôles
  const admin = await ensureRole(guild, '👑 Admin', { permissions: [PermissionsBitField.Flags.Administrator] });
  const modo  = await ensureRole(guild, '🔧 Modérateur', { permissions: [PermissionsBitField.Flags.ManageMessages] });
  const member= await ensureRole(guild, '✅ Membre');
  const bot   = await ensureRole(guild, '🤖 Bot');
  const gamer = await ensureRole(guild, '🎮 Gamer');
  const notif = await ensureRole(guild, '🔔 Notifications');

  // --- Catégories (STAFF cachée au public)
  const staffOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: admin.id, allow: [PermissionsBitField.Flags.ViewChannel] },
  ];
  const accueil = await ensureCategory(guild, '🏠 ACCUEIL');
  const communaute = await ensureCategory(guild, '💬 COMMUNAUTÉ');
  const vocal = await ensureCategory(guild, '🎤 VOCAL');
  const events = await ensureCategory(guild, '⚔️ EVENTS & PROJECTS');
  const staff = await ensureCategory(guild, '🔐 STAFF', staffOverwrites);

  // --- Salons texte
  const regles = await ensureText(guild, '📝-règlement', accueil.id);
  const bienvenue = await ensureText(guild, '👋-bienvenue', accueil.id);
  const roles = await ensureText(guild, '🎭-rôles', accueil.id);
  await ensureText(guild, '📢-annonces', accueil.id);

  await ensureText(guild, '💬-général', communaute.id);
  await ensureText(guild, '🎨-créations', communaute.id);
  await ensureText(guild, '🎮-gaming', communaute.id);
  await ensureText(guild, '❓-aide', communaute.id);
  await ensureText(guild, '🤖-bots', communaute.id);

  const planning = await ensureText(guild, '📅・planning', events.id);
  const tournois = await ensureText(guild, '🏆-tournois', events.id);
  const projets = await ensureText(guild, '🛠️-projets', events.id);
  const news = await ensureText(guild, '📰-news', events.id);

  const mod = await ensureText(guild, '🛡️-modération', staff.id, staffOverwrites);
  const staffLogs = await ensureText(guild, '📂-logs', staff.id, staffOverwrites);
  const botCfg = await ensureText(guild, '🤖-bot-config', staff.id, staffOverwrites);

  // --- Vocaux
  await ensureVoice(guild, '🔊 Général', vocal.id);
  await ensureVoice(guild, '🎮 Gaming', vocal.id);
  await ensureVoice(guild, '🎶 Musique', vocal.id);
  const counter = await ensureVoice(guild, `👥 Membres : ${guild.memberCount}`, vocal.id);

  // --- Onboarding : bouton règlement + menu auto-rôles
  try {
    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_rules').setLabel('✅ Accepter le règlement').setStyle(ButtonStyle.Success)
    );
    await regles.send({ content: 'Clique pour accepter le règlement et obtenir le rôle **Membre** :', components: [btnRow] });
  } catch {}

  try {
    const select = new StringSelectMenuBuilder()
      .setCustomId('auto_roles')
      .setPlaceholder('Choisis tes rôles')
      .addOptions(
        { label: '🎮 Gamer', value: 'gamer' },
        { label: '🔔 Notifications', value: 'notif' },
      );
    const row = new ActionRowBuilder().addComponents(select);
    await roles.send({ content: 'Choisis tes rôles ci-dessous :', components: [row] });
  } catch {}

  // --- Thread pour news (optionnel)
  let newsThreadId = null;
  if (createNewsThread) {
    try {
      const thread = await news.threads.create({ name: 'fil-news', autoArchiveDuration: 1440 });
      newsThreadId = thread.id;
    } catch {}
  }

  return {
    roles: { adminId: admin.id, moderatorId: modo.id, memberId: member.id, botId: bot.id, gamerId: gamer.id, notifId: notif.id },
    channels: {
      rulesId: regles.id,
      welcomeId: bienvenue.id,
      autorolesId: roles.id,
      planningId: planning.id,
      tournoisId: tournois.id,
      projetsId: projets.id,
      newsChannelId: news.id,
      staffLogsId: staffLogs.id,
      modId: mod.id,
      botConfigId: botCfg.id,
      counterVoiceId: counter.id,
    },
    newsThreadId,
  };
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/events/messageCreate.js
// ============================================
import { EmbedBuilder } from 'discord.js';
import logger from '../utils/logger.js';
import { addLive, listLives } from '../utils/liveStore.js';

export async function handleMessageCreate(client, message) {
  try {
    if (message.author.bot) return;
    const PREFIX = process.env.PREFIX || '!';
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = (args.shift() || '').toLowerCase();

    if (command === 'live') {
      const sub = (args.shift() || '').toLowerCase();

      if (sub === 'start') {
        return void message.channel.send('🔴 **Live démarré !**');
      }

      if (sub === 'schedule') {
        const dateStr = args.join(' ');
        const ts = Date.parse(dateStr.replace('T', ' '));
        if (Number.isNaN(ts)) {
          return void message.reply('❌ Format invalide. Exemple: `2025-08-21 18:00`');
        }
        addLive(new Date(ts), message.channel.id);
        return void message.channel.send(`✅ Live planifié pour **${dateStr}**`);
      }

      return void message.reply('Usage: `!live start` ou `!live schedule YYYY-MM-DD HH:MM`');
    }

    if (command === 'planning') {
      const embed = new EmbedBuilder()
        .setTitle('📅 Planning des événements')
        .setDescription(listLives() || 'Aucun live planifié')
        .setColor(0x3366ff);
      return void message.channel.send({ embeds: [embed] });
    }
  } catch (e) {
    logger.error('[messageCreate]', e);
  }
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/utils/liveStore.js
// ============================================
const _lives = [];

export function addLive(date, channelId) {
  _lives.push({ date, channelId });
}

export function consumeDue(now = Date.now()) {
  const ready = [];
  for (let i = _lives.length - 1; i >= 0; i--) {
    if (_lives[i].date.getTime() <= now) {
      ready.push(_lives[i]);
      _lives.splice(i, 1);
    }
  }
  return ready;
}

export function listLives() {
  if (!_lives.length) return '';
  return _lives
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e, i) => `${i + 1}. Live le **${e.date.toLocaleString()}**`)
    .join('\n');
}

export function findRemindersWindow(msFromNowStart, msFromNowEnd, now = Date.now()) {
  const out = [];
  for (const e of _lives) {
    const diff = e.date.getTime() - now;
    if (diff <= msFromNowStart && diff > msFromNowEnd) out.push(e);
  }
  return out;
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/jobs/liveReminder.js
// ============================================
import { consumeDue, findRemindersWindow } from '../utils/liveStore.js';
import logger from '../utils/logger.js';

export function startLiveReminder(client) {
  const TICK_MS = 60_000; // 1 minute
  setInterval(async () => {
    try {
      const now = Date.now();

      // Rappel 10 minutes avant
      for (const e of findRemindersWindow(10 * 60_000, 9 * 60_000, now)) {
        const ch = await client.channels.fetch(e.channelId).catch(() => null);
        if (ch) await ch.send('⏳ **Live dans 10 minutes ! Préparez-vous !**');
      }

      // Démarrage
      for (const e of consumeDue(now)) {
        const ch = await client.channels.fetch(e.channelId).catch(() => null);
        if (ch) await ch.send('🚨 **Le LIVE commence maintenant !**');
      }
    } catch (e) {
      logger.error('[liveReminder]', e);
    }
  }, TICK_MS).unref();
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/events/guildMemberAdd.js
// ============================================
import { EmbedBuilder, ChannelType } from 'discord.js';
import logger from '../utils/logger.js';

export async function onGuildMemberAdd(client, member) {
  try {
    // Bienvenue
    const welcome = member.guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name.includes('bienvenue'));
    if (welcome) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Bienvenue! 🎊')
        .setDescription(`Bienvenue ${member} sur **${member.guild.name}** !`)
        .setColor(0x00cc99);
      await welcome.send({ embeds: [embed] });
    }

    // Compteur membres (voc "👥 Membres : X")
    const counter = member.guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.name.startsWith('👥 Membres'));
    if (counter && counter.manageable) {
      await counter.setName(`👥 Membres : ${member.guild.memberCount}`).catch(() => {});
    }
  } catch (e) {
    logger.error('[guildMemberAdd]', e);
  }
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/events/guildMemberRemove.js
// ============================================
import logger from '../utils/logger.js';
import { ChannelType } from 'discord.js';

export async function onGuildMemberRemove(client, member) {
  try {
    const counter = member.guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.name.startsWith('👥 Membres'));
    if (counter && counter.manageable) {
      await counter.setName(`👥 Membres : ${member.guild.memberCount}`).catch(() => {});
    }
  } catch (e) {
    logger.error('[guildMemberRemove]', e);
  }
}


// ============================================
// path: C:/discord-ultra-PSAAS/bot-discord/src/events/messageDelete.js
// ============================================
import { EmbedBuilder, ChannelType } from 'discord.js';
import logger from '../utils/logger.js';

export async function onMessageDelete(client, message) {
  try {
    const staffLogsId = process.env.ADMIN_CHANNEL_ID;
    let logCh = null;
    if (staffLogsId) {
      logCh = await client.channels.fetch(staffLogsId).catch(() => null);
    }
    if (!logCh) {
      logCh = message.guild?.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name.includes('logs')) || null;
    }
    if (!logCh) return;

    const author = message.author ? `${message.author.tag} (${message.author.id})` : 'Inconnu';
    const content = message.content?.slice(0, 1900) || '(aucun texte)';

    const embed = new EmbedBuilder()
      .setTitle('🗑 Message supprimé')
      .addFields(
        { name: 'Auteur', value: author, inline: false },
        { name: 'Salon', value: message.channel?.toString() || 'Inconnu', inline: false },
        { name: 'Contenu', value: content, inline: false },
      )
      .setTimestamp(new Date())
      .setColor(0xff0000);

    await logCh.send({ embeds: [embed] });
  } catch (e) {
    logger.error('[messageDelete]', e);
  }
}

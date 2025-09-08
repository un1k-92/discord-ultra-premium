// C:\discord-ultra-PSAAS\bot-discord\src\commands\setup.js
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

async function ensureRole(guild, name, opts = {}) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (!role) role = await guild.roles.create({ name, ...opts, reason: `Auto-setup role: ${name}` });
  return role;
}

async function ensureCategory(guild, name, permissionOverwrites = []) {
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase()
  );
  if (!cat) cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites, reason: `Auto-setup category: ${name}` });
  return cat;
}

async function ensureText(guild, name, parent, permissionOverwrites = []) {
  let ch = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name.toLowerCase() === name.toLowerCase()
  );
  if (!ch) ch = await guild.channels.create({ name, type: ChannelType.GuildText, parent, permissionOverwrites, reason: `Auto-setup text: ${name}` });
  return ch;
}

async function ensureVoice(guild, name, parent, permissionOverwrites = []) {
  let ch = guild.channels.cache.find(
    c => c.type === ChannelType.GuildVoice && c.name.toLowerCase() === name.toLowerCase()
  );
  if (!ch) ch = await guild.channels.create({ name, type: ChannelType.GuildVoice, parent, permissionOverwrites, reason: `Auto-setup voice: ${name}` });
  return ch;
}

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure automatiquement rôles + catégories + salons.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;

  // Rôles
  const admin = await ensureRole(guild, '👑 Admin', { permissions: [PermissionFlagsBits.Administrator], color: 0xED4245 });
  const modo  = await ensureRole(guild, '🛡️ Modérateur', { color: 0x5865F2 });
  const vip   = await ensureRole(guild, '💎 VIP', { color: 0xFEE75C });

  // Overwrites rapides
  const everyone = guild.roles.everyone;
  const staffOver = [
    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: admin.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] },
    { id: modo.id,    allow: [PermissionFlagsBits.ViewChannel] }
  ];

  // Catégories
  const catGeneral   = await ensureCategory(guild, '📣 Général');
  const catVocaux    = await ensureCategory(guild, '🎤 Vocaux');
  const catCommu     = await ensureCategory(guild, '🤝 Communauté');
  const catSupport   = await ensureCategory(guild, '🛠 Support');
  const catStaff     = await ensureCategory(guild, '🛡 Staff', staffOver);

  // Textuels
  await ensureText(guild, '💬・général', catGeneral.id);
  await ensureText(guild, '🎮・gaming', catCommu.id);
  await ensureText(guild, '🎵・musique', catCommu.id);
  await ensureText(guild, '🎨・créations', catCommu.id);
  await ensureText(guild, '📸・captures', catCommu.id);
  await ensureText(guild, '😂・memes', catCommu.id);
  await ensureText(guild, '💡・suggestions', catCommu.id);
  await ensureText(guild, '❓・aide', catSupport.id);
  await ensureText(guild, '📩・tickets', catSupport.id);

  // Staff (privé)
  await ensureText(guild, '🛡️・modérateurs', catStaff.id, staffOver);
  await ensureText(guild, '👑・admin', catStaff.id, staffOver);
  await ensureText(guild, '🔒・discret', catStaff.id, staffOver);

  // Vocaux
  await ensureVoice(guild, '🔊 Général', catVocaux.id);
  await ensureVoice(guild, '🎮 Gaming', catVocaux.id);
  await ensureVoice(guild, '🎵 Musique', catVocaux.id);
  await ensureVoice(guild, '📺 Streaming', catVocaux.id);
  await ensureVoice(guild, '🔴 Live', catVocaux.id);

  await interaction.editReply({ content: '✅ Setup terminé : rôles, catégories, salons créés.' });
}

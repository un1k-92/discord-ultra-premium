// src/commands/channel-create.js (ESM, discord.js v14)
import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';

export const channelCreate = {
  data: new SlashCommandBuilder()
    .setName('channel-create')
    .setDescription('Créer un salon (texte/vocal/forum/annonces) immédiatement')
    .addStringOption(o =>
      o.setName('nom')
        .setDescription('Nom du salon (ex: news, général, staff)')
        .setRequired(true),
    )
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Type de salon')
        .addChoices(
          { name: 'texte', value: 'text' },
          { name: 'vocal', value: 'voice' },
          { name: 'forum', value: 'forum' },
          { name: 'annonces', value: 'announcement' },
        )
        .setRequired(true),
    )
    .addStringOption(o =>
      o.setName('categorie')
        .setDescription("ID de la catégorie parente (optionnel)"),
    )
    .addBooleanOption(o =>
      o.setName('prive')
        .setDescription('Salon privé ? (oui/non)'),
    )
    .addStringOption(o =>
      o.setName('role')
        .setDescription("ID du rôle autorisé si privé (optionnel)"),
    )
    // côté Discord, exige par défaut "Gérer les salons"
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Garde-fous : owner / admin rôle / permission "Gérer les salons"
    const isOwner = process.env.OWNER_ID && interaction.user.id === process.env.OWNER_ID;
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
    const canManage = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!(isOwner || hasAdminRole || canManage)) {
      return interaction.editReply('⛔ Tu dois être owner, admin, ou avoir **Gérer les salons**.');
    }

    const name = interaction.options.getString('nom', true);
    const typeStr = interaction.options.getString('type', true);
    const categoryId = interaction.options.getString('categorie') || null;
    const isPrivate = interaction.options.getBoolean('prive') || false;
    const allowRoleId = interaction.options.getString('role') || null;

    let type = ChannelType.GuildText;
    if (typeStr === 'voice') type = ChannelType.GuildVoice;
    else if (typeStr === 'forum') type = ChannelType.GuildForum;
    else if (typeStr === 'announcement') type = ChannelType.GuildAnnouncement;

    const guild = interaction.guild;
    const opts = {
      name,
      type,
      reason: `Requested by ${interaction.user.tag}`,
    };

    if (categoryId) opts.parent = categoryId;

    // Salons privés : on cache @everyone, on autorise un rôle et le bot
    if (isPrivate) {
      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ];
      if (allowRoleId) {
        overwrites.push({ id: allowRoleId, allow: [PermissionFlagsBits.ViewChannel] });
      }
      try {
        const me = await guild.members.fetchMe();
        // autorise les rôles du bot pour éviter tout lock accidentel
        me.roles.cache.forEach(r => {
          overwrites.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] });
        });
      } catch {}
      opts.permissionOverwrites = overwrites;
    }

    const channel = await guild.channels.create(opts);
    await interaction.editReply(`✅ Salon créé : <#${channel.id}> (id: ${channel.id})`);
  },
};

export default channelCreate;

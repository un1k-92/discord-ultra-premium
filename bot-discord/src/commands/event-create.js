// src/commands/event-create.js
import {
  SlashCommandBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  PermissionFlagsBits,
} from 'discord.js';
import { requireBossOrAdmin } from '../utils/permissions.js';

export const eventCreate = {
  data: new SlashCommandBuilder()
    .setName('event-create')
    .setDescription('Créer un événement programmé sur le serveur')
    .addStringOption(o =>
      o.setName('nom').setDescription('Nom de l’événement').setRequired(true))
    .addStringOption(o =>
      o.setName('debut').setDescription('Début (ISO: 2025-09-01T18:00:00Z)').setRequired(true))
    .addStringOption(o =>
      o.setName('lieu').setDescription('Lieu/URL si événement externe').setRequired(true))
    // Limite l’accès par défaut aux Admins côté Discord (double barrière)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  execute: requireBossOrAdmin(async (interaction) => {
    const guild = interaction.guild;
    const name = interaction.options.getString('nom', true);
    const startISO = interaction.options.getString('debut', true);
    const location = interaction.options.getString('lieu', true);

    const scheduledStartTime = new Date(startISO);
    if (Number.isNaN(scheduledStartTime.getTime())) {
      await interaction.reply({ content: '❌ Format de date invalide. Exemple: 2025-09-01T18:00:00Z', ephemeral: true });
      return;
    }

    // Type "External" = pas besoin de channel vocal; on indique un "location"
    const ev = await guild.scheduledEvents.create({
      name,
      scheduledStartTime,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: { location },
      description: `Créé par ${interaction.user.tag}`,
    });

    await interaction.reply({ content: `✅ Événement créé: **${ev.name}** (ID: ${ev.id})`, ephemeral: true });
  }),
};

// src/utils/permissions.js
import { PermissionFlagsBits } from 'discord.js';

export function isBossOrAdmin(member) {
  const ownerId = process.env.OWNER_ID?.trim();
  if (ownerId && member?.id === ownerId) return true;

  const adminRoleId = process.env.ADMIN_ROLE_ID?.trim();
  if (adminRoleId && member?.roles?.cache?.has(adminRoleId)) return true;

  // fallback : permission Admin Discord
  if (member?.permissions?.has(PermissionFlagsBits.Administrator)) return true;

  return false;
}

export function requireBossOrAdmin(handler) {
  return async (interaction, ...args) => {
    if (!isBossOrAdmin(interaction.member)) {
      try {
        await interaction.reply({
          content: '🚫 Tu n’as pas la permission pour cette action (Boss/Admin requis).',
          ephemeral: true,
        });
      } catch {}
      return;
    }
    return handler(interaction, ...args);
  };
}

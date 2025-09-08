// Enregistrement des slash-commands (ESM)
import { REST, Routes } from 'discord.js';
import logger from './logger.js';

export async function registerCommands(token, clientId, commands, maybeGuildId) {
  const rest = new REST({ version: '10' }).setToken(token);
  const guildId = maybeGuildId || process.env.GUILD_ID || '';

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info(`Slash-commands enregistrées (scoped) sur guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info('Slash-commands enregistrées en global');
    }
  } catch (e) {
    logger.error(`Erreur enregistrement slash-commands: ${e.stack || e.message}`);
    throw e;
  }
}

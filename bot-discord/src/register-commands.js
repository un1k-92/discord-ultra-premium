// C:\discord-ultra-PSAAS\bot-discord\src\register-commands.js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as setupData } from './commands/setup.js';

const { CLIENT_ID, GUILD_ID, DISCORD_BOT_TOKEN } = process.env;
if (!CLIENT_ID || !DISCORD_BOT_TOKEN) {
  console.error('❌ CLIENT_ID ou DISCORD_BOT_TOKEN manquant dans .env');
  process.exit(1);
}

const commands = [ setupData.toJSON() ];
const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Slash commands enregistrées pour le guild', GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Slash commands enregistrées (globales)');
    }
  } catch (e) {
    console.error('❌ Erreur enregistrement commands:', e);
    process.exit(1);
  }
})();

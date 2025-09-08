import { SlashCommandBuilder } from 'discord.js';

export const pingCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Renvoie Pong!'),
  async execute(interaction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  },
};

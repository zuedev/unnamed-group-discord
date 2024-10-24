import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with the latency of the bot"),
  async execute({ interaction }) {
    const latency = Math.abs(Date.now() - interaction.createdAt);

    await interaction.reply(`Pong! 🏓 \`${latency}ms\``);
  },
};

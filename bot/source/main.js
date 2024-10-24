import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Events,
} from "discord.js";
import registerSlashCommands from "./library/registerSlashCommands.js";

const discord = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
  presence: {
    activities: [
      {
        type: ActivityType.Watching,
        name: "my boot sequence",
      },
    ],
  },
});

discord.on(Events.ClientReady, async () => {
  await registerSlashCommands(discord);

  console.log("Bot is ready!");
});

discord.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    try {
      const commandFile = await import(
        `./commands/${interaction.commandName}.js`
      );

      await commandFile.default.execute({
        interaction,
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

discord.login(process.env.DISCORD_BOT_TOKEN);

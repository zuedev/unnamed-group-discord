import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Events,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import registerSlashCommands from "./library/registerSlashCommands.js";

const discord = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: [Partials.Message],
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

  discord.user.setPresence({
    activities: [
      {
        type: ActivityType.Listening,
        name: "my parents argue",
      },
    ],
  });

  // send a message to the application owner
  let { owner } = await discord.application.fetch();

  // is the owner a team? if so, get the owner of the team instead
  if (owner.members) owner = owner.owner;

  let readyMessage = `# Bot Ready\n\n`;
  readyMessage += "```json\n";
  readyMessage += JSON.stringify(
    {
      discordApplicationId: discord.application.id,
      discordGuildId: process.env.DISCORD_GUILD_ID,
      discordGuildName: discord.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        .name,
      ownerId: owner.id,
      ownerTag: owner.user.tag,
    },
    null,
    2
  );
  readyMessage += "\n```";

  await owner.user.send({
    content: readyMessage,
  });
});

discord.on(Events.InteractionCreate, async (interaction) => {
  // ignore interactions from other guilds not specified in the .env file
  if (interaction.guild?.id !== process.env.DISCORD_GUILD_ID) return;

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

discord.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // ignore events from other guilds not specified in the .env file
  if (newState.guild.id !== process.env.DISCORD_GUILD_ID) return;

  // if the user left a voice channel, delete it if it was created by them
  if (oldState.channel && !newState.channel) {
    if (oldState.channel.name.endsWith("'s Voice Channel")) {
      await oldState.channel.delete();
    }
  }

  // if the user joined the "create voice channel" channel, create a new voice channel for them
  if (
    !oldState.channel &&
    newState.channel &&
    newState.channel.name === "create voice channel"
  ) {
    // check if the user already has a voice channel
    const existingChannel = newState.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildVoice &&
        channel.name === `${newState.member.user.username}'s Voice Channel` &&
        channel.parentId === newState.channel.parentId
    );

    // if the user already has a voice channel, move them to it
    if (existingChannel) {
      await newState.member.voice.setChannel(existingChannel);
      return;
    }

    // if the user doesn't have a voice channel, create a new one
    const channel = await newState.guild.channels.create({
      name: `${newState.member.user.username}'s Voice Channel`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parent,
      permissionOverwrites: [
        {
          id: newState.guild.id,
          deny: [PermissionFlagsBits.Connect],
        },
        {
          id: newState.member.id,
          allow: [PermissionFlagsBits.Connect],
        },
      ],
    });

    await newState.member.voice.setChannel(channel);
  }
});

discord.login(process.env.DISCORD_BOT_TOKEN);

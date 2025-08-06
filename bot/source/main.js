import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Events,
  MessageType,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import registerSlashCommands from "./library/registerSlashCommands.js";
import { upsertOne } from "./controllers/mongodb.js";
import { chat } from "./controllers/openai.js";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { flag } from "./controllers/unleash.js";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

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

discord.on(Events.MessageCreate, async (message) => {
  // ignore events from other guilds not specified in the .env file
  if (message.guild?.id !== process.env.DISCORD_GUILD_ID) return;

  if (message.author.bot) return;

  if (message.type === MessageType.Reply)
    message._replyMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );

  if (
    message.content.startsWith(`<@${discord.user.id}>`) ||
    flag("chatty") ||
    Math.random() < 0.01 ||
    message._replyMessage?.author.id === discord.user.id
  ) {
    let replyContent;

    replyContent = message.content;

    if (message.content.startsWith(`<@${discord.user.id}>`))
      replyContent = replyContent.replace(`<@${discord.user.id}>`, "");

    await message.reply({
      content: await chat({
        message: replyContent,
        image_url: message.attachments.first()?.url,
      }),
    });
  }

  // increment the message count for the author
  await upsertOne(
    "members",
    { discordId: message.author.id },
    {
      $set: {
        discordId: message.author.id,
        discordLastKnownTag: message.author.tag,
      },
      $inc: {
        discordMessageCount: 1,
      },
    }
  );

  console.log(
    `${message.author.tag} sent a message in "${message.guild.name}'s" #${message.channel.name} channel. Incremented message count by 1 in the database.`
  );
});

discord.on(Events.MessageDelete, async (message) => {
  // if the message is partial, ignore it as we can't fetch the message author anyway
  if (message.partial)
    return console.log(
      "A partial message was deleted. Ignoring MessageDelete event."
    );

  // ignore events from other guilds not specified in the .env file
  if (message.guild?.id !== process.env.DISCORD_GUILD_ID) return;

  if (message.author.bot) return;

  // decrement the message count for the author
  await upsertOne(
    "members",
    { discordId: message.author.id },
    {
      $set: {
        discordId: message.author.id,
        discordLastKnownTag: message.author.tag,
      },
      $inc: {
        discordMessageCount: -1,
      },
    }
  );

  console.log(
    `${message.author.tag}'s message in "${message.guild.name}'s" #${message.channel.name} channel was deleted. Decremented message count by 1 in the database.`
  );
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

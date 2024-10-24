import { Routes } from "discord.js";
import { readdirSync } from "fs";

export default async (client) => {
  const commands = [];

  for (const file of readdirSync("./source/commands")) {
    // ignore test files
    if (file.includes(".test.")) continue;

    const { default: command } = await import(`../commands/${file}`);
    commands.push(command.data);
  }

  // register commands to the guild
  await client.rest.put(
    Routes.applicationGuildCommands(
      client.application.id,
      process.env.DISCORD_GUILD_ID
    ),
    {
      body: commands,
    }
  );

  // clear the global commands
  await client.rest.put(Routes.applicationCommands(client.application.id), {
    body: [],
  });
};

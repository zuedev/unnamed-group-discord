import { jest } from "@jest/globals";
import ping from "./ping.js";

const exampleInteraction = {
  createdAt: Date.now(),
  reply: jest.fn(),
};

test("should reply with the latency of the bot", async () => {
  await ping.execute({ interaction: exampleInteraction });

  expect(exampleInteraction.reply).toHaveBeenCalledWith(
    expect.stringMatching(/Pong! 🏓 \`\d+ms\`/)
  );
});

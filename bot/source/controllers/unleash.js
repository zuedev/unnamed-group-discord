import { initialize, isEnabled } from "unleash-client";

const unleash = initialize({
  appName: "unnamed-discord-bot",
  url: process.env.UNLEASH_URL,
  instanceId: process.env.UNLEASH_INSTANCE_ID,
  refreshInterval: 1000,
});

function flag(name) {
  return isEnabled(name);
}

export { unleash, flag };

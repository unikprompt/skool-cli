import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const whoamiCommand = new Command("whoami")
  .description("Check if your Skool session is active")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.checkSession(opts.group);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

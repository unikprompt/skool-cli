import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editAboutCommand = new Command("edit-about")
  .description("Edit group settings and About page description")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("-d, --description <text>", "Group description (Settings > General)")
  .option("--about <text>", "Landing page description (About page, max 1000 chars)")
  .option("-n, --name <name>", "Group display name")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.editAbout({
        group: opts.group,
        description: opts.description,
        aboutDescription: opts.about,
        name: opts.name,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { SkoolClient } from "../core/skool-client.js";

export const createPostCommand = new Command("create-post")
  .description("Create a new community post in Skool")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .requiredOption("-t, --title <title>", "Post title")
  .option("-b, --body <text>", "Post body text")
  .option("-f, --file <path>", "Read post body from file")
  .option("-c, --category <name>", "Post category")
  .action(async (opts) => {
    let body = opts.body;
    if (!body && opts.file) {
      body = readFileSync(opts.file, "utf-8");
    }
    if (!body) {
      console.error("Error: Post body required. Use --body or --file.");
      process.exit(1);
    }

    const client = new SkoolClient();
    try {
      console.log(`Creating post "${opts.title}"...`);
      const result = await client.createPost({
        group: opts.group,
        title: opts.title,
        body,
        category: opts.category,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

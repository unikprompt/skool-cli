import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editPostCommand = new Command("edit-post")
  .description("Edit an existing community post")
  .requiredOption("--id <postId>", "Post ID to edit")
  .option("-t, --title <title>", "New title")
  .option("-b, --body <text>", "New body text")
  .option("-c, --category <id>", "Category ID (from get-categories --json)")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.editPost({
        id: opts.id,
        title: opts.title,
        body: opts.body,
        category: opts.category,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

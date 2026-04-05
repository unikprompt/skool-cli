import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const deletePostCommand = new Command("delete-post")
  .description("Delete a community post by ID")
  .requiredOption("--id <postId>", "Post ID to delete")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.deletePost(opts.id);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getPostsCommand = new Command("get-posts")
  .description("List community posts from a Skool group")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getPosts(opts.group);

      if (!result.success) {
        console.error("Failed to get posts. Check your session: skool whoami --group " + opts.group);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.posts, null, 2));
      } else {
        if (result.posts.length === 0) {
          console.log("No posts found.");
        } else {
          console.log(`Posts in ${opts.group}:\n`);
          for (const [i, post] of result.posts.entries()) {
            console.log(`${i + 1}. ${post.title}`);
            if (post.author) console.log(`   Author: ${post.author}`);
            if (post.category) console.log(`   Category: ${post.category}`);
            if (post.preview) console.log(`   ${post.preview.slice(0, 100)}...`);
            console.log();
          }
        }
      }
    } finally {
      await client.close();
    }
  });

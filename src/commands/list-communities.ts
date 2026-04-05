import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const listCommunitiesCommand = new Command("list-communities")
  .description("List your Skool communities")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.listCommunities();
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.communities, null, 2));
      } else if (result.communities.length === 0) {
        console.log("No communities found.");
      } else {
        console.log(`${result.communities.length} community(ies):\n`);
        for (const c of result.communities) {
          console.log(`  ${c.displayName} (${c.name})`);
          if (c.description) console.log(`  ${c.description.split("\n")[0].slice(0, 80)}`);
          console.log(`  Role: ${c.isOwner ? "Owner" : "Member"}`);
          console.log();
        }
      }
    } finally {
      await client.close();
    }
  });

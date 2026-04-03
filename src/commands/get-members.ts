import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getMembersCommand = new Command("get-members")
  .description("List or search members in a Skool group")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("-s, --search <query>", "Search by name")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getMembers(opts.group, opts.search);

      if (!result.success) {
        console.error("Failed to get members.");
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.members, null, 2));
      } else {
        if (result.members.length === 0) {
          console.log(opts.search ? `No members found matching "${opts.search}".` : "No members found.");
        } else {
          console.log(`Members${opts.search ? ` matching "${opts.search}"` : ""}:\n`);
          for (const [i, m] of result.members.entries()) {
            console.log(`${i + 1}. ${m.name} (Level ${m.level})`);
          }
        }
      }
    } finally {
      await client.close();
    }
  });

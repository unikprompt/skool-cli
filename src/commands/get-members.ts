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
          console.log(`${result.members.length} member(s)${opts.search ? ` matching "${opts.search}"` : ""}:\n`);
          for (const m of result.members) {
            console.log(`  ${m.firstName} ${m.lastName} (@${m.name})`);
            console.log(`  Level ${m.level} | ${m.points} pts | ${m.role}`);
            if (m.bio) console.log(`  ${m.bio.slice(0, 60)}`);
            console.log();
          }
        }
      }
    } finally {
      await client.close();
    }
  });

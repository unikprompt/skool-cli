import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getLeaderboardCommand = new Command("get-leaderboard")
  .description("Get community leaderboard rankings")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--period <period>", "Time period: all, 30d, 7d", "all")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getLeaderboard(opts.group, opts.period);
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify({ users: result.users, levels: result.levels }, null, 2));
      } else {
        if (result.users.length === 0) {
          console.log("No users in leaderboard yet.");
        } else {
          console.log(`Leaderboard (${opts.period}):\n`);
          result.users.forEach((u, i) => {
            console.log(`  ${i + 1}. ${u.name} - Level ${u.level}, ${u.points} points`);
          });
        }
        if (result.levels.length > 0) {
          console.log("\nLevels:");
          result.levels.forEach((l) => {
            console.log(`  ${l.name}: ${l.percentOfMembers}% of members`);
          });
        }
      }
    } finally {
      await client.close();
    }
  });

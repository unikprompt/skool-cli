import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getAnalyticsCommand = new Command("get-analytics")
  .description("Get group analytics (members, visitors, signups, conversion, MRR)")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      console.log("Fetching analytics...");
      const result = await client.getAnalytics(opts.group);
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        const d = result.data;
        console.log(`\nAnalytics for ${opts.group}:\n`);
        console.log(`  Members:    ${d.members}`);
        console.log(`  Visitors:   ${d.visitors}`);
        console.log(`  Signups:    ${d.signups}`);
        console.log(`  Conversion: ${d.conversion}%`);
        console.log(`  MRR:        ${d.mrr !== null ? "$" + d.mrr : "N/A"}`);
      }
    } finally {
      await client.close();
    }
  });

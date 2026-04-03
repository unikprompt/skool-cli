import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getCategoriesCommand = new Command("get-categories")
  .description("List post categories in a Skool group")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getCategories(opts.group);

      if (!result.success) {
        console.error("Failed to get categories.");
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.categories, null, 2));
      } else {
        if (result.categories.length === 0) {
          console.log("No categories found.");
        } else {
          console.log("Categories:\n");
          for (const cat of result.categories) {
            console.log(`  - ${cat}`);
          }
        }
      }
    } finally {
      await client.close();
    }
  });

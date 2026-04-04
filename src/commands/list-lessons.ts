import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const listLessonsCommand = new Command("list-lessons")
  .description("List all lessons and folders in a Skool classroom course")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--course <name>", "Course name (if multiple courses exist)")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.listLessons(opts.group, opts.course);

      if (!result.success) {
        console.error(`FAIL: ${result.message}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.items, null, 2));
      } else {
        if (result.items.length === 0) {
          console.log("No lessons or folders found.");
        } else {
          for (const item of result.items) {
            if (item.type === "folder") {
              console.log(`\n  ${item.name}`);
              if (item.children) {
                for (const child of item.children) {
                  console.log(`    - ${child.name}`);
                }
              }
            } else {
              console.log(`  - ${item.name}`);
            }
          }
          console.log();
        }
      }
    } finally {
      await client.close();
    }
  });

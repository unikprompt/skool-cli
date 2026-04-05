import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

const privacyLabels: Record<number, string> = {
  0: "Open",
  1: "Level unlock",
  2: "Buy now",
  3: "Time unlock",
  4: "Private",
};

export const listCoursesCommand = new Command("list-courses")
  .description("List all courses in a Skool group")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.listCourses(opts.group);
      if (!result.success) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }
      if (opts.json) {
        console.log(JSON.stringify(result.courses, null, 2));
      } else {
        console.log(`${result.courses.length} course(s):\n`);
        result.courses.forEach((c) => {
          console.log(`  ${c.title}`);
          console.log(`  ID: ${c.id}`);
          console.log(`  Access: ${privacyLabels[c.privacy] || "Open"}`);
          if (c.description) console.log(`  ${c.description.slice(0, 80)}`);
          console.log();
        });
      }
    } finally {
      await client.close();
    }
  });

import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const getProfileCommand = new Command("get-profile")
  .description("Get your Skool user profile")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.getProfile();
      if (!result.success || !result.profile) {
        console.log(`FAIL: ${result.message}`);
        process.exit(1);
      }

      const p = result.profile;
      if (opts.json) {
        console.log(JSON.stringify(p, null, 2));
      } else {
        console.log(`${p.firstName} ${p.lastName} (@${p.username})`);
        console.log(`Email: ${p.email}`);
        if (p.bio) console.log(`Bio: ${p.bio}`);
        if (p.location) console.log(`Location: ${p.location}`);
        if (p.website) console.log(`Website: ${p.website}`);
        if (p.photoUrl) console.log(`Photo: ${p.photoUrl}`);

        const links = Object.entries(p.socialLinks).filter(([, v]) => v);
        if (links.length > 0) {
          console.log("\nSocial links:");
          for (const [name, url] of links) {
            console.log(`  ${name}: ${url}`);
          }
        }

        console.log(`\nTheme: ${p.theme}`);
        console.log(`Timezone: ${p.timezone}`);
        console.log(`Member since: ${p.createdAt.split("T")[0]}`);
      }
    } finally {
      await client.close();
    }
  });

import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const editProfileCommand = new Command("edit-profile")
  .description("Edit your Skool user profile")
  .option("--bio <text>", "Profile bio (max 150 chars)")
  .option("--location <text>", "Location")
  .option("--website <url>", "Website URL")
  .option("--twitter <url>", "Twitter/X URL")
  .option("--instagram <url>", "Instagram URL")
  .option("--linkedin <url>", "LinkedIn URL")
  .option("--facebook <url>", "Facebook URL")
  .option("--youtube <url>", "YouTube URL")
  .option("--photo <path>", "Profile photo (local image file)")
  .action(async (opts) => {
    const client = new SkoolClient();
    try {
      const result = await client.editProfile({
        bio: opts.bio,
        location: opts.location,
        website: opts.website,
        twitter: opts.twitter,
        instagram: opts.instagram,
        linkedin: opts.linkedin,
        facebook: opts.facebook,
        youtube: opts.youtube,
        photo: opts.photo,
      });
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

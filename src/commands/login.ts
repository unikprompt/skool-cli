import { Command } from "commander";
import { SkoolClient } from "../core/skool-client.js";

export const loginCommand = new Command("login")
  .description("Login to your Skool account")
  .option("-e, --email <email>", "Skool account email")
  .option("-p, --password <password>", "Skool account password")
  .action(async (opts) => {
    const email =
      opts.email || process.env.SKOOL_EMAIL;
    const password =
      opts.password || process.env.SKOOL_PASSWORD;

    if (!email || !password) {
      console.error(
        "Error: Email and password required.\n\n" +
          "Usage:\n" +
          "  skool login --email you@email.com --password yourpass\n\n" +
          "Or set environment variables:\n" +
          "  export SKOOL_EMAIL=you@email.com\n" +
          "  export SKOOL_PASSWORD=yourpass"
      );
      process.exit(1);
    }

    const client = new SkoolClient();
    try {
      console.log("Logging in to Skool...");
      const result = await client.login(email, password);
      console.log(result.success ? `OK: ${result.message}` : `FAIL: ${result.message}`);
      process.exit(result.success ? 0 : 1);
    } finally {
      await client.close();
    }
  });

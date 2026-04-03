import { Command } from "commander";
import { BrowserManager } from "../core/browser-manager.js";
import { PageOps } from "../core/page-ops.js";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

export const debugManualCommand = new Command("debug-manual")
  .description("Open browser with API interception — waits for you to interact manually")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .action(async (opts) => {
    const browser = new BrowserManager();
    const ops = new PageOps(browser);
    const apiLog: string[] = [];

    try {
      const page = await browser.getPage();

      // Intercept API calls
      page.on("request", (req) => {
        const url = req.url();
        const method = req.method();
        if (url.includes("api2.skool.com")) {
          const body = req.postData();
          const line = `>>> ${method} ${url}\n    BODY: ${body || "(none)"}`;
          apiLog.push(line);
          console.log(line);
        }
      });

      page.on("response", async (res) => {
        const url = res.url();
        if (url.includes("api2.skool.com")) {
          let body = "";
          try {
            body = await res.text();
            if (body.length > 2000) body = body.slice(0, 2000) + "...";
          } catch { body = "(unreadable)"; }
          const line = `<<< ${res.status()} ${url}\n    RESPONSE: ${body}`;
          apiLog.push(line);
          console.log(line);
        }
      });

      // Navigate to classroom
      console.log("Opening classroom...\n");
      await ops.gotoClassroom(opts.group);

      // Wait for user to interact
      console.log("=======================================================");
      console.log("Browser is open with API interception active.");
      console.log("Go to a lesson, click the pencil, edit, and click SAVE.");
      console.log("All api2.skool.com calls will be logged here.");
      console.log("Press ENTER when done to close the browser.");
      console.log("=======================================================\n");

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await new Promise<void>((resolve) => {
        rl.question("", () => { rl.close(); resolve(); });
      });

      // Save log
      const logPath = "/tmp/skool-api-manual-log.txt";
      writeFileSync(logPath, apiLog.join("\n\n"));
      console.log(`\nAPI log saved to: ${logPath} (${apiLog.length} entries)`);

    } finally {
      await browser.close();
    }
  });

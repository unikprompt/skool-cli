import { Command } from "commander";
import { BrowserManager } from "../core/browser-manager.js";
import { PageOps } from "../core/page-ops.js";
import { writeFileSync } from "node:fs";

export const debugApiCommand = new Command("debug-api")
  .description("Intercept Skool API calls during classroom operations")
  .requiredOption("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--course <name>", "Course name", "Fundamentos de IA y Claude")
  .action(async (opts) => {
    const browser = new BrowserManager();
    const ops = new PageOps(browser);
    const apiLog: string[] = [];

    try {
      const page = await browser.getPage();

      // Intercept ALL requests and responses
      page.on("request", (req) => {
        const url = req.url();
        const method = req.method();
        // Only log non-static requests (API calls, not images/css/js)
        if (
          url.includes("/api/") ||
          url.includes("graphql") ||
          (method !== "GET" && !url.includes(".js") && !url.includes(".css") && !url.includes(".png") && !url.includes(".woff"))
        ) {
          const postData = req.postData();
          const line = `>>> ${method} ${url}${postData ? `\n    BODY: ${postData.slice(0, 500)}` : ""}`;
          apiLog.push(line);
          console.log(line);
        }
      });

      page.on("response", async (res) => {
        const url = res.url();
        const status = res.status();
        if (
          url.includes("/api/") ||
          url.includes("graphql") ||
          (status >= 200 && status < 400 && !url.includes(".js") && !url.includes(".css") && !url.includes(".png") && !url.includes(".woff") && res.request().method() !== "GET")
        ) {
          let body = "";
          try {
            body = await res.text();
            if (body.length > 1000) body = body.slice(0, 1000) + "...";
          } catch {
            body = "(could not read body)";
          }
          const line = `<<< ${status} ${url}\n    RESPONSE: ${body}`;
          apiLog.push(line);
          console.log(line);
        }
      });

      // Also capture ALL fetch/XHR by intercepting at the page level
      await page.addInitScript(() => {
        const origFetch = window.fetch;
        window.fetch = async (...args) => {
          const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
          const opts = args[1] as RequestInit | undefined;
          console.log(`[FETCH] ${opts?.method || "GET"} ${url}`);
          if (opts?.body) {
            console.log(`[FETCH BODY] ${String(opts.body).slice(0, 500)}`);
          }
          return origFetch.apply(window, args);
        };
      });

      console.log("\n=== Step 1: Navigate to classroom ===\n");
      await ops.gotoClassroom(opts.group);

      console.log("\n=== Step 2: Enter course ===\n");
      await page.getByText(opts.course, { exact: false }).first().click();
      await page.waitForTimeout(3000);

      console.log("\n=== Step 3: Click '...' menu ===\n");
      const courseTopArea = page.locator('div[class*="CourseMenuTop"]').first();
      await courseTopArea.hover();
      await page.waitForTimeout(500);

      // Click "..." via JS
      await page.evaluate(() => {
        const topArea = document.querySelector('div[class*="CourseMenuTop"]');
        if (!topArea) return;
        topArea.querySelectorAll("div, button, span, svg").forEach((el) => {
          const rect = el.getBoundingClientRect();
          const text = el.textContent?.trim() || "";
          if (rect.width > 10 && rect.width < 50 && rect.height > 10 && rect.height < 50 && text.length < 4) {
            el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          }
        });
      });
      await page.waitForTimeout(800);

      console.log("\n=== Step 4: Click 'Add page' ===\n");
      try {
        await page.getByText("Add page", { exact: true }).click({ timeout: 5000 });
      } catch {
        await page.getByText("Add page", { exact: true }).click({ force: true, timeout: 5000 });
      }
      await page.waitForTimeout(5000);

      console.log("\n=== Step 5: Capture current URL and page state ===\n");
      console.log(`Current URL: ${page.url()}`);

      // Also capture all cookies for reference
      const context = page.context();
      const cookies = await context.cookies();
      const skoolCookies = cookies
        .filter((c) => c.domain.includes("skool"))
        .map((c) => `${c.name}=${c.value.slice(0, 20)}...`)
        .join("; ");
      console.log(`Skool cookies: ${skoolCookies}`);

      // Save log
      const logPath = "/tmp/skool-api-log.txt";
      writeFileSync(logPath, apiLog.join("\n\n"));
      console.log(`\nAPI log saved to: ${logPath} (${apiLog.length} entries)`);

    } finally {
      await browser.close();
    }
  });
